import { describe, expect, it } from "vitest";
import {
  DECISION_MONEY_PAGES,
  DECISION_STAGE_QUERIES,
} from "@/data/growth/decision-money-pages";
import {
  getComparisonSlug,
  PUBLISHED_COMPARISONS,
} from "@/data/comparisons";
import { getActivePartner } from "@/data/affiliate/active-partners";

describe("decision-stage money-page sprint", () => {
  it("focuses exactly five pages and twenty buyer-intent queries", () => {
    expect(DECISION_MONEY_PAGES).toHaveLength(5);
    expect(DECISION_STAGE_QUERIES).toHaveLength(20);
    expect(new Set(DECISION_STAGE_QUERIES).size).toBe(20);
  });

  it("only targets published comparisons", () => {
    const published = new Set(
      PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b))
    );
    for (const page of DECISION_MONEY_PAGES) {
      expect(published.has(page.comparison)).toBe(true);
    }
  });

  it("monetizes both products on every selected comparison", () => {
    const bySlug = new Map(
      PUBLISHED_COMPARISONS.map(([a, b]) => [getComparisonSlug(a, b), [a, b]])
    );

    for (const page of DECISION_MONEY_PAGES) {
      const pair = bySlug.get(page.comparison);
      expect(pair).toBeDefined();
      for (const slug of pair ?? []) {
        expect(getActivePartner(slug)?.status).toBe("active");
        expect(getActivePartner(slug)?.affiliateUrl).toBeTruthy();
      }
    }
  });
});
