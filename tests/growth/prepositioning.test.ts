import { describe, expect, it } from "vitest";
import { buildPrepositioningPlan } from "@/lib/growth/prepositioning";
import type { PainForecast } from "@/lib/growth/pain-forecast";

function forecast(overrides: Partial<PainForecast> = {}): PainForecast {
  return {
    vendor: "Example",
    horizon: "7d",
    probabilityScore: 70,
    severityScore: 75,
    opportunityScore: 72,
    confidence: "HIGH",
    likelyPainClasses: ["price-pressure"],
    evidence: [],
    recommendedAction: "PREPARE_PRICING_ALERT",
    reasons: [],
    ...overrides,
  };
}

describe("forecast prepositioning", () => {
  it("never allows publication from forecast alone", () => {
    const plan = buildPrepositioningPlan(forecast({ probabilityScore: 95, opportunityScore: 95 }));
    expect(plan.publishAllowed).toBe(false);
    expect(plan.triggerConditions.length).toBeGreaterThan(0);
  });

  it("waits when forecast strength is low", () => {
    const plan = buildPrepositioningPlan(forecast({ probabilityScore: 30, opportunityScore: 25 }));
    expect(plan.action).toBe("WAIT");
  });

  it("prepares distribution for high-opportunity forecasts", () => {
    const plan = buildPrepositioningPlan(forecast({ probabilityScore: 68, opportunityScore: 75 }));
    expect(plan.action).toBe("PREPARE_DISTRIBUTION_PACKET");
    expect(plan.preparation.some((item) => item.includes("UTM"))).toBe(true);
  });

  it("prepares PR packet only for high-confidence high-opportunity forecasts", () => {
    const plan = buildPrepositioningPlan(forecast({ probabilityScore: 85, opportunityScore: 88, confidence: "HIGH" }));
    expect(plan.action).toBe("PREPARE_PR_PACKET");
    expect(plan.preparation.some((item) => item.includes("journalist"))).toBe(true);
  });

  it("prepares migration-specific material when forced migration is forecast", () => {
    const plan = buildPrepositioningPlan(
      forecast({ recommendedAction: "PREPARE_MIGRATION_GUIDE", likelyPainClasses: ["forced-migration"] }),
    );
    expect(plan.preparation.some((item) => item.includes("migration checklist"))).toBe(true);
  });
});
