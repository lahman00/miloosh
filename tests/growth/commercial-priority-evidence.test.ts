import { describe, expect, it } from "vitest";
import { hasActionableStrikingDistanceEvidence, runCommercialPriorityEngine } from "@/scripts/growth/commercial-priority-engine";

describe("commercial priority evidence floor", () => {
  it("does not treat tiny striking-distance samples as actionable", () => {
    expect(hasActionableStrikingDistanceEvidence(9)).toBe(false);
    expect(hasActionableStrikingDistanceEvidence(10)).toBe(true);
  });

  it("does not promote current sub-10-impression striking-distance signals", () => {
    const seo = runCommercialPriorityEngine().allOpportunities.filter((item) => item.type === "STRIKING_DISTANCE_SEO");
    expect(seo.some((item) => item.target.includes("postmark"))).toBe(false);
    expect(seo.some((item) => item.target.includes("adobe-analytics-vs-segment"))).toBe(false);
  });
});
