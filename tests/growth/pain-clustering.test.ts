import { describe, it, expect } from "vitest";
import { clusterPainCandidates } from "@/lib/growth/pain-clustering";
import type { PersistedPainCandidate } from "@/lib/growth/pain-candidate-store";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24) — P2/P3 regression
 * suite. Builds synthetic candidate fixtures matching real shapes
 * (Freshdesk free-plan-ending cluster, Notion AI-limits cluster) rather
 * than asserting on live data, matching this codebase's established
 * pattern for deterministic growth-scoring tests.
 */

let counter = 0;
function candidate(overrides: Partial<PersistedPainCandidate>): PersistedPainCandidate {
  counter += 1;
  return {
    id: `c${counter}`,
    source: "reddit",
    sourceUrl: `https://reddit.com/r/test/comments/${counter}`,
    discoveredAt: "2026-08-01T00:00:00Z",
    title: "Test pain",
    intent: "too-expensive",
    vendor: "Freshdesk",
    normalizedPainClass: "price-pressure",
    verificationState: "UNVERIFIED",
    remedyState: "NONE_SELECTED",
    distributionState: "NOT_DISTRIBUTED",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("clusterPainCandidates", () => {
  it("groups multiple candidates for the same vendor + pain class into one cluster", () => {
    const candidates = [
      candidate({ sourceUrl: "https://reddit.com/r/sysadmin/1", discoveredAt: "2026-08-18T10:00:00Z", engagement: 50, sourceReliability: 60 }),
      candidate({ sourceUrl: "https://reddit.com/r/sysadmin/2", discoveredAt: "2026-08-19T10:00:00Z", engagement: 40, sourceReliability: 60 }),
      candidate({ sourceUrl: "https://reddit.com/r/sysadmin/3", discoveredAt: "2026-08-20T10:00:00Z", engagement: 60, sourceReliability: 60 }),
    ];
    const clusters = clusterPainCandidates(candidates);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.signalCount).toBe(3);
    expect(clusters[0]!.vendor).toBe("freshdesk");
    expect(clusters[0]!.uniqueSourceCount).toBe(3);
  });

  it("keeps different vendors as separate clusters", () => {
    const candidates = [
      candidate({ vendor: "Freshdesk", sourceUrl: "https://reddit.com/r/a/1" }),
      candidate({ vendor: "Notion", sourceUrl: "https://reddit.com/r/b/1" }),
    ];
    const clusters = clusterPainCandidates(candidates);
    expect(clusters).toHaveLength(2);
    expect(new Set(clusters.map((c) => c.vendor))).toEqual(new Set(["freshdesk", "notion"]));
  });

  it("keeps different pain classes for the same vendor as separate clusters", () => {
    const candidates = [
      candidate({ vendor: "Zapier", normalizedPainClass: "price-pressure", sourceUrl: "https://reddit.com/r/a/1" }),
      candidate({ vendor: "Zapier", normalizedPainClass: "support-degradation", sourceUrl: "https://reddit.com/r/a/2" }),
    ];
    const clusters = clusterPainCandidates(candidates);
    expect(clusters).toHaveLength(2);
  });

  it("splits candidates more than 30 days apart into separate clusters instead of one long-lived one", () => {
    const candidates = [
      candidate({ sourceUrl: "https://reddit.com/r/a/1", discoveredAt: "2026-01-01T00:00:00Z" }),
      candidate({ sourceUrl: "https://reddit.com/r/a/2", discoveredAt: "2026-06-01T00:00:00Z" }),
    ];
    const clusters = clusterPainCandidates(candidates);
    expect(clusters).toHaveLength(2);
  });

  it("excludes candidates with no vendor or an unclassified pain class from clustering entirely", () => {
    const candidates = [
      candidate({ vendor: undefined }),
      candidate({ normalizedPainClass: "unclassified" }),
    ];
    expect(clusterPainCandidates(candidates)).toEqual([]);
  });

  it("a single-signal cluster is always 'isolated' with a low velocity score, never a fabricated trend", () => {
    const clusters = clusterPainCandidates([candidate({})]);
    expect(clusters[0]!.trendDirection).toBe("isolated");
    expect(clusters[0]!.painVelocityScore).toBeLessThan(30);
  });

  it("a cluster with accelerating signal frequency (more signals in the second half) scores higher velocity than a stable one", () => {
    const stable = clusterPainCandidates([
      candidate({ vendor: "StableCo", sourceUrl: "https://reddit.com/r/x/1", discoveredAt: "2026-08-01T00:00:00Z" }),
      candidate({ vendor: "StableCo", sourceUrl: "https://reddit.com/r/x/2", discoveredAt: "2026-08-15T00:00:00Z" }),
    ]);
    const accelerating = clusterPainCandidates([
      candidate({ vendor: "FastCo", sourceUrl: "https://reddit.com/r/y/1", discoveredAt: "2026-08-01T00:00:00Z" }),
      candidate({ vendor: "FastCo", sourceUrl: "https://reddit.com/r/y/2", discoveredAt: "2026-08-14T00:00:00Z" }),
      candidate({ vendor: "FastCo", sourceUrl: "https://reddit.com/r/y/3", discoveredAt: "2026-08-15T00:00:00Z" }),
      candidate({ vendor: "FastCo", sourceUrl: "https://reddit.com/r/y/4", discoveredAt: "2026-08-15T12:00:00Z" }),
    ]);
    expect(accelerating[0]!.painVelocityScore).toBeGreaterThan(stable[0]!.painVelocityScore);
  });

  it("computes average severity and commercial intent correctly across the cluster", () => {
    const clusters = clusterPainCandidates([
      candidate({ sourceUrl: "https://reddit.com/r/a/1", severity: 80, commercialIntent: 60 }),
      candidate({ sourceUrl: "https://reddit.com/r/a/2", severity: 40, commercialIntent: 20 }),
    ]);
    expect(clusters[0]!.averageSeverity).toBe(60);
    expect(clusters[0]!.averageCommercialIntent).toBe(40);
  });

  it("buckets source reliability into high/medium/low correctly", () => {
    const clusters = clusterPainCandidates([
      candidate({ sourceUrl: "https://reddit.com/r/a/1", sourceReliability: 80 }),
      candidate({ sourceUrl: "https://reddit.com/r/a/2", sourceReliability: 50 }),
      candidate({ sourceUrl: "https://reddit.com/r/a/3", sourceReliability: 20 }),
    ]);
    expect(clusters[0]!.reliabilityMix).toEqual({ high: 1, medium: 1, low: 1 });
  });

  it("sorts clusters by descending pain velocity score", () => {
    const candidates = [
      candidate({ vendor: "LowVelocity", sourceUrl: "https://reddit.com/r/a/1" }),
      candidate({ vendor: "HighVelocity", sourceUrl: "https://reddit.com/r/b/1", discoveredAt: "2026-08-15T00:00:00Z" }),
      candidate({ vendor: "HighVelocity", sourceUrl: "https://reddit.com/r/b/2", discoveredAt: "2026-08-15T02:00:00Z" }),
      candidate({ vendor: "HighVelocity", sourceUrl: "https://reddit.com/r/b/3", discoveredAt: "2026-08-15T04:00:00Z" }),
    ];
    const clusters = clusterPainCandidates(candidates);
    expect(clusters[0]!.painVelocityScore).toBeGreaterThanOrEqual(clusters[1]!.painVelocityScore);
  });
});
