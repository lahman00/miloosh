import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import {
  generateComparisonIntro,
  generateComparisonMetaDescription,
  generateComparisonTitle,
} from "@/lib/comparison";

describe("Adobe Analytics vs Segment search-intent disambiguation", () => {
  const adobe = getSoftware("adobe-analytics")!;
  const segment = getSoftware("segment")!;
  const posthog = getSoftware("posthog")!;

  it("names Twilio Segment explicitly for the Adobe Analytics comparison", () => {
    expect(generateComparisonTitle(adobe, segment)).toBe("Adobe Analytics vs Twilio Segment");
    expect(generateComparisonMetaDescription(adobe, segment)).toContain("Twilio Segment");
    expect(generateComparisonIntro(adobe, segment)).toContain("Adobe Analytics and Twilio Segment");
  });

  it("does not rename Segment across unrelated comparisons", () => {
    expect(generateComparisonTitle(posthog, segment)).toBe("PostHog vs Segment");
  });
});
