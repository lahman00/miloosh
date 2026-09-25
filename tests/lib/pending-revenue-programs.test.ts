import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

describe("pending owner applications must not activate affiliate rendering", () => {
  it.each(["wordpress", "woocommerce", "activecampaign"])("%s stays official even with a stray catalog tracking field", slug => {
    const product = getSoftware(slug)!;
    expect(product).toBeDefined();
    expect(getActivePartner(slug)).toBeUndefined();
    const poisoned = { ...product, affiliateUrl: "https://unverified.invalid/never-use" };
    expect(getSoftwareCtaUrl(poisoned)).toBe(product.website);
    expect(getSoftwareCtaUrl(poisoned, "pricing")).toBe(product.website);
    expect(getSoftwareCtaRel(poisoned)).not.toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(poisoned)).toBe(false);
  });
});
