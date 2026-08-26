import { describe, expect, it } from "vitest";
import { getAlternativeGuide } from "@/data/seo/alternative-guides";
import { isPublishedComparison } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaRel, getSoftwareCtaUrl } from "@/lib/affiliate";

describe("WhatConverts decision guide", () => {
  it("routes three distinct measurement jobs through existing, published comparisons", () => {
    const guide = getAlternativeGuide("whatconverts");

    expect(guide).toBeDefined();
    expect(guide?.heading).toBe("Choose a lead-attribution alternative by measurement scope");
    expect(guide?.decisions.map((decision) => decision.alternativeSlug)).toEqual([
      "callrail",
      "ruler-analytics",
      "hubspot",
    ]);
    expect(guide?.decisions.map((decision) => decision.comparisonSlug)).toEqual([
      "whatconverts-vs-callrail",
      "whatconverts-vs-ruler-analytics",
      "whatconverts-vs-hubspot",
    ]);

    for (const decision of guide!.decisions) {
      expect(getSoftware(decision.alternativeSlug)).toBeDefined();
      const [left, right] = decision.comparisonSlug.split("-vs-");
      expect(isPublishedComparison(left!, right!)).toBe(true);
    }
  });

  it("preserves the existing revenue and GSC-backed decision guides", () => {
    expect(getAlternativeGuide("krispcall")?.decisions).toHaveLength(3);
    expect(getAlternativeGuide("elevenlabs")?.decisions).toHaveLength(3);
  });

  it("preserves editorial alternatives and uses affiliate treatment only for WhatConverts", () => {
    const whatconverts = getSoftware("whatconverts");
    const callrail = getSoftware("callrail");
    const ruler = getSoftware("ruler-analytics");
    const hubspot = getSoftware("hubspot");

    expect(whatconverts?.alternatives.map((alternative) => alternative.slug)).toEqual([
      "callrail",
      "ruler-analytics",
      "hubspot",
    ]);
    expect(getSoftwareCtaUrl(whatconverts!)).toBe("https://partners.whatconverts.com/bmckzlf0vnl8");
    expect(getSoftwareCtaRel(whatconverts!)).toBe("sponsored noopener noreferrer");

    for (const competitor of [callrail!, ruler!, hubspot!]) {
      expect(getSoftwareCtaUrl(competitor)).toBe(competitor.website);
      expect(getSoftwareCtaRel(competitor)).toBe("noopener noreferrer");
    }
  });
});
