import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNERS, getActivePartner } from "@/data/affiliate/active-partners";
import { getPartnerMoneyMatrix } from "@/data/affiliate/money-matrix";
import { PAYOUT_RAILS } from "@/data/affiliate/payout-rails";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { getAffiliateActivation } from "@/lib/revenue/affiliate-manager";

describe("canonical active affiliate partner registry", () => {
  it("contains a unique row for every verified active partner", () => {
    expect(new Set(ACTIVE_PARTNERS.map(({ slug }) => slug)).size).toBe(ACTIVE_PARTNERS.length);
  });

  it.each(ACTIVE_PARTNERS.filter((partner) => partner.affiliateUrl))(
    "$slug resolves its CTA, sponsored rel, and disclosure from the registry",
    (partner) => {
      const software = getSoftware(partner.slug);
      expect(software).toBeDefined();
      expect(getSoftwareCtaUrl(software!)).toBe(partner.affiliateUrl);
      expect(getSoftwareCtaRel(software!)).toBe("sponsored noopener noreferrer");
      expect(shouldShowAffiliateDisclosure(software!)).toBe(true);
    },
  );

  it("every catalog affiliateUrl belongs to an active partner and exactly matches the canonical URL", () => {
    for (const software of getAllSoftware().filter((item) => Boolean(item.affiliateUrl))) {
      const partner = getActivePartner(software.slug);
      expect(partner, `${software.slug} has software.affiliateUrl but is not an active partner`).toBeDefined();
      expect(software.affiliateUrl).toBe(partner!.affiliateUrl);
    }
  });

  it("Brevo (REJECTED) is not in the canonical registry and gets only its official link", () => {
    const slugs: readonly string[] = ACTIVE_PARTNERS.map(({ slug }) => slug);
    const software = getSoftware("brevo")!;
    expect(slugs).not.toContain("brevo");
    expect(getSoftwareCtaUrl(software)).toBe(software.website);
    expect(getSoftwareCtaRel(software)).toBe("noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(software)).toBe(false);
  });

  it("Miro (HOLD / UNCLEAR) is not in the canonical registry and gets only its official link", () => {
    const slugs: readonly string[] = ACTIVE_PARTNERS.map(({ slug }) => slug);
    const software = getSoftware("miro")!;
    expect(slugs).not.toContain("miro");
    expect(software.affiliateUrl).toBeUndefined();
    expect(getSoftwareCtaUrl(software)).toBe(software.website);
    expect(getSoftwareCtaRel(software)).toBe("noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(software)).toBe(false);
  });

  it("separates technical affiliate readiness from end-to-end payout readiness", () => {
    const matrix = getPartnerMoneyMatrix();
    const verifiedPayoutPartners = new Set(
      PAYOUT_RAILS.filter((rail) => rail.readiness === "VERIFIED").flatMap((rail) => rail.partnerSlugs),
    );

    expect(matrix).toHaveLength(ACTIVE_PARTNERS.length);
    expect(matrix.every(({ technicalPathReady }) => technicalPathReady)).toBe(true);
    expect(matrix.filter(({ revenueReady }) => revenueReady).map(({ slug }) => slug).sort()).toEqual(
      [...verifiedPayoutPartners].sort(),
    );

    for (const row of matrix) {
      expect(row.revenueReady).toBe(row.technicalPathReady && row.payoutReadiness === "VERIFIED");
    }
  });

  it("does not call current unverified payout rails end-to-end revenue ready", () => {
    const matrix = getPartnerMoneyMatrix();
    expect(matrix.find(({ slug }) => slug === "krispcall")).toMatchObject({
      url: "https://try.krispcall.com/aikpbrrrl8k9",
      technicalPathReady: true,
      payoutReadiness: "UNVERIFIED",
      revenueReady: false,
    });
    expect(matrix.find(({ slug }) => slug === "setmore")).toMatchObject({
      technicalPathReady: true,
      payoutReadiness: "OWNER_ACTION_REQUIRED",
      revenueReady: false,
    });
  });

  it("no active partner is reported as not activated by the combined maintenance check", () => {
    for (const partner of ACTIVE_PARTNERS) {
      const activation = getAffiliateActivation(partner.slug);
      const isActive = activation.isActive || Boolean(getActivePartner(partner.slug)?.affiliateUrl);
      expect(isActive, `${partner.slug} is in ACTIVE_PARTNERS but neither activation mechanism reports it active`).toBe(true);
    }
  });
});
