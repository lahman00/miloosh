import { describe, it, expect } from "vitest";
import { decideRedditOpportunity, redditReplyGuardrails, type RedditRuleProfile } from "@/lib/growth/reddit-opportunity";
import type { PainCandidate } from "@/lib/growth/pain-radar";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24) — PR #3 shipped
 * pain-radar.ts, pain-forecast.ts, pain-forecast-backtest.ts, and
 * prepositioning.ts with real test coverage, but reddit-opportunity.ts
 * (the actual compliance gate deciding whether Miloosh is allowed to
 * link on Reddit) had none. This is the highest-stakes function in the
 * PR -- a false "eligible: true" here is a real platform-rules violation
 * -- so it gets covered before being treated as production-ready.
 */

function candidate(overrides: Partial<PainCandidate> = {}): PainCandidate {
  return {
    id: "c1",
    source: "reddit",
    sourceUrl: "https://reddit.com/r/test/comments/abc",
    discoveredAt: "2026-08-24T00:00:00Z",
    title: "Test pain",
    intent: "too-expensive",
    ...overrides,
  };
}

function rules(overrides: Partial<RedditRuleProfile> = {}): RedditRuleProfile {
  return {
    subreddit: "test",
    verifiedAt: "2026-08-24T00:00:00Z",
    selfPromotion: "allowed",
    links: "allowed",
    ...overrides,
  };
}

describe("decideRedditOpportunity", () => {
  it("rejects a non-Reddit candidate outright", () => {
    const result = decideRedditOpportunity(candidate({ source: "forum" }), rules());
    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("DO_NOT_POST");
  });

  it("forces human review when no rule profile has been verified for the subreddit", () => {
    const result = decideRedditOpportunity(candidate(), undefined);
    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("HUMAN_REVIEW");
  });

  it("allows only a no-link, standalone-useful reply when self-promotion is prohibited", () => {
    const result = decideRedditOpportunity(candidate(), rules({ selfPromotion: "prohibited" }));
    expect(result.eligible).toBe(true);
    expect(result.mode).toBe("VALUE_ONLY");
  });

  it("allows only a no-link reply when links are prohibited even if self-promotion is allowed", () => {
    const result = decideRedditOpportunity(candidate(), rules({ selfPromotion: "allowed", links: "prohibited" }));
    expect(result.eligible).toBe(true);
    expect(result.mode).toBe("VALUE_ONLY");
  });

  it("forces human review when either rule is unknown rather than defaulting to eligible", () => {
    const result = decideRedditOpportunity(candidate(), rules({ selfPromotion: "unknown" }));
    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("HUMAN_REVIEW");
  });

  it("forces human review when either rule is merely restricted, not prohibited", () => {
    const result = decideRedditOpportunity(candidate(), rules({ links: "restricted" }));
    expect(result.eligible).toBe(false);
    expect(result.mode).toBe("HUMAN_REVIEW");
  });

  it("permits a disclosed link only when self-promotion and links are both explicitly allowed", () => {
    const result = decideRedditOpportunity(candidate(), rules());
    expect(result.eligible).toBe(true);
    expect(result.mode).toBe("VALUE_PLUS_DISCLOSED_LINK");
  });

  it("surfaces a disclosure reminder in reasons when the subreddit requires it", () => {
    const result = decideRedditOpportunity(candidate(), rules({ disclosureRequired: true }));
    expect(result.mode).toBe("VALUE_PLUS_DISCLOSED_LINK");
    expect(result.reasons.some((r) => r.toLowerCase().includes("disclos"))).toBe(true);
  });

  it("does not surface a disclosure reminder when the subreddit doesn't require one", () => {
    const result = decideRedditOpportunity(candidate(), rules({ disclosureRequired: false }));
    expect(result.reasons.some((r) => r.toLowerCase().includes("disclos"))).toBe(false);
  });
});

describe("redditReplyGuardrails", () => {
  it("returns a non-empty, stable list of hard behavioral rules", () => {
    const guardrails = redditReplyGuardrails();
    expect(guardrails.length).toBeGreaterThan(0);
    expect(guardrails.every((g) => typeof g === "string" && g.length > 0)).toBe(true);
  });

  it("explicitly prohibits fake firsthand experience, vote solicitation, and unsolicited DMs", () => {
    const guardrails = redditReplyGuardrails().join(" ").toLowerCase();
    expect(guardrails).toContain("personal use or customer experience");
    expect(guardrails).toContain("vote");
    expect(guardrails).toContain("dm");
  });
});
