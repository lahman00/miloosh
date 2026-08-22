import { describe, expect, it } from "vitest";
import { buildFactualDepthReport, scoreFactualDepth, summarizeFactualDepth } from "@/scripts/growth/factual-depth-audit";
import { getAllSoftware, getSoftware } from "@/data/software";

describe("factual depth audit", () => {
  it("scores every real software page in the range 0-100 with a matching bucket", () => {
    const rows = buildFactualDepthReport();
    expect(rows.length).toBe(getAllSoftware().length);
    for (const row of rows) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(100);
      if (row.score >= 80) expect(row.bucket).toBe("A");
      else if (row.score >= 60) expect(row.bucket).toBe("B");
      else if (row.score >= 40) expect(row.bucket).toBe("C");
      else expect(row.bucket).toBe("D");
    }
  });

  it("is sorted highest score first", () => {
    const rows = buildFactualDepthReport();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
    }
  });

  it("summarize distribution counts add up to the total", () => {
    const rows = buildFactualDepthReport();
    const dist = summarizeFactualDepth(rows);
    expect(dist.A + dist.B + dist.C + dist.D).toBe(dist.total);
    expect(dist.total).toBe(rows.length);
  });

  it("a page with real sourced pricing scores strictly higher than the same page would with pricing stripped", () => {
    const withPricing = getSoftware("help-scout")!;
    const scoredWithPricing = scoreFactualDepth(withPricing);
    const withoutPricing = { ...withPricing, pricing: undefined };
    const scoredWithoutPricing = scoreFactualDepth(withoutPricing);
    expect(scoredWithPricing.score).toBeGreaterThan(scoredWithoutPricing.score);
  });

  it("does not reward prose length -- doubling bestFor text does not change the target-customer score once already past the specificity floor", () => {
    const software = getSoftware("notion")!;
    const base = scoreFactualDepth(software);
    const padded = { ...software, bestFor: software.bestFor + " " + software.bestFor };
    const paddedScore = scoreFactualDepth(padded);
    expect(paddedScore.breakdown.targetCustomer).toBe(base.breakdown.targetCustomer);
  });

  it("feature depth is capped, not unbounded -- adding many extra features stops increasing the score", () => {
    const software = getSoftware("notion")!;
    const manyFeatures = { ...software, features: Array.from({ length: 50 }, (_, i) => `feature ${i}`) };
    const scored = scoreFactualDepth(manyFeatures);
    expect(scored.breakdown.featureDepth).toBeLessThanOrEqual(15);
  });

  it("source diversity counts distinct domains, not raw source count", () => {
    const software = getSoftware("notion")!;
    const sameDomainTwice = { ...software, sources: ["https://notion.so/a", "https://notion.so/b"] };
    const scored = scoreFactualDepth(sameDomainTwice);
    expect(scored.breakdown.sourceDiversity).toBeLessThan(5);
  });
});
