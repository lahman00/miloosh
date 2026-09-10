import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { resolveComparisonCtaUrl } from "@/lib/wix-funnels";
import { __test__ } from "@/app/api/outbound-click/route";
const { resolveVendorLinkUrl } = __test__;

/**
 * MILOOSH bridge task miloosh_task_001_jotform_pricing_deeplink (2026-08-31):
 * pricing-intent commercial CTAs now use Jotform's verified pricing deep
 * link instead of falling back to the homepage asset, via
 * ActivePartner.pricingAffiliateUrl and getSoftwareCtaUrl's optional
 * "pricing" intent parameter (lib/affiliate.ts). Every other Jotform
 * commercial surface, and every other partner (none of which have a
 * pricingAffiliateUrl on file), is unaffected -- the intent parameter is a
 * safe no-op fallback to the general affiliateUrl.
 */
const HOMEPAGE_URL = "https://www.jotform.com/?partner=miloosh";
const PRICING_URL = "https://www.jotform.com/pricing/?partner=miloosh";

describe("Jotform pricing-intent deep link", () => {
  const jotform = getSoftware("jotform")!;

  it("is registered with both the homepage and pricing-intent tracking assets", () => {
    expect(jotform).toBeDefined();
    const partner = getActivePartner("jotform");
    expect(partner?.affiliateUrl).toBe(HOMEPAGE_URL);
    expect(partner?.pricingAffiliateUrl).toBe(PRICING_URL);
  });

  it("main commercial CTA (no intent) resolves to the homepage affiliate URL, unchanged", () => {
    expect(getSoftwareCtaUrl(jotform)).toBe(HOMEPAGE_URL);
  });

  it("pricing commercial CTA (intent: pricing) resolves to the pricing-intent affiliate URL", () => {
    expect(getSoftwareCtaUrl(jotform, "pricing")).toBe(PRICING_URL);
  });

  it("rel and disclosure are unaffected by which intent-specific URL is used", () => {
    expect(getSoftwareCtaRel(jotform)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(jotform)).toBe(true);
  });

  it("compare-page-choose-card CTA (no pricing intent on that surface) still uses the homepage URL", () => {
    expect(resolveComparisonCtaUrl(jotform, "surveymonkey")).toBe(HOMEPAGE_URL);
  });

  it("editorial pricing/source links stay the plain official URL, never gain the affiliate parameter", () => {
    expect(jotform.sources).toContain("https://www.jotform.com/pricing/");
    for (const source of jotform.sources) {
      expect(source.startsWith("https://www.jotform.com")).toBe(true);
      expect(source).not.toContain("partner=miloosh");
    }
  });

  it("pricing intent is a safe no-op for every other partner (none have a pricingAffiliateUrl on file)", () => {
    const mailerlite = getSoftware("mailerlite")!;
    expect(getSoftwareCtaUrl(mailerlite)).toBe(getSoftwareCtaUrl(mailerlite, "pricing"));

    const surveymonkey = getSoftware("surveymonkey")!;
    expect(getSoftwareCtaUrl(surveymonkey)).toBe(getSoftwareCtaUrl(surveymonkey, "pricing"));
    expect(getSoftwareCtaUrl(surveymonkey, "pricing")).toBe("https://get.surveymonkey.com/tbaic7ngidg4");
  });

  it("surveymonkey-vs-jotform remains independently verified SurveyMonkey / Jotform affiliate", () => {
    const surveymonkey = getSoftware("surveymonkey")!;
    expect(resolveComparisonCtaUrl(surveymonkey, "jotform")).toBe("https://get.surveymonkey.com/tbaic7ngidg4");
    expect(resolveComparisonCtaUrl(jotform, "surveymonkey")).toBe(HOMEPAGE_URL);
    expect(getSoftwareCtaRel(surveymonkey)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(surveymonkey)).toBe(true);
  });

  it("pricing-source-link editorial surface resolves to the plain official pricing page, never the affiliate deep link", () => {
    expect(jotform.pricing?.officialSource).toBe("https://www.jotform.com/pricing/");
    expect(resolveVendorLinkUrl(jotform, "pricing-source-link")).toBe("https://www.jotform.com/pricing/");
    expect(resolveVendorLinkUrl(jotform, "pricing-source-link")).not.toBe(PRICING_URL);
    expect(resolveVendorLinkUrl(jotform, "pricing-source-link")).not.toBe(HOMEPAGE_URL);
  });
});
