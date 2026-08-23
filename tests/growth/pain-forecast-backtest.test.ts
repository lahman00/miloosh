import { describe, expect, it } from "vitest";
import {
  calibrationBands,
  evaluateForecast,
  summarizeCalibration,
  type ForecastOutcome,
  type ForecastRecord,
} from "@/lib/growth/pain-forecast-backtest";

function record(id: string, probabilityScore: number, horizon: "7d" | "30d" | "90d" = "7d"): ForecastRecord {
  return {
    id,
    forecastedAt: "2026-08-01T00:00:00Z",
    forecast: {
      vendor: `Vendor ${id}`,
      horizon,
      probabilityScore,
      severityScore: 70,
      opportunityScore: 75,
      confidence: "HIGH",
      likelyPainClasses: ["price-pressure"],
      evidence: [],
      recommendedAction: "PREPARE_PRICING_ALERT",
      reasons: [],
    },
  };
}

function outcome(forecastId: string, value: ForecastOutcome["outcome"], firstPainObservedAt?: string): ForecastOutcome {
  return {
    forecastId,
    vendor: `Vendor ${forecastId}`,
    horizon: "7d",
    forecastedAt: "2026-08-01T00:00:00Z",
    evaluationAt: "2026-08-08T00:00:00Z",
    outcome: value,
    actualPainClasses: value === "PAIN_MATERIALIZED" || value === "PARTIAL" ? ["price-pressure"] : [],
    firstPainObservedAt,
    evidenceUrls: [],
  };
}

describe("pain forecast backtesting", () => {
  it("classifies a strong forecast that materializes as a true positive", () => {
    const result = evaluateForecast(record("a", 82), outcome("a", "PAIN_MATERIALIZED", "2026-08-03T12:00:00Z"));
    expect(result.classification).toBe("TRUE_POSITIVE");
    expect(result.leadTimeHours).toBe(60);
    expect(result.classOverlap).toBe(1);
  });

  it("classifies a high-confidence miss as a false positive", () => {
    const result = evaluateForecast(record("b", 76), outcome("b", "NO_MATERIAL_PAIN"));
    expect(result.classification).toBe("FALSE_POSITIVE");
    expect(result.actualPositive).toBe(false);
  });

  it("classifies missed realized pain as a false negative", () => {
    const result = evaluateForecast(record("c", 42), outcome("c", "PAIN_MATERIALIZED"));
    expect(result.classification).toBe("FALSE_NEGATIVE");
  });

  it("keeps unknown outcomes unresolved rather than inventing truth", () => {
    const result = evaluateForecast(record("d", 90), outcome("d", "UNKNOWN"));
    expect(result.classification).toBe("UNRESOLVED");
    expect(result.actualPositive).toBeNull();
  });

  it("summarizes precision, recall, false positives and Brier score", () => {
    const results = [
      evaluateForecast(record("a", 80), outcome("a", "PAIN_MATERIALIZED")),
      evaluateForecast(record("b", 75), outcome("b", "NO_MATERIAL_PAIN")),
      evaluateForecast(record("c", 45), outcome("c", "PAIN_MATERIALIZED")),
      evaluateForecast(record("d", 25), outcome("d", "NO_MATERIAL_PAIN")),
    ];

    const summary = summarizeCalibration(results);
    expect(summary.evaluated).toBe(4);
    expect(summary.truePositive).toBe(1);
    expect(summary.falsePositive).toBe(1);
    expect(summary.trueNegative).toBe(1);
    expect(summary.falseNegative).toBe(1);
    expect(summary.precision).toBe(0.5);
    expect(summary.recall).toBe(0.5);
    expect(summary.falsePositiveRate).toBe(0.5);
    expect(summary.brierScore).not.toBeNull();
  });

  it("builds empirical probability bands", () => {
    const results = [
      evaluateForecast(record("a", 85), outcome("a", "PAIN_MATERIALIZED")),
      evaluateForecast(record("b", 88), outcome("b", "NO_MATERIAL_PAIN")),
      evaluateForecast(record("c", 65), outcome("c", "PAIN_MATERIALIZED")),
    ];

    const bands = calibrationBands(results);
    expect(bands.find((band) => band.minProbability === 80)?.count).toBe(2);
    expect(bands.find((band) => band.minProbability === 80)?.observedRate).toBe(0.5);
    expect(bands.find((band) => band.minProbability === 60)?.observedRate).toBe(1);
  });
});
