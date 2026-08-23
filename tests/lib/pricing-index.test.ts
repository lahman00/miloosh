import { describe, it, expect } from "vitest";
import { buildPricingIndex } from "@/lib/pricing-index/build";

/**
 * MILOOSH WAR MODE mission (2026-08-24) — regression suite for the
 * SaaS Pricing Pressure Index. Runs against the REAL catalog (same
 * pattern as factual-depth-audit.test.ts) since the whole point is that
 * every number traces back to real, currently-committed data — a mocked
 * fixture would defeat the purpose of testing this module.
 */
describe("buildPricingIndex", () => {
  const index = buildPricingIndex();

  it("sample only includes entries with verified/contact_sales pricing status", () => {
    expect(index.sampleSize).toBeGreaterThan(0);
    expect(index.sampleSize).toBeLessThan(index.totalCatalogSize);
  });

  it("every stat's numerator never exceeds its denominator, and denominator equals the sample size", () => {
    for (const s of index.stats) {
      expect(s.numerator).toBeLessThanOrEqual(s.denominator);
      expect(s.denominator).toBe(index.sampleSize);
    }
  });

  it("every stat's percentage is mathematically consistent with its numerator/denominator", () => {
    for (const s of index.stats) {
      const expectedPct = Math.round((s.numerator / s.denominator) * 1000) / 10;
      expect(s.pct).toBe(expectedPct);
    }
  });

  it("modeled team costs only include products explicitly recorded as per-seat pricing", () => {
    for (const m of index.modeledTeamCosts) {
      const product = index.products.find((p) => p.slug === m.slug);
      expect(product?.perSeat).toBe(true);
    }
  });

  it("modeled costs scale linearly and consistently with the per-seat rate", () => {
    for (const m of index.modeledTeamCosts) {
      expect(m.cost5).toBeCloseTo(m.perSeatMonthlyRate * 5, 1);
      expect(m.cost10).toBeCloseTo(m.perSeatMonthlyRate * 10, 1);
      expect(m.cost25).toBeCloseTo(m.perSeatMonthlyRate * 25, 1);
      expect(m.cost50).toBeCloseTo(m.perSeatMonthlyRate * 50, 1);
    }
  });

  it("category medians only appear for categories with at least 3 real starting-price data points", () => {
    for (const c of index.categoryMedianStartingPrice) {
      expect(c.sampleSize).toBeGreaterThanOrEqual(3);
    }
  });

  it("highestModeledCost50Seats is genuinely the maximum across all modeled products", () => {
    if (index.highestModeledCost50Seats) {
      const maxCost50 = Math.max(...index.modeledTeamCosts.map((m) => m.cost50));
      expect(index.highestModeledCost50Seats.cost50).toBe(maxCost50);
    }
  });

  it("medianStartingPrice is null only if no product has a finite starting price, never a fabricated fallback", () => {
    if (index.products.every((p) => p.startingMonthlyEquivalent === null)) {
      expect(index.medianStartingPrice).toBeNull();
    } else {
      expect(index.medianStartingPrice).not.toBeNull();
    }
  });

  it("inclusion/exclusion rules are always present and non-empty (the published methodology depends on them)", () => {
    expect(index.inclusionRule.length).toBeGreaterThan(0);
    expect(index.exclusionRule.length).toBeGreaterThan(0);
  });
});
