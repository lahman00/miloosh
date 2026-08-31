import { describe, expect, it } from "vitest";
import { buildResultEmail, isReplay, MAX_TASK_BODY_BYTES, parseIncomingTask, type TransportLedger } from "@/scripts/reddit/gmail-transport";

const email = "lahman00@gmail.com";
const base = { subject: "MILOOSH_REDDIT_TASK test-1", to: email, from: email, authenticatedEmail: email };

describe("Gmail Reddit transport", () => {
  it("accepts a valid read-only task and canonicalizes the URL alias", () => {
    const parsed = parseIncomingTask({ ...base, body: JSON.stringify({ command: "reddit_open", url: "https://www.reddit.com/r/test/comments/abc/example/" }) });
    expect(parsed.taskId).toBe("test-1");
    expect(parsed.task).toMatchObject({ command: "reddit_open", request_id: "test-1", thread_url: "https://www.reddit.com/r/test/comments/abc/example/" });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseIncomingTask({ ...base, body: "{" })).toThrow("MALFORMED_JSON");
  });

  it("rejects duplicate task IDs", () => {
    expect(() => parseIncomingTask({ ...base, body: '{"command":"reddit_status"}', seenTaskIds: new Set(["test-1"]) })).toThrow("DUPLICATE_TASK_ID");
  });

  it("rejects unsupported commands and arbitrary fields", () => {
    expect(() => parseIncomingTask({ ...base, body: '{"command":"shell","path":"/tmp"}' })).toThrow("INVALID_OR_UNSUPPORTED_TASK");
  });

  it("rejects oversized tasks", () => {
    expect(() => parseIncomingTask({ ...base, body: "x".repeat(MAX_TASK_BODY_BYTES + 1) })).toThrow("TASK_BODY_TOO_LARGE");
  });

  it("preserves exact write copy without granting approval", () => {
    const text = "Exact reply.\n\nDo not rewrite.";
    const parsed = parseIncomingTask({ ...base, body: JSON.stringify({ command: "reddit_reply", url: "https://www.reddit.com/r/test/comments/abc/example/", text }) });
    expect(parsed.task.command === "reddit_reply" && parsed.task.text).toBe(text);
    expect(parsed.task).not.toHaveProperty("approval");
  });

  it("generates exact result and error emails", () => {
    const success = '{"ok":true,"permalink":"https://www.reddit.com/r/test/comments/abc/comment/"}\n';
    const result = buildResultEmail("test-1", success, email);
    expect(result.subject).toBe("MILOOSH_REDDIT_RESULT test-1");
    expect(result.body).toBe(success);
    expect(Buffer.from(result.raw, "base64url").toString("utf8")).toContain(success);
    expect(buildResultEmail("test-1", '{"ok":false,"status":"FAILED"}\n', email).subject).toBe("MILOOSH_REDDIT_ERROR test-1");
  });

  it("prevents message and task replays", () => {
    const ledger: TransportLedger = { version: 1, messages: { m1: { task_id: "test-1", disposition: "accepted", processed_at: "2026-08-31T00:00:00Z" } }, tasks: { "test-1": { message_id: "m1", sender: email, accepted_at: "2026-08-31T00:00:00Z" } } };
    expect(isReplay(ledger, "m1", "other")).toBe(true);
    expect(isReplay(ledger, "m2", "test-1")).toBe(true);
    expect(isReplay(ledger, "m2", "new-task")).toBe(false);
  });
});

