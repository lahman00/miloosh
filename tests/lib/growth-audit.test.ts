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

    // Verify degree sum is exactly 2 * PUBLISHED_COMPARISONS.length
    const degreeSum = degrees.reduce((sum, d) => sum + d.degree, 0);
    expect(degreeSum).toBe(PUBLISHED_COMPARISONS.length * 2);

    // Verify repaired node detection (servicetitan now has degree 2)
    const serviceTitan = degrees.find((d) => d.slug === "servicetitan");
    expect(serviceTitan).toBeDefined();
    expect(serviceTitan?.degree).toBe(2);
  });

  it("finds and scores missing comparison opportunities deterministically", () => {
    const candidates = findMissingComparisonOpportunities(software);
    expect(candidates.length).toBeGreaterThan(100);

    // Top opportunity should have high score
    expect(candidates[0]!.score).toBeGreaterThanOrEqual(60);

    // Ensure none of the candidate pairs are already published
    const publishedSet = new Set(
      PUBLISHED_COMPARISONS.map(([a, b]) => `${a}:${b}`).concat(
        PUBLISHED_COMPARISONS.map(([a, b]) => `${b}:${a}`)
      )
    );
    for (const c of candidates.slice(0, 50)) {
      expect(publishedSet.has(`${c.slugA}:${c.slugB}`)).toBe(false);
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });

  it("classifies monetization gaps across groups A-G and computes gap scores", () => {
    const gaps = computeMonetizationGaps(software);
    expect(gaps.length).toBe(software.length);

    const groupCounts = new Map<string, number>();
    for (const g of gaps) {
      groupCounts.set(g.statusGroup, (groupCounts.get(g.statusGroup) ?? 0) + 1);
      expect(g.monetizationGapScore).toBeGreaterThanOrEqual(0);
      expect(g.monetizationGapScore).toBeLessThanOrEqual(100);
    }

    // Active partners should be Group A
    expect(groupCounts.get("A")).toBeGreaterThan(0);
    // Non-active high-traffic tools like Freshdesk should be ranked near the top of monetization gaps.
    // Threshold intentionally has real headroom below the current live value (68 as of the 2026-08-25
    // reconciliation that moved Close into Group A) rather than pinning to today's exact number --
    // Group A membership legitimately shifts as real affiliate status changes, and the top non-active
    // score moves with it. This still asserts the real intent: a meaningfully high, not incidental, score.
    const nonActiveGaps = gaps.filter((g) => g.statusGroup !== "A");
    expect(nonActiveGaps[0]!.monetizationGapScore).toBeGreaterThanOrEqual(60);
  });

  it("computes category money map and ranks untapped vs current value", () => {
    const catMap = computeCategoryMoneyMap(categories, software);
    expect(catMap.length).toBe(categories.length);

    for (const cat of catMap) {
      expect(cat.productCount).toBeGreaterThan(0);
      expect(cat.currentValueScore).toBeGreaterThanOrEqual(0);
      expect(cat.currentValueScore).toBeLessThanOrEqual(100);
      expect(cat.untappedValueScore).toBeGreaterThanOrEqual(0);
      expect(cat.untappedValueScore).toBeLessThanOrEqual(100);
    }

    // Customer support & Marketing should have high untapped value due to massive GSC impressions
    const customerSupport = catMap.find((c) => c.slug === "customer-support");
    expect(customerSupport).toBeDefined();
    expect(customerSupport?.untappedValueScore).toBeGreaterThanOrEqual(80);
  });

  it("analyzes internal link graph without finding any broken orphans", () => {
    const linkAudit = analyzeInternalLinkGraph(software, categories);
    expect(linkAudit.orphans.length).toBe(0);
    expect(linkAudit.totalUniquePages).toBeGreaterThan(1300);

    // Verify underlinked active affiliates are identified
    expect(linkAudit.underlinkedActiveAffiliates.length).toBeGreaterThan(0);
    const volza = linkAudit.underlinkedActiveAffiliates.find((s) => s.url === "/software/volza");
    expect(volza).toBeDefined();
    // 5 -> 3 after the 2026-08-22 comparison-graph purification removed volza-vs-semrush and
    // volza-vs-ahrefs (Volza is trade/customs intelligence, not a real substitute for SEO tools).
    expect(volza?.inboundCount).toBe(3);
  });
});
