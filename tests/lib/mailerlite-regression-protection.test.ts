import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { resolveComparisonCtaUrl } from "@/lib/wix-funnels";
import { __test__ } from "@/app/api/outbound-click/route";
const { resolveVendorLinkUrl } = __test__;

/**
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) Task 3 -- production
 * was manually verified today at /software/mailerlite,
 * /compare/mailerlite-vs-moosend, /compare/mailerlite-vs-getresponse, and
 * /compare/mailerlite-vs-brevo, all resolving to the exact verified
 * MailerLite URL. This file locks that in explicitly by name (not just
 * generically, via the "every ACTIVE_PARTNERS entry" loop in
 * affiliate-integrity.test.ts's Invariant 14) so a future change can't
 * silently regress MailerLite specifically without a named test failing.
 *
 * Every commercial CTA surface (software page, pricing section, compare
 * page choose-card) renders through the same three functions checked
 * below -- confirmed by reading components/TrackedCtaLink.tsx,
 * app/compare/[comparison]/page.tsx's ComparisonChoiceCta, and
 * lib/wix-funnels.ts's resolveComparisonCtaUrl (a pass-through to
 * getSoftwareCtaUrl for every non-Wix product, MailerLite included) --
 * there is no separate per-surface resolution path to regress
 * independently, so testing the shared resolver by name covers all of
 * them at once. "Compare summary" is not a distinct tracked CTA surface
 * in this codebase (ComparisonTable renders no links at all) -- the two
 * real commercial surfaces on a compare page are the top-of-page CTA
 * (software-page-cta, shared with the standalone software page) and the
 * choose-card (compare-page-choose-card, tested explicitly below).
 */
const VERIFIED_MAILERLITE_URL = "https://www.mailerlite.com/?linkId=lp_170762&sourceId=eyal-haimovich&tenantId=mailerlite";

describe("MailerLite regression protection", () => {
  const mailerlite = getSoftware("mailerlite")!;

  it("is registered as the exact verified active-partner URL, unchanged", () => {
    expect(mailerlite).toBeDefined();
    expect(getActivePartner("mailerlite")?.affiliateUrl).toBe(VERIFIED_MAILERLITE_URL);
  });

  it("main commercial CTA (software-page-cta / pricing-section-cta, same resolver) resolves to the verified URL", () => {
    expect(getSoftwareCtaUrl(mailerlite)).toBe(VERIFIED_MAILERLITE_URL);
  });

  it("compare-page-choose-card CTA resolves to the verified URL for every one of the three manually-checked pairings", () => {
    for (const otherSlug of ["moosend", "getresponse", "brevo"]) {
      expect(resolveComparisonCtaUrl(mailerlite, otherSlug), `mailerlite vs ${otherSlug}`).toBe(VERIFIED_MAILERLITE_URL);
    }
  });

  it("rel includes sponsored and the affiliate disclosure renders", () => {
    expect(getSoftwareCtaRel(mailerlite)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(mailerlite)).toBe(true);
  });

  it("editorial source/pricing links stay official first-party URLs, never the affiliate link", () => {
    expect(resolveVendorLinkUrl(mailerlite, "pricing-source-link")).toBe(mailerlite.pricing?.officialSource);
    expect(resolveVendorLinkUrl(mailerlite, "pricing-source-link")).not.toBe(VERIFIED_MAILERLITE_URL);
    for (const source of mailerlite.sources) {
      expect(source.startsWith("https://www.mailerlite.com")).toBe(true);
      expect(source).not.toBe(VERIFIED_MAILERLITE_URL);
    }
  });
});
