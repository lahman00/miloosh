import { describe, expect, it } from "vitest";
import { ZOHO_ISSUED_ASSETS } from "@/data/affiliate/zoho-issued-assets";
import { CANONICAL_AFFILIATE_LEDGER, getRelationshipAffiliateUrl } from "@/data/affiliate/canonical-ledger";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getPayoutRailForPartner } from "@/data/affiliate/payout-rails";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl, shouldShowAffiliateDisclosure, getSoftwareCtaRel } from "@/lib/affiliate";

describe("Zoho product-specific portal assets", () => {
  const relationship = CANONICAL_AFFILIATE_LEDGER.find(p => p.programId === "zoho-ecosystem")!;
  it("keeps one program relationship and exactly six product mappings", () => {
    expect(relationship.status).toBe("ACTIVE");
    expect(Object.keys(relationship.productAffiliateUrls ?? {}).sort()).toEqual(ZOHO_ISSUED_ASSETS.map(a => a.slug).sort());
    expect(new Set(ZOHO_ISSUED_ASSETS.map(a => a.affiliateUrl)).size).toBe(6);
  });
  it.each(ZOHO_ISSUED_ASSETS)("uses the exact $slug asset for every commercial CTA", asset => {
    const software = getSoftware(asset.slug)!;
    expect(software).toBeDefined();
    expect(getRelationshipAffiliateUrl(relationship, asset.slug)).toBe(asset.affiliateUrl);
    expect(getActivePartner(asset.slug)?.allowAdditionalTrackingParams).toBe(false);
    expect(getSoftwareCtaUrl(software)).toBe(asset.affiliateUrl);
    expect(getSoftwareCtaUrl(software, "pricing")).toBe(asset.affiliateUrl);
    expect(shouldShowAffiliateDisclosure(software)).toBe(true);
    expect(getSoftwareCtaRel(software)).toBe("sponsored noopener noreferrer");
    expect(getPayoutRailForPartner(asset.slug).id).toBe("zoho-direct");
    expect(getPayoutRailForPartner(asset.slug).readiness).toBe("UNVERIFIED");
  });
  it("does not substitute a portfolio homepage for an absent product mapping", () => {
    expect(getRelationshipAffiliateUrl({ ...relationship, productAffiliateUrls: {} }, "zoho-crm")).toBeNull();
    expect(getRelationshipAffiliateUrl(relationship, "not-a-zoho-product")).toBeNull();
  });
});
