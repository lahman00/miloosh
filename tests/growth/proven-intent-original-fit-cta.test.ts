import { describe, expect, it } from "vitest";
import {
  REVENUE_ALTERNATIVE_GUIDES,
  getAlternativeGuide,
} from "@/data/seo/alternative-guide-resolver";
import { getSoftware } from "@/data/software";
import {
  getSoftwareCtaRel,
  getSoftwareCtaUrl,
  shouldShowAffiliateDisclosure,
} from "@/lib/affiliate";

const EXPECTED = {
  krispcall: {
    ctaLabel: "View KrispCall plans",
    affiliateUrl: "https://try.krispcall.com/aikpbrrrl8k9",
  },
  whatconverts: {
    ctaLabel: "Start the 14-day WhatConverts trial",
    affiliateUrl: "https://partners.whatconverts.com/bmckzlf0vnl8",
  },
} as const;

describe("proven-intent original-product decision paths", () => {
  it("adds an honest keep-the-product route only to the two partners with first-party click activity", () => {
    const configured = Object.entries(REVENUE_ALTERNATIVE_GUIDES)
      .filter(([, guide]) => Boolean(guide.originalFit))
      .map(([slug]) => slug)
      .sort();

    expect(configured).toEqual(["krispcall", "whatconverts"]);
  });

  for (const [slug, expected] of Object.entries(EXPECTED)) {
    it(`keeps ${slug} on its exact verified affiliate destination`, () => {
      const guide = getAlternativeGuide(slug);
      const software = getSoftware(slug);

      expect(guide?.originalFit).toMatchObject({
        softwareSlug: slug,
        ctaLabel: expected.ctaLabel,
      });
      expect(software).toBeDefined();
      expect(getSoftwareCtaUrl(software!)).toBe(expected.affiliateUrl);
      expect(getSoftwareCtaRel(software!)).toBe("sponsored noopener noreferrer");
      expect(shouldShowAffiliateDisclosure(software!)).toBe(true);
    });
  }

  it("does not retrofit the original-fit affiliate block onto the historical GSC guide cohort", () => {
    expect(getAlternativeGuide("pipedrive")?.originalFit).toBeUndefined();
    expect(getAlternativeGuide("airtable")?.originalFit).toBeUndefined();
    expect(getAlternativeGuide("elevenlabs")?.originalFit).toBeUndefined();
  });
});
