import { describe, expect, it } from "vitest";
import { approvalId, normalizeSubreddit, parseRedditTask, sanitizeRedditUrl } from "@/scripts/reddit/worker";

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
