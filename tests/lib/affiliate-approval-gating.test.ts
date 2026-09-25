import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { NETWORK_PERFORMANCE_SIGNALS } from "@/data/affiliate/network-performance-signals";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

const byId = (programId: string) =>
  CURRENT_AFFILIATE_LEDGER.find((relationship) => relationship.programId === programId);

const activeSlugs = new Set<string>(ACTIVE_PARTNERS.map(({ slug }) => slug));
const activeLedgerSlugs = new Set(
  CURRENT_AFFILIATE_LEDGER.filter((row) => row.status === "ACTIVE").flatMap((row) => row.productSlugs),
);

describe("affiliate approval gating (pending is never approval)", () => {
  it("records the ActiveCampaign re-application as pending, retaining the first decline as history", () => {
    const activecampaign = byId("activecampaign");
    expect(activecampaign?.status).toBe("PENDING_REVIEW");
    expect(activecampaign?.decisionAt).toBeNull();
    expect(activecampaign?.affiliateUrl).toBeNull();
    expect(activecampaign?.evidence.join(" ")).toMatch(/2026-08-20.*declined/);
  });

  it("records Automattic as in review for WooCommerce only, outside the generic Impact bucket", () => {
    const automattic = byId("automattic");
    expect(automattic?.status).toBe("PENDING_REVIEW");
    expect(automattic?.decisionAt).toBeNull();
    expect(automattic?.affiliateUrl).toBeNull();
    expect(automattic?.productSlugs).toEqual(["woocommerce"]);
    expect(byId("impact-portfolio")?.productSlugs).not.toContain("woocommerce");
  });

  it("maps every product slug to at most one current relationship", () => {
    const seen = new Map<string, string>();
    for (const row of CURRENT_AFFILIATE_LEDGER) {
      for (const slug of row.productSlugs) {
        expect(seen.get(slug), `${slug} is claimed by ${seen.get(slug)} and ${row.programId}`).toBeUndefined();
        seen.set(slug, row.programId);
      }
    }
  });

  it("never renders an affiliate CTA, sponsored rel or disclosure for a non-ACTIVE relationship", () => {
    const gated = CURRENT_AFFILIATE_LEDGER.filter((row) => row.status !== "ACTIVE")
      .flatMap((row) => row.productSlugs)
      .filter((slug) => !activeLedgerSlugs.has(slug));

    for (const slug of ["activecampaign", "woocommerce", "wordpress", ...gated]) {
      expect(activeSlugs.has(slug), `${slug} is in ACTIVE_PARTNERS without an ACTIVE relationship`).toBe(false);
      const software = getSoftware(slug);
      if (!software) continue;
      expect(getSoftwareCtaUrl(software), `${slug} CTA`).toBe(software.website);
      expect(getSoftwareCtaUrl(software, "pricing"), `${slug} pricing CTA`).toBe(software.website);
      expect(getSoftwareCtaRel(software), `${slug} rel`).not.toContain("sponsored");
      expect(shouldShowAffiliateDisclosure(software), `${slug} disclosure`).toBe(false);
    }
  });

  it("keeps every catalog affiliateUrl identical to its active registry URL", () => {
    for (const software of getAllSoftware()) {
      if (!software.affiliateUrl) continue;
      const partner = ACTIVE_PARTNERS.find(({ slug }) => slug === software.slug);
      expect(partner?.affiliateUrl, `${software.slug} catalog affiliateUrl without matching active partner`).toBe(
        software.affiliateUrl,
      );
    }
  });

  it("never lets a network signal claim a conversion or revenue", () => {
    for (const signal of NETWORK_PERFORMANCE_SIGNALS) {
      expect(signal.provesConversion).toBe(false);
      expect(signal.provesRevenue).toBe(false);
    }
  });
});
