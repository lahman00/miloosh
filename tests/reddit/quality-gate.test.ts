import { describe, expect, it } from "vitest";
import { evaluateReplyQuality } from "@/scripts/reddit/quality-gate";
import type { ActionLogEntry } from "@/scripts/reddit/worker";

/**
 * MILOOSH Reddit quality hardening (2026-08-31), following a real r/SaaS
 * AutoModerator removal ("Low-Effort/AI content is auto-removed"). See
 * scripts/reddit/quality-gate.ts's header for the real constraint this
 * gate works within (no prior reply text is ever stored, only its hash).
 */

function action(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  return {
    timestamp: new Date().toISOString(),
    request_id: null,
    command: "reddit_reply",
    subreddit: "SaaS",
    thread_url: "https://www.reddit.com/r/SaaS/comments/abc/x/",
    published_permalink: "https://www.reddit.com/r/SaaS/comments/abc/x/comment/def/",
    had_miloosh_link: false,
    text_sha256: "irrelevant",
    ...overrides,
  };
}

describe("evaluateReplyQuality", () => {
  it("passes a direct, specific, no-link reply with no red flags", () => {
    const result = evaluateReplyQuality({
      text: "Legacy SAP GUI migrations usually break on custom transaction codes, not the core screens. Start by inventorying which t-codes your team actually uses weekly — most DAP tools choke on the ones nobody documented.",
      hasMilooshLink: false,
      recentActions: [],
    });
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("QUALITY_GATE_PASSED");
    expect(result.findings).toHaveLength(0);
  });

  it("blocks a claim of first-hand experience this account has never had", () => {
    const result = evaluateReplyQuality({ text: "In my experience, this exact migration took us three months.", hasMilooshLink: false, recentActions: [] });
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("QUALITY_GATE_BLOCKED");
    expect(result.findings.some((f) => f.code === "FAKE_PERSONAL_EXPERIENCE")).toBe(true);
  });

  it("blocks a generic, template-shaped opening", () => {
    const result = evaluateReplyQuality({ text: "Great question! Here's what I'd look at first when evaluating tools for this.", hasMilooshLink: false, recentActions: [] });
    expect(result.allowed).toBe(false);
    expect(result.findings.some((f) => f.code === "TEMPLATE_OPENING")).toBe(true);
  });

  it("blocks internal repetition of the same sentence-opening phrase within one reply", () => {
    const result = evaluateReplyQuality({
      text: "The best approach here is to start small. The best approach here is often overlooked by teams rushing the migration.",
      hasMilooshLink: false,
      recentActions: [],
    });
    expect(result.allowed).toBe(false);
    expect(result.findings.some((f) => f.code === "INTERNAL_REPETITION")).toBe(true);
  });

  it("does not flag a normal reply that happens to share a short, generic 2-3 word prefix across sentences", () => {
    const result = evaluateReplyQuality({
      text: "It depends on your stack. It really varies by team size honestly, so test both before committing.",
      hasMilooshLink: false,
      recentActions: [],
    });
    expect(result.findings.some((f) => f.code === "INTERNAL_REPETITION")).toBe(false);
  });

  it("warns (does not block) on an unusually long reply", () => {
    const sentences = Array.from({ length: 60 }, (_, i) => `Point number ${i} covers a genuinely distinct aspect of the migration that varies by team.`);
    const result = evaluateReplyQuality({ text: sentences.join(" "), hasMilooshLink: false, recentActions: [] });
    const finding = result.findings.find((f) => f.code === "LONG_REPLY");
    expect(finding?.severity).toBe("warning");
    expect(result.findings.some((f) => f.code === "INTERNAL_REPETITION")).toBe(false); // each sentence's opening 4-word prefix is distinct
    expect(result.allowed).toBe(true); // a warning alone never blocks
  });

  it("does not evaluate a link-ratio finding with too little real history to be meaningful", () => {
    const recentActions = [action({ had_miloosh_link: true }), action({ had_miloosh_link: true })]; // only 2 — below the minimum sample
    const result = evaluateReplyQuality({ text: "Direct, specific answer to the actual question asked here.", hasMilooshLink: true, recentActions });
    expect(result.findings.some((f) => f.code === "LINK_RATIO_EXCEEDED")).toBe(false);
  });

  it("blocks a reply that would push the real link ratio over the limit, using actual stored history", () => {
    const recentActions = [
      action({ had_miloosh_link: true }),
      action({ had_miloosh_link: false }),
      action({ had_miloosh_link: false }),
      action({ had_miloosh_link: false }),
    ];
    const result = evaluateReplyQuality({ text: "Direct, specific answer to the actual question asked here.", hasMilooshLink: true, recentActions });
    expect(result.allowed).toBe(false);
    expect(result.findings.some((f) => f.code === "LINK_RATIO_EXCEEDED")).toBe(true);
  });

  it("allows a no-link reply even with a link-heavy recent history — the ratio only matters for replies that themselves carry a link", () => {
    const recentActions = [action({ had_miloosh_link: true }), action({ had_miloosh_link: true }), action({ had_miloosh_link: true })];
    const result = evaluateReplyQuality({ text: "Direct, specific, no-link answer.", hasMilooshLink: false, recentActions });
    expect(result.findings.some((f) => f.code === "LINK_RATIO_EXCEEDED")).toBe(false);
  });

  it("only counts reddit_reply actions toward the link ratio window, not reddit_create_post", () => {
    const recentActions = [
      action({ command: "reddit_create_post", had_miloosh_link: true }),
      action({ command: "reddit_create_post", had_miloosh_link: true }),
      action({ command: "reddit_create_post", had_miloosh_link: true }),
    ];
    const result = evaluateReplyQuality({ text: "Direct, specific answer.", hasMilooshLink: true, recentActions });
    expect(result.findings.some((f) => f.code === "LINK_RATIO_EXCEEDED")).toBe(false); // 0 real reddit_reply entries in the window
  });
});
