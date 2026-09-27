import { describe, expect, it, vi } from "vitest";

vi.mock("../../scripts/growth/commercial-graph-engine", () => ({
  buildCommercialGraph: () => ({ nodes: [true, false].map(isProtectedCohort => ({
    slug: isProtectedCohort ? "protected-fixture" : "open-fixture", name: "Fixture", category: "crm",
    bestAvailableTrafficSignal: 10, affiliateStatus: "ACTIVE", degree: 2,
    monetizationMultiplier: 1, monetizedComparisonsCount: 2, affiliateNetwork: "fixture", isProtectedCohort,
  })) }),
}));
import { rankCommercialOpportunities } from "../../scripts/growth/money-leaks-analyzer";
vi.mock("../../scripts/growth/gsc-opportunity-miner", () => ({ readProtectedExperimentSlugs: () => new Set(["protected-fixture"]) }));
vi.mock("../../scripts/growth/full-affiliate-sweep", () => ({ runFullAffiliateSweep: () => ({ allProducts:
  ["protected-fixture", "open-fixture"].map(slug => ({ slug, name: "Fixture", category: "crm", classification: "ACTIVE_AFFILIATE", heuristicSignal: 10 }))
}) }));
import { rankTopMoneyOpportunities } from "../../scripts/growth/top-money-opportunities";

describe("standalone commercial discovery is not mutation permission", () => {
  it("keeps analytical scores but suppresses editing recommendations for currently protected pages", () => {
    const { rankedNodes } = rankCommercialOpportunities();
    const held = rankedNodes.find(n => n.isProtected)!;
    const open = rankedNodes.find(n => !n.isProtected)!;
    expect(held.score).toBe(open.score);
    expect(held.actionableStep).toMatch(/^HOLD/);
    expect(held.actionableStep).not.toContain("Maximize");
    expect(open.actionableStep).toContain("Maximize");
  });
  it("holds the standalone top-money CTA/content recommendation without inventing different commercial scores", () => {
    const rows = rankTopMoneyOpportunities();
    const held = rows.find(n => n.isProtected)!;
    const open = rows.find(n => !n.isProtected)!;
    expect(held.moneyScore).toBe(open.moneyScore);
    expect(held.strategicAction).toMatch(/^HOLD/);
    expect(open.strategicAction).toContain("Improve conversion");
  });
});
