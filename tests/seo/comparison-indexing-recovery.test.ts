import { describe, expect, it } from "vitest";
import { getComparisonRobotsMetadata } from "@/data/seo/comparison-indexing";

describe("comparison indexation recovery policy", () => {
  it("noindexes historical zero-signal comparisons while keeping links followable", () => {
    expect(getComparisonRobotsMetadata("hubspot-vs-pipedrive")).toEqual({
      index: false,
      follow: true,
    });
  });

  it("keeps an explicit priority override indexable", () => {
    expect(getComparisonRobotsMetadata("shopify-vs-woocommerce")).toBeUndefined();
  });

  it("keeps a comparison with current search evidence indexable", () => {
    expect(getComparisonRobotsMetadata("adobe-analytics-vs-segment")).toBeUndefined();
  });
});
