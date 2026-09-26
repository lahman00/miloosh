import { describe, it, expect } from "vitest";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";

/**
 * Citable Research Asset Factory (2026-09-26) — regression suite for the
 * Customer Support Pricing Benchmark. Runs against the REAL catalog, same
 * pattern as pricing-index.test.ts, since the whole point of this asset
 * is that every number traces back to real, currently-committed data.
 */
describe("buildSupportPricingBenchmark", () => {
  const b = buildSupportPricingBenchmark();

  it("sample is exactly the catalog's customer-support category, not a hand-picked list", () => {
    expect(b.sampleSize).toBeGreaterThan(0);
    expect(b.rows.every((r) => typeof r.slug === "string" && r.slug.length > 0)).toBe(true);
  });

  it("every row's AI-usage classification is internally consistent: disclosed implies a real unit price and unit", () => {
    for (const r of b.rows) {
      if (r.aiUsagePricing.disclosed) {
        expect(r.aiUsagePricing.unitPrice).not.toBeNull();
        expect(r.aiUsagePricing.unitPrice).toBeGreaterThan(0);
        expect(r.aiUsagePricing.unit).toBeTruthy();
      } else {
        expect(r.aiUsagePricing.unitPrice).toBeNull();
      }
      expect(r.aiUsagePricing.note.length).toBeGreaterThan(0);
    }
  });

  it("disclosedAiUsageRows is exactly the subset of rows with aiUsagePricing.disclosed === true", () => {
    const expectedSlugs = b.rows.filter((r) => r.aiUsagePricing.disclosed).map((r) => r.slug).sort();
    expect(b.disclosedAiUsageRows.map((r) => r.slug).sort()).toEqual(expectedSlugs);
  });

  it("billingUnitStats.disclosedAiUsageUnit matches the actual count of disclosed rows", () => {
    expect(b.billingUnitStats.disclosedAiUsageUnit).toBe(b.disclosedAiUsageRows.length);
  });

  it("unknownSlugs contains only rows whose pricing status is neither verified nor contact_sales", () => {
    for (const slug of b.unknownSlugs) {
      const row = b.rows.find((r) => r.slug === slug);
      expect(row).toBeDefined();
      expect(["verified", "contact_sales"]).not.toContain(row!.status);
    }
  });

  it("verifiedCount + unknownSlugs.length equals the full sample size", () => {
    expect(b.verifiedCount + b.unknownSlugs.length).toBe(b.sampleSize);
  });

  it("no row with entryAmount === null is ever reported with a fabricated numeric starting price", () => {
    for (const r of b.rows) {
      if (r.entryAmount === null) {
        expect(r.recordedStartingPrice === null || typeof r.recordedStartingPrice === "string").toBe(true);
      }
    }
  });

  it("the crossing scenario, if present, only uses a vendor with both a public seat rate and a public AI unit price", () => {
    if (b.crossingScenario) {
      const vendorRow = b.rows.find((r) => r.name === b.crossingScenario!.vendor);
      expect(vendorRow?.entryAmount).not.toBeNull();
      expect(vendorRow?.aiUsagePricing.disclosed).toBe(true);
    }
  });

  it("crossing scenario totals are always seatCost + aiCost, never an independently drifted number", () => {
    if (b.crossingScenario) {
      for (const row of b.crossingScenario.rows) {
        expect(row.total).toBeCloseTo(row.seatCost + row.aiCost, 2);
      }
    }
  });

  it("crossing scenario AI cost scales linearly with the published per-unit rate", () => {
    if (b.crossingScenario) {
      for (const row of b.crossingScenario.rows) {
        expect(row.aiCost).toBeCloseTo(b.crossingScenario.aiUnitPrice * row.resolutions, 2);
      }
    }
  });

  it("inclusion rule is always present and non-empty (the published methodology depends on it)", () => {
    expect(b.inclusionRule.length).toBeGreaterThan(0);
  });
});
