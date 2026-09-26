import { describe, expect, it } from "vitest";
import { assessIndexationReadiness, buildIndexationReadinessReport } from "@/scripts/growth/indexation-readiness";
import { FROZEN_COHORTS } from "@/data/growth/frozen-cohorts";

/**
 * GOOGLE INDEXATION FACTORY, WAVE 2 mission (2026-09-26) — permanent
 * readiness tool. This measures Miloosh's own content/link readiness for
 * a page to deserve indexing; it does not, and cannot, predict whether
 * Google will actually index it.
 */
describe("growth:indexation-readiness", () => {
  it("marks every frozen-cohort slug PROTECTED regardless of its own factual depth", () => {
    for (const cohort of FROZEN_COHORTS) {
      for (const slug of [...cohort.treatment, ...cohort.control]) {
        const result = assessIndexationReadiness(slug);
        expect(result.verdict, `${slug} (wave ${cohort.wave})`).toBe("PROTECTED");
      }
    }
  });

  it("marks an active MEASURING revenue-experiment page PROTECTED", () => {
    // wrike is the standing example: work-revenue-experiment-receipt-2026-09-10.json,
    // measurement window through 2026-10-08.
    const result = assessIndexationReadiness("wrike");
    expect(result.verdict).toBe("PROTECTED");
    expect(result.reasons.some((r) => r.code === "ACTIVE_EXPERIMENT")).toBe(true);
  });

  it("returns FAIL for a slug with no software entry", () => {
    const result = assessIndexationReadiness("this-slug-does-not-exist");
    expect(result.verdict).toBe("FAIL");
  });

  it("reports a real, non-trivial distribution across all 354 pages", () => {
    const report = buildIndexationReadinessReport();
    expect(report.length).toBeGreaterThan(300);
    const counts = { PASS: 0, WARN: 0, FAIL: 0, PROTECTED: 0 };
    for (const r of report) counts[r.verdict]++;
    // Every bucket should be non-empty on a real catalog this size --
    // an all-PASS or all-PROTECTED result would mean the scoring logic
    // broke, not that the catalog is perfect.
    expect(counts.PASS).toBeGreaterThan(0);
    expect(counts.WARN).toBeGreaterThan(0);
    expect(counts.FAIL).toBeGreaterThan(0);
    expect(counts.PROTECTED).toBeGreaterThan(0);
  });

  it("gives every FAIL verdict at least one concrete, actionable reason code", () => {
    const report = buildIndexationReadinessReport();
    for (const r of report.filter((r) => r.verdict === "FAIL")) {
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.reasons.every((reason) => reason.detail.length > 10)).toBe(true);
    }
  });
});
