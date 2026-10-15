import { describe, expect, it } from "vitest";
import { indexingFreshnessForecast } from "@/scripts/seo/indexing-freshness-watch";

describe("indexing freshness early warning", () => {
  it("forecasts real software and comparison attrition without manufacturing refreshed dates", () => {
    const report = indexingFreshnessForecast(new Date("2026-10-14T12:00:00.000Z"), 21);
    expect(report.softwareCurrent).toBeGreaterThan(report.softwareProjected);
    expect(report.comparisonCurrent).toBeGreaterThan(report.comparisonProjected);
    expect(report.totalCandidateEntriesAtRisk).toBe(
      report.atRiskSoftware.length + report.atRiskComparisons.length
    );
    expect(report.atRiskSoftware.every((p) => p.reasons.length > 0)).toBe(true);
    expect(report.atRiskSoftware.some((p) => p.protectedUntil === "2026-11-04")).toBe(true);
  });

  it("labels old GSC data as historical and prioritizes measured signal only within that dated snapshot", () => {
    const report = indexingFreshnessForecast(new Date("2026-10-14T12:00:00.000Z"), 21);
    expect(report.historicalGscSnapshot.notCurrentIndexingEvidence).toBe(true);
    for (let i = 1; i < report.atRiskSoftware.length; i++) {
      expect(report.atRiskSoftware[i - 1]!.historicalGscClicks).toBeGreaterThanOrEqual(
        report.atRiskSoftware[i]!.historicalGscClicks
      );
    }
  });

  it("rejects impossible forecast windows", () => {
    expect(() => indexingFreshnessForecast(new Date("2026-10-14"), 0)).toThrow();
    expect(() => indexingFreshnessForecast(new Date("2026-10-14"), 366)).toThrow();
    expect(() => indexingFreshnessForecast(new Date("invalid"))).toThrow();
  });
});
