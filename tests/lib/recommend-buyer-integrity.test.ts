import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getRecommendations, isDomainEligible } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";

describe("merchant eligibility and limited-input honesty", () => {
  it("Wix is eligible for commerce AND website building without special ranking", () => {
    const wix = getSoftware("wix")!;
    expect(isDomainEligible(wix, { ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform" })).toBe(true);
    expect(isDomainEligible(wix, { ...DEFAULT_ANSWERS, primaryNeed: "website_builder" })).toBe(true);
    expect(isDomainEligible(getSoftware("todoist")!, { ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform" })).toBe(false);
  });
  it("category-only is an eligible shortlist, not high-confidence personalized fit", () => {
    const result = getRecommendations({ ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform" });
    expect(result.confidence).toBe("low");
    expect(result.confidenceNote).toContain("alphabetically");
    expect(result.recommendations.every(r => !r.explanation.whyItMatched.includes("Best fit"))).toBe(true);
    expect(result.recommendations.every(r => r.explanation.tradeoff)).toBe(true);
  });
  it("industry and flexible budget alone do not fabricate discriminating evidence", () => {
    expect(getRecommendations({ ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform", industry: "merchant", budget: "flexible" }).confidence).toBe("low");
  });
});
