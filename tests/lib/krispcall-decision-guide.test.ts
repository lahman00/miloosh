import { describe, expect, it } from "vitest";
import { getAlternativeGuide } from "@/data/seo/alternative-guide-resolver";
import { isPublishedComparison } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaRel, getSoftwareCtaUrl } from "@/lib/affiliate";

describe("KrispCall decision guide", () => {
  it("routes three distinct buyer jobs through existing, published comparisons", () => {
    const guide = getAlternativeGuide("krispcall");

    expect(guide).toBeDefined();
    expect(guide?.decisions.map((decision) => decision.alternativeSlug)).toEqual([
      "dialpad",
      "ringcentral",
      "nextiva",
    ]);
    expect(guide?.decisions.map((decision) => decision.comparisonSlug)).toEqual([
      "krispcall-vs-dialpad",
      "krispcall-vs-ringcentral",
      "krispcall-vs-nextiva",
    ]);

    for (const decision of guide!.decisions) {
      expect(getSoftware(decision.alternativeSlug)).toBeDefined();
      const [left, right] = decision.comparisonSlug.split("-vs-");
      expect(isPublishedComparison(left!, right!)).toBe(true);
    }
  });

  it("preserves the existing guide cohort through the resolver", () => {
    expect(getAlternativeGuide("elevenlabs")?.decisions).toHaveLength(3);
  });

  it("does not change editorial alternatives or fabricate affiliate links for competitors", () => {
    const krispcall = getSoftware("krispcall");
    const dialpad = getSoftware("dialpad");
    const ringcentral = getSoftware("ringcentral");
    const nextiva = getSoftware("nextiva");

    expect(krispcall?.alternatives.map((alternative) => alternative.slug)).toEqual([
      "dialpad",
      "ringcentral",
      "nextiva",
    ]);
    expect(getSoftwareCtaUrl(krispcall!)).toBe("https://try.krispcall.com/aikpbrrrl8k9");
    expect(getSoftwareCtaRel(krispcall!)).toBe("sponsored noopener noreferrer");
    for (const competitor of [dialpad!, ringcentral!, nextiva!]) {
      expect(getSoftwareCtaUrl(competitor)).toBe(competitor.website);
      expect(getSoftwareCtaRel(competitor)).toBe("noopener noreferrer");
    }
  });
});
