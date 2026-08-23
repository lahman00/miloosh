import { describe, it, expect } from "vitest";
import { selectRemedy } from "@/lib/growth/remedy-selector";
import type { PersistedPainCandidate } from "@/lib/growth/pain-candidate-store";
import type { PainCluster } from "@/lib/growth/pain-clustering";

/** MILOOSH OVERNIGHT MONSTER mission (2026-08-24) — P8 regression suite. */

function candidate(overrides: Partial<PersistedPainCandidate> = {}): PersistedPainCandidate {
  return {
    id: "c1",
    source: "reddit",
    sourceUrl: "https://reddit.com/r/test/1",
    discoveredAt: "2026-08-24T00:00:00Z",
    title: "Test pain",
    intent: "too-expensive",
    normalizedPainClass: "price-pressure",
    verificationState: "UNVERIFIED",
    remedyState: "NONE_SELECTED",
    distributionState: "NOT_DISTRIBUTED",
    createdAt: "2026-08-24T00:00:00Z",
    updatedAt: "2026-08-24T00:00:00Z",
    severity: 60,
    commercialIntent: 60,
    ...overrides,
  };
}

function cluster(overrides: Partial<PainCluster> = {}): PainCluster {
  return {
    id: "cluster1",
    vendor: "test",
    normalizedPainClass: "price-pressure",
    candidateIds: ["c1", "c2", "c3"],
    signalCount: 3,
    uniqueSourceCount: 3,
    earliestSignalAt: "2026-08-01T00:00:00Z",
    latestSignalAt: "2026-08-20T00:00:00Z",
    engagementVelocityPerDay: 10,
    averageSeverity: 60,
    averageCommercialIntent: 60,
    reliabilityMix: { high: 2, medium: 1, low: 0 },
    trendDirection: "accelerating",
    painVelocityScore: 80,
    painVelocityExplanation: "test",
    ...overrides,
  };
}

describe("selectRemedy", () => {
  it("returns NO_ACTION when both severity and commercial intent are too low", () => {
    const result = selectRemedy(candidate({ severity: 10, commercialIntent: 10 }));
    expect(result.remedy).toBe("NO_ACTION");
  });

  it("recommends PR_HOOK for a corroborated, accelerating, high-commercial cluster", () => {
    const result = selectRemedy(candidate({ commercialIntent: 60 }), cluster());
    expect(result.remedy).toBe("PR_HOOK");
    expect(result.requiresVerificationFirst).toBe(true);
  });

  it("does not recommend PR_HOOK for an isolated single-source cluster even with high commercial intent", () => {
    const result = selectRemedy(candidate({ commercialIntent: 90 }), cluster({ uniqueSourceCount: 1, trendDirection: "isolated" }));
    expect(result.remedy).not.toBe("PR_HOOK");
  });

  it("recommends MIGRATION_GUIDE for forced-migration pain regardless of coverage", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "forced-migration" }));
    expect(result.remedy).toBe("MIGRATION_GUIDE");
  });

  it("recommends UPDATE_EXISTING_PAGE for price-pressure pain when Miloosh coverage is already strong", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "price-pressure", existingMilooshCoverage: 80 }));
    expect(result.remedy).toBe("UPDATE_EXISTING_PAGE");
  });

  it("recommends EXTEND_CALCULATOR for price-pressure pain with no coverage but real affiliate relevance", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "price-pressure", existingMilooshCoverage: 0, affiliateRelevant: true }));
    expect(result.remedy).toBe("EXTEND_CALCULATOR");
  });

  it("recommends PRICING_ALERT for price-pressure pain with no coverage and no affiliate relevance", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "price-pressure", existingMilooshCoverage: 0, affiliateRelevant: false }));
    expect(result.remedy).toBe("PRICING_ALERT");
  });

  it("recommends ALTERNATIVES_PAGE for loss-of-free-access pain", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "loss-of-free-access" }));
    expect(result.remedy).toBe("ALTERNATIVES_PAGE");
  });

  it("recommends COMPARISON_UPDATE for explicit comparison/alternatives intent outside the pricing classes", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "buyer-anxiety", intent: "comparison" }));
    expect(result.remedy).toBe("COMPARISON_UPDATE");
  });

  it("sets requiresVerificationFirst to false once the candidate is already VERIFIED_TRUE", () => {
    const result = selectRemedy(candidate({ normalizedPainClass: "forced-migration", verificationState: "VERIFIED_TRUE" }));
    expect(result.requiresVerificationFirst).toBe(false);
  });

  it("always returns at least one human-readable reason", () => {
    const result = selectRemedy(candidate());
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
