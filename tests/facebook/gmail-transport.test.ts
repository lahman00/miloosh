import { describe, expect, it } from "vitest";
import { buildResultEmail, isReplay, MAX_TASK_BODY_BYTES, parseIncomingTask, reconcileRestart, structuredFailure, type TransportLedger, type TransportTaskEntry } from "@/scripts/facebook/gmail-transport";

const email = "lahman00@gmail.com";
const base = { subject: "MILOOSH_FACEBOOK_TASK test-1", to: email, from: email, authenticatedEmail: email };

describe("Gmail Facebook transport", () => {
  it("accepts a valid read-only task", () => {
    const parsed = parseIncomingTask({ ...base, body: JSON.stringify({ command: "facebook_open_group", group_url: "https://www.facebook.com/groups/DigitalDefyned/" }) });
    expect(parsed.taskId).toBe("test-1");
    expect(parsed.task).toMatchObject({ command: "facebook_open_group", request_id: "test-1", group_url: "https://www.facebook.com/groups/DigitalDefyned/" });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseIncomingTask({ ...base, body: "{" })).toThrow("MALFORMED_JSON");
  });

  it("rejects duplicate task IDs", () => {
    expect(() => parseIncomingTask({ ...base, body: '{"command":"facebook_status"}', seenTaskIds: new Set(["test-1"]) })).toThrow("DUPLICATE_TASK_ID");
  });

  it("rejects unsupported commands and arbitrary fields", () => {
    expect(() => parseIncomingTask({ ...base, body: '{"command":"facebook_friend_request","user_id":"123"}' })).toThrow("INVALID_OR_UNSUPPORTED_TASK");
  });

  it("rejects oversized tasks", () => {
    expect(() => parseIncomingTask({ ...base, body: "x".repeat(MAX_TASK_BODY_BYTES + 1) })).toThrow("TASK_BODY_TOO_LARGE");
  });

  it("rejects mail not sent from and to the authenticated account", () => {
    expect(() => parseIncomingTask({ ...base, to: "someone-else@example.com", body: '{"command":"facebook_status"}' })).toThrow("WRONG_RECIPIENT");
    expect(() => parseIncomingTask({ ...base, from: "someone-else@example.com", body: '{"command":"facebook_status"}' })).toThrow("UNTRUSTED_SENDER");
  });

  it("preserves exact write copy without granting approval", () => {
    const text = "Exact reply.\n\nDo not rewrite.";
    const parsed = parseIncomingTask({ ...base, body: JSON.stringify({ command: "facebook_comment", post_url: "https://www.facebook.com/groups/alpha/posts/999/", text }) });
    expect(parsed.task.command === "facebook_comment" && parsed.task.text).toBe(text);
    expect(parsed.task).not.toHaveProperty("approval");
  });

  it("generates exact result and error emails under the Facebook subject convention", () => {
    const success = '{"ok":true,"published_url":"https://www.facebook.com/groups/alpha/posts/123/"}\n';
    const result = buildResultEmail("test-1", success, email);
    expect(result.subject).toBe("MILOOSH_FACEBOOK_RESULT test-1");
    expect(result.body).toBe(success);
    expect(Buffer.from(result.raw, "base64url").toString("utf8")).toContain(success);
    expect(Buffer.from(result.raw, "base64url").toString("utf8")).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(buildResultEmail("test-1", '{"ok":false,"status":"FAILED"}\n', email).subject).toBe("MILOOSH_FACEBOOK_ERROR test-1");
  });

  it("never creates an empty structured error body", () => {
    const body = structuredFailure("test-1", "facebook_status", "WORKER_TIMEOUT", false, true);
    expect(JSON.parse(body)).toEqual(
      expect.objectContaining({ request_id: "test-1", command: "facebook_status", ok: false, status: "WORKER_TIMEOUT", reason: "WORKER_TIMEOUT", error: "WORKER_TIMEOUT", retryable: false, human_action_required: true }),
    );
  });

  it("recovers RESULT_READY and failed sends", () => {
    const baseEntry: TransportTaskEntry = { message_id: "m1", sender: email, command: "facebook_status", state: "RESULT_READY", accepted_at: "2026-08-31T00:00:00Z", updated_at: "2026-08-31T00:00:00Z", task_path: "/task", result_path: "/result" };
    expect(reconcileRestart(baseEntry)).toEqual({ action: "send" });
    expect(reconcileRestart({ ...baseEntry, state: "FAILED" })).toEqual({ action: "send" });
  });

  it("restarts read execution but never blindly retries an ambiguous write (post or comment)", () => {
    const baseEntry: TransportTaskEntry = { message_id: "m1", sender: email, command: "facebook_status", state: "EXECUTING", accepted_at: "2026-08-31T00:00:00Z", updated_at: "2026-08-31T00:00:00Z", task_path: "/task", result_path: "/result" };
    expect(reconcileRestart(baseEntry)).toEqual({ action: "execute" });
    expect(reconcileRestart({ ...baseEntry, state: "RECEIVED" })).toEqual({ action: "execute" });
    expect(reconcileRestart({ ...baseEntry, command: "facebook_create_post" })).toEqual({ action: "fail", status: "AMBIGUOUS_WRITE_NOT_RETRIED" });
    expect(reconcileRestart({ ...baseEntry, command: "facebook_comment" })).toEqual({ action: "fail", status: "AMBIGUOUS_WRITE_NOT_RETRIED" });
  });

  it("prevents message and task replays", () => {
    const ledger: TransportLedger = {
      version: 2,
      messages: { m1: { task_id: "test-1", disposition: "accepted", processed_at: "2026-08-31T00:00:00Z" } },
      tasks: { "test-1": { message_id: "m1", sender: email, command: "facebook_status", state: "ACCEPTED", accepted_at: "2026-08-31T00:00:00Z", updated_at: "2026-08-31T00:00:00Z", task_path: "/task", result_path: "/result" } },
    };
    expect(isReplay(ledger, "m1", "other")).toBe(true);
    expect(isReplay(ledger, "m2", "test-1")).toBe(true);
    expect(isReplay(ledger, "m2", "new-task")).toBe(false);
  });
});
