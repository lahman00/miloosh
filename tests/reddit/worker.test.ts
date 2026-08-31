import { describe, expect, it } from "vitest";
import { approvalId, DEFAULT_AUTONOMOUS_POLICY, evaluateAutonomousWrite, isSafetyShutdownStatus, normalizeSubreddit, parseRedditTask, requiresWriteApproval, sanitizeRedditUrl, textSha256, type ActionLogEntry } from "@/scripts/reddit/worker";

describe("Reddit worker task contract", () => {
  it("accepts all supported read commands", () => {
    expect(parseRedditTask({ command: "reddit_status" }).command).toBe("reddit_status");
    expect(parseRedditTask({ command: "reddit_open", thread_url: "https://www.reddit.com/r/test/comments/abc/example/" }).command).toBe("reddit_open");
    expect(parseRedditTask({ command: "reddit_notifications" }).command).toBe("reddit_notifications");
  });

  it("preserves exact supplied write copy", () => {
    const text = "Exact copy.\n\nKeep spacing.";
    const task = parseRedditTask({ command: "reddit_reply", thread_url: "https://reddit.com/r/test/comments/abc/example/", text });
    if (task.command !== "reddit_reply") throw new Error("unexpected task type");
    expect(task.text).toBe(text);
    expect(requiresWriteApproval(task)).toBe(true);
    expect(approvalId(task)).toHaveLength(64);
    expect(approvalId(task)).not.toBe(approvalId({ ...task, text: `${text}!` }));
  });

  it("rejects non-Reddit URLs and unknown fields", () => {
    expect(() => parseRedditTask({ command: "reddit_open", thread_url: "https://example.com/thread" })).toThrow();
    expect(() => parseRedditTask({ command: "reddit_status", password: "never" })).toThrow();
  });

  it("accepts create-post input without guessing flair", () => {
    const task = parseRedditTask({ command: "reddit_create_post", subreddit: "preschool", title: "Title", body: "Body" });
    expect(task.command).toBe("reddit_create_post");
    expect(normalizeSubreddit("r/preschool")).toBe("preschool");
    expect(requiresWriteApproval(task)).toBe(true);
    expect(requiresWriteApproval(parseRedditTask({ command: "reddit_status" }))).toBe(false);
  });

  it("rejects unsafe or unsupported commands", () => {
    for (const command of ["reddit_vote", "reddit_dm", "reddit_delete", "reddit_join", "reddit_settings"]) {
      expect(() => parseRedditTask({ command })).toThrow();
    }
  });

  it("never returns challenge tokens or query parameters in Reddit URLs", () => {
    expect(sanitizeRedditUrl("https://www.reddit.com/?js_challenge=1&token=secret#fragment")).toBe("https://www.reddit.com/");
  });
});

describe("autonomous Reddit write policy", () => {
  const now = new Date("2026-08-31T12:00:00Z");
  const reply = parseRedditTask({ request_id: "r1", command: "reddit_reply", thread_url: "https://www.reddit.com/r/test/comments/abc/example/", text: "Useful exact reply" });
  const post = parseRedditTask({ request_id: "p1", command: "reddit_create_post", subreddit: "test", title: "Title", body: "Useful body" });
  if (reply.command !== "reddit_reply" || post.command !== "reddit_create_post") throw new Error("unexpected task types");
  const enabled = { ...DEFAULT_AUTONOMOUS_POLICY, autonomous_write_enabled: true };
  const action = (command: ActionLogEntry["command"], hoursAgo: number, hash = `hash-${hoursAgo}`, thread = `https://www.reddit.com/r/test/comments/${hoursAgo}/`): ActionLogEntry => ({ timestamp: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(), request_id: `x-${hoursAgo}`, command, subreddit: "test", thread_url: command === "reddit_reply" ? thread : null, published_permalink: "https://www.reddit.com/comment", had_miloosh_link: false, text_sha256: hash });

  it("blocks when disabled and permits a bounded fresh write when enabled", () => {
    expect(evaluateAutonomousWrite(reply, DEFAULT_AUTONOMOUS_POLICY, [], now).status).toBe("AUTONOMOUS_WRITE_DISABLED");
    expect(evaluateAutonomousWrite(reply, enabled, [], now)).toEqual({ allowed: true, status: "AUTONOMOUS_EXECUTION_ALLOWED" });
  });

  it("enforces comment, daily post, and rolling post caps", () => {
    expect(evaluateAutonomousWrite(reply, enabled, Array.from({ length: 8 }, (_, i) => action("reddit_reply", i + 1)), now).status).toBe("DAILY_COMMENT_CAP");
    expect(evaluateAutonomousWrite(post, enabled, [action("reddit_create_post", 1)], now).status).toBe("DAILY_POST_CAP");
    expect(evaluateAutonomousWrite(post, enabled, [action("reddit_create_post", 25), action("reddit_create_post", 50), action("reddit_create_post", 100)], now).status).toBe("ROLLING_7_DAY_POST_CAP");
  });

  it("enforces interval, duplicate copy, and same-thread safeguards", () => {
    expect(evaluateAutonomousWrite(reply, enabled, [action("reddit_reply", 0.1)], now).status).toBe("WRITE_INTERVAL_LIMIT");
    expect(evaluateAutonomousWrite(reply, enabled, [action("reddit_reply", 2, textSha256(reply))], now).status).toBe("DUPLICATE_TEXT");
    expect(evaluateAutonomousWrite(reply, enabled, [action("reddit_reply", 2, "other", reply.command === "reddit_reply" ? reply.thread_url : "")], now).status).toBe("SAME_THREAD_REPLY_REQUIRES_NEW_DIRECT_REPLY");
  });

  it("recognizes challenge and thread shutdown conditions", () => {
    for (const status of ["CAPTCHA", "SUSPICIOUS_LOGIN", "ACCOUNT_VERIFICATION", "POSTING_RESTRICTION", "MODERATOR_WARNING", "THREAD_LOCKED", "THREAD_REMOVED"]) expect(isSafetyShutdownStatus(status)).toBe(true);
  });
});
