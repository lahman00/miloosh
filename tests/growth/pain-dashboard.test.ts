import { describe, expect, it } from "vitest";
import { buildPainRadarDashboard } from "@/lib/growth/pain-dashboard";
import type { PersistedPainCandidate } from "@/lib/growth/pain-candidate-store";

function candidate(overrides: Partial<PersistedPainCandidate>): PersistedPainCandidate {
  return {
    id: "signal-1",
    source: "support-community",
    sourceUrl: "https://example.com/thread/1",
    discoveredAt: "2026-08-25T10:00:00.000Z",
    publishedAt: "2026-08-25T09:00:00.000Z",
    product: "Freshdesk",
    vendor: "Freshdesk",
    title: "Freshdesk plan change",
    intent: "free-plan-ending",
    freshnessHours: 12,
    engagement: 70,
    commercialIntent: 80,
    severity: 75,
    audienceFit: 85,
    existingMilooshCoverage: 80,
    sourceReliability: 80,
    affiliateRelevant: false,
    canBuildAssetQuickly: true,
    canDistributeImmediately: true,
    communityAllowsPromotion: false,
    communityRulesVerifiedAt: "2026-08-25T08:00:00.000Z",
    normalizedPainClass: "loss-of-free-access",
    verificationState: "VERIFIED_TRUE",
    remedyState: "PUBLISHED",
    remedyAction: "DISTRIBUTE_EXISTING_ASSET",
    distributionState: "DISTRIBUTED",
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
    attributedOutcome: {
      classifiedHumanSessions: 4,
      ctaClicks: 2,
      leads: 1,
      affiliateClicks: 1,
      lastMeasuredAt: "2026-08-25T12:00:00.000Z",
    },
    ...overrides,
  };
}

describe("buildPainRadarDashboard", () => {
  it("shows fresh signals, clusters corroboration, community state, and measured outcomes", () => {
    const data = buildPainRadarDashboard(
      [
        candidate({ id: "fresh-1", sourceUrl: "https://community.example.com/a", discoveredAt: "2026-08-25T10:00:00.000Z" }),
        candidate({
          id: "fresh-2",
          source: "forum",
          sourceUrl: "https://forum.example.net/b",
          discoveredAt: "2026-08-24T10:00:00.000Z",
          attributedOutcome: undefined,
          remedyState: "SELECTED",
          distributionState: "QUEUED",
          communityAllowsPromotion: undefined,
          communityRulesVerifiedAt: undefined,
        }),
        candidate({
          id: "old-1",
          vendor: "OtherVendor",
          product: "OtherVendor",
          sourceUrl: "https://old.example.org/c",
          discoveredAt: "2026-06-01T10:00:00.000Z",
          normalizedPainClass: "support-degradation",
          verificationState: "UNVERIFIED",
          remedyState: "NONE_SELECTED",
          remedyAction: undefined,
          distributionState: "NOT_DISTRIBUTED",
          attributedOutcome: undefined,
        }),
      ],
      new Date("2026-08-26T10:00:00.000Z"),
    );

    expect(data.summary.totalCandidates).toBe(3);
    expect(data.summary.freshCandidates).toBe(2);
    expect(data.summary.verifiedCandidates).toBe(2);
    expect(data.summary.publishedRemedies).toBe(1);
    expect(data.summary.distributedCandidates).toBe(1);
    expect(data.summary.attributedHumanSessions).toBe(4);
    expect(data.summary.attributedCtaClicks).toBe(2);
    expect(data.summary.attributedLeads).toBe(1);
    expect(data.summary.attributedAffiliateClicks).toBe(1);

    expect(data.signals).toHaveLength(2);
    expect(data.signals.map((signal) => signal.id)).not.toContain("old-1");
    const first = data.signals.find((signal) => signal.id === "fresh-1");
    expect(first?.sourceHost).toBe("community.example.com");
    expect(first?.sourceHref).toBe("https://community.example.com/a");
    expect(first?.communityAllowsPromotion).toBe(false);
    expect(first?.communityRulesVerifiedAt).toBe("2026-08-25T08:00:00.000Z");

    const freshdeskCluster = data.clusters.find((cluster) => cluster.vendor === "freshdesk");
    expect(freshdeskCluster).toBeDefined();
    expect(freshdeskCluster?.signalCount).toBe(2);
    expect(freshdeskCluster?.uniqueSourceCount).toBe(2);
    expect(freshdeskCluster?.trendDirection).not.toBe("isolated");
  });

  it("falls back to persisted signals when nothing is fresh", () => {
    const data = buildPainRadarDashboard(
      [candidate({ id: "old-only", discoveredAt: "2026-01-01T00:00:00.000Z" })],
      new Date("2026-08-26T10:00:00.000Z"),
    );

    expect(data.summary.freshCandidates).toBe(0);
    expect(data.signals).toHaveLength(1);
    expect(data.signals[0].id).toBe("old-only");
  });

  it("never exposes a non-HTTP(S) source as a clickable dashboard link", () => {
    const data = buildPainRadarDashboard(
      [candidate({ id: "unsafe", sourceUrl: "javascript:alert(1)" })],
      new Date("2026-08-26T10:00:00.000Z"),
    );

    expect(data.signals[0].sourceHref).toBeUndefined();
  });
});
