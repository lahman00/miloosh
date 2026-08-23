import { describe, expect, it } from "vitest";
import { forecastPain, rankForecasts, type ForecastSignal } from "@/lib/growth/pain-forecast";

const now = new Date("2026-08-24T00:00:00Z");

function signal(overrides: Partial<ForecastSignal> = {}): ForecastSignal {
  return {
    id: "s1",
    vendor: "ExampleCo",
    type: "pricing-page-change",
    observedAt: "2026-08-23T18:00:00Z",
    sourceUrl: "https://example.com/pricing",
    sourceReliability: 95,
    magnitude: 80,
    novelty: 80,
    buyerImpact: 90,
    confidence: 90,
    ...overrides,
  };
}

describe("Pain Forecast", () => {
  it("returns no action without evidence", () => {
    const result = forecastPain({ vendor: "ExampleCo" }, [], "30d", now);
    expect(result.probabilityScore).toBe(0);
    expect(result.recommendedAction).toBe("NO_ACTION");
    expect(result.confidence).toBe("LOW");
  });

  it("forecasts near-term pricing pain from strong first-party signals", () => {
    const result = forecastPain(
      { vendor: "ExampleCo", currentSearchDemand: 80, existingMilooshCoverage: 20 },
      [
        signal(),
        signal({ id: "s2", type: "seat-minimum-change", sourceUrl: "https://example.com/terms" }),
        signal({ id: "s3", type: "community-sentiment-acceleration", sourceReliability: 75, confidence: 75 }),
      ],
      "7d",
      now,
    );

    expect(result.probabilityScore).toBeGreaterThanOrEqual(60);
    expect(result.likelyPainClasses).toContain("price-pressure");
    expect(result.recommendedAction).not.toBe("NO_ACTION");
    expect(result.confidence).toBe("HIGH");
  });

  it("prefers migration preparation for deprecation signals", () => {
    const result = forecastPain(
      { vendor: "ExampleCo", currentSearchDemand: 70 },
      [signal({ type: "sunset-deprecation", buyerImpact: 100 })],
      "30d",
      now,
    );

    expect(result.likelyPainClasses).toContain("forced-migration");
    expect(result.recommendedAction).toBe("PREPARE_MIGRATION_GUIDE");
  });

  it("keeps weak speculative M&A evidence low-confidence", () => {
    const result = forecastPain(
      { vendor: "ExampleCo" },
      [
        signal({
          type: "acquisition-ma",
          sourceReliability: 35,
          confidence: 30,
          magnitude: 30,
          buyerImpact: 25,
        }),
      ],
      "90d",
      now,
    );

    expect(result.confidence).toBe("LOW");
    expect(result.probabilityScore).toBeLessThan(60);
  });

  it("ranks forecasts by opportunity, then probability", () => {
    const low = forecastPain(
      { vendor: "Low", currentSearchDemand: 10 },
      [signal({ vendor: "Low", buyerImpact: 40, magnitude: 40 })],
      "30d",
      now,
    );
    const high = forecastPain(
      { vendor: "High", currentSearchDemand: 90 },
      [signal({ vendor: "High", buyerImpact: 95, magnitude: 95 })],
      "30d",
      now,
    );

    expect(rankForecasts([low, high])[0]?.vendor).toBe("High");
  });
});
