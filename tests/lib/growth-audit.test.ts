import { describe, expect, it } from "vitest";
import {
  computeGraphNodeDegrees,
  findMissingComparisonOpportunities,
  computeMonetizationGaps,
  computeCategoryMoneyMap,
  analyzeInternalLinkGraph,
} from "@/lib/growth-audit";
import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";

describe("Growth Audit Tooling", () => {
  const software = getAllSoftware();
  const categories = getAllCategories();

  it("computes comparison graph node degrees correctly", () => {
    const degrees = computeGraphNodeDegrees(software);
    expect(degrees.length).toBe(software.length);
    expect(degrees[0]!.degree).toBeGreaterThan(0);
    expect(degrees.reduce((sum, d) => sum + d.degree, 0)).toBe(PUBLISHED_COMPARISONS.length * 2);
    expect(degrees.find((d) => d.slug === "servicetitan")?.degree).toBe(2);
  });

  it("finds and scores missing comparison opportunities deterministically", () => {
    const candidates = findMissingComparisonOpportunities(software);
    expect(candidates.length).toBeGreaterThan(100);
    expect(candidates[0]!.score).toBeGreaterThanOrEqual(60);
    const publishedSet = new Set(
      PUBLISHED_COMPARISONS.map(([a, b]) => `${a}:${b}`).concat(PUBLISHED_COMPARISONS.map(([a, b]) => `${b}:${a}`)),
    );
    for (const c of candidates.slice(0, 50)) {
      expect(publishedSet.has(`${c.slugA}:${c.slugB}`)).toBe(false);
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });

  it("classifies monetization gaps from current truth", () => {
    const gaps = computeMonetizationGaps(software);
    expect(gaps.length).toBe(software.length);
    expect(gaps.some((g) => g.statusGroup === "A")).toBe(true);
    const nonActiveGaps = gaps.filter((g) => g.statusGroup !== "A");
    expect(nonActiveGaps[0]!.monetizationGapScore).toBeGreaterThanOrEqual(60);
  });

  it("computes bounded category money-map scores without pinning stale affiliate-state output", () => {
    const catMap = computeCategoryMoneyMap(categories, software);
    expect(catMap.length).toBe(categories.length);
    for (const cat of catMap) {
      expect(cat.productCount).toBeGreaterThan(0);
      expect(cat.currentValueScore).toBeGreaterThanOrEqual(0);
      expect(cat.currentValueScore).toBeLessThanOrEqual(100);
      expect(cat.untappedValueScore).toBeGreaterThanOrEqual(0);
      expect(cat.untappedValueScore).toBeLessThanOrEqual(100);
    }
    // This assertion guards the strategic signal rather than an old exact
    // score. As active/pending relationships become real, untapped value is
    // expected to fall. Customer support still remains materially untapped.
    const customerSupport = catMap.find((c) => c.slug === "customer-support");
    expect(customerSupport).toBeDefined();
    expect(customerSupport!.untappedValueScore).toBeGreaterThanOrEqual(60);
  });

  it("analyzes internal link graph without broken orphans", () => {
    const linkAudit = analyzeInternalLinkGraph(software, categories);
    expect(linkAudit.orphans.length).toBe(0);
    expect(linkAudit.totalUniquePages).toBeGreaterThan(1300);
    const volza = linkAudit.underlinkedActiveAffiliates.find((s) => s.url === "/software/volza");
    expect(volza).toBeDefined();
    expect(volza?.inboundCount).toBe(3);
  });
});
