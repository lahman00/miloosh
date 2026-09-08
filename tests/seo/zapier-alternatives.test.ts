import { describe, expect, it } from "vitest";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { isPublishedComparison } from "@/data/comparisons";

describe("Zapier alternatives search-intent coverage", () => {
  it("routes the decision through three distinct, published comparisons", () => {
    const guide = ALTERNATIVE_GUIDES.zapier;
    expect(guide).toBeDefined();
    expect(guide.decisions.map((item) => item.alternativeSlug)).toEqual(["make", "n8n", "zoho-flow"]);
    for (const item of guide.decisions) {
      const [a, b] = item.comparisonSlug.split("-vs-");
      expect(isPublishedComparison(a!, b!)).toBe(true);
    }
  });

  it("keeps the decision grounded in first-party product evidence", () => {
    const guide = ALTERNATIVE_GUIDES.zapier;
    expect(guide.evidenceSources.some((url) => url.includes("zapier.com"))).toBe(true);
    expect(guide.evidenceSources.some((url) => url.includes("make.com"))).toBe(true);
    expect(guide.evidenceSources.some((url) => url.includes("n8n.io"))).toBe(true);
    expect(guide.evidenceSources.some((url) => url.includes("zoho.com"))).toBe(true);
  });
});
