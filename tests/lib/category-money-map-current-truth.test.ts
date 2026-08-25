import { describe, expect, it } from "vitest";
import { computeCategoryMoneyMap } from "@/lib/growth-audit/category-money-map";
import { computeMonetizationGaps } from "@/lib/growth-audit/monetization-gaps";

describe("category money map current truth", () => {
  const categories = computeCategoryMoneyMap();
  const gaps = computeMonetizationGaps();

  it("aggregates active/pending/viable counts from the same current status model", () => {
    expect(categories.reduce((sum, row) => sum + row.activeAffiliatesCount, 0)).toBe(gaps.filter((row) => row.statusGroup === "A").length);
    expect(categories.reduce((sum, row) => sum + row.pendingAffiliatesCount, 0)).toBe(gaps.filter((row) => row.statusGroup === "B").length);
    expect(categories.reduce((sum, row) => sum + row.viableAffiliatesCount, 0)).toBe(gaps.filter((row) => row.statusGroup === "C").length);
  });

  it("does not present stale hard-coded GSC clicks or positions as defaults", () => {
    expect(categories.reduce((sum, row) => sum + row.clicks, 0)).toBe(0);
    expect(categories.every((row) => row.avgPosition === null)).toBe(true);
  });
});
