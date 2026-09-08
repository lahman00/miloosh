import { describe, expect, it } from "vitest";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { isPublishedComparison } from "@/data/comparisons";

describe("n8n alternatives search-intent coverage", () => {
  it("uses the three existing automation comparisons without creating a new pair", () => {
    const guide = ALTERNATIVE_GUIDES.n8n;
    expect(guide).toBeDefined();
    expect(guide.decisions.map((item) => item.alternativeSlug)).toEqual(["zapier", "make", "zoho-flow"]);
    for (const item of guide.decisions) {
      const [a, b] = item.comparisonSlug.split("-vs-");
      expect(isPublishedComparison(a!, b!)).toBe(true);
    }
  });

  it("anchors technical-control claims in current first-party sources", () => {
    const guide = ALTERNATIVE_GUIDES.n8n;
    expect(guide.evidenceSources.some((url) => url.includes("n8n.io"))).toBe(true);
    expect(guide.evidenceSources.every((url) => !/g2|capterra|reddit/i.test(url))).toBe(true);
  });
});
