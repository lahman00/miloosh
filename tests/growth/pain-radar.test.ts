import { describe, expect, it } from "vitest";
import { rankPainCandidates, scorePainCandidate, type PainCandidate } from "@/lib/growth/pain-radar";
import { decideRedditOpportunity } from "@/lib/growth/reddit-opportunity";

const base: PainCandidate = {
  id: "freshdesk-pain",
  source: "reddit",
  sourceUrl: "https://reddit.com/example",
  discoveredAt: "2026-08-24T00:00:00Z",
  publishedAt: "2026-08-23T20:00:00Z",
  product: "Freshdesk",
  title: "Free plan ending — alternatives?",
  intent: "free-plan-ending",
  freshnessHours: 4,
  engagement: 75,
  commercialIntent: 95,
  severity: 90,
  audienceFit: 95,
  existingMilooshCoverage: 85,
  sourceReliability: 55,
  affiliateRelevant: false,
  canBuildAssetQuickly: true,
  canDistributeImmediately: true,
};

describe("Pain Radar", () => {
  it("prioritizes fresh, severe buyer pain", () => {
    const result = scorePainCandidate(base);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.action).toBe("DISTRIBUTE_EXISTING_ASSET");
  });

  it("rejects low-value stale signals", () => {
    const result = scorePainCandidate({
      ...base,
      id: "stale",
      freshnessHours: 2000,
      engagement: 0,
      commercialIntent: 5,
      severity: 5,
      audienceFit: 10,
      existingMilooshCoverage: 0,
      sourceReliability: 20,
      canBuildAssetQuickly: false,
      canDistributeImmediately: false,
    });
    expect(result.action).toBe("REJECT");
  });

  it("ranks the strongest pain first", () => {
    const ranked = rankPainCandidates([
      { ...base, id: "weak", commercialIntent: 20, severity: 20, freshnessHours: 500 },
      { ...base, id: "strong" },
    ]);
    expect(ranked[0]?.id).toBe("strong");
  });
});

describe("Reddit opportunity gate", () => {
  it("requires human review when subreddit rules are unknown", () => {
    expect(decideRedditOpportunity(base)).toEqual({
      eligible: false,
      mode: "HUMAN_REVIEW",
      reasons: ["subreddit rules have not been verified"],
    });
  });

  it("allows value-only participation when self-promotion is prohibited", () => {
    const decision = decideRedditOpportunity(base, {
      subreddit: "sysadmin",
      verifiedAt: "2026-08-24T00:00:00Z",
      selfPromotion: "prohibited",
      links: "prohibited",
    });
    expect(decision.eligible).toBe(true);
    expect(decision.mode).toBe("VALUE_ONLY");
  });

  it("allows a disclosed link only when rules explicitly permit promotion and links", () => {
    const decision = decideRedditOpportunity(base, {
      subreddit: "example",
      verifiedAt: "2026-08-24T00:00:00Z",
      selfPromotion: "allowed",
      links: "allowed",
      disclosureRequired: true,
    });
    expect(decision.eligible).toBe(true);
    expect(decision.mode).toBe("VALUE_PLUS_DISCLOSED_LINK");
    expect(decision.reasons).toContain("Miloosh affiliation must be disclosed clearly");
  });
});
