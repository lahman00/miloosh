import { describe, expect, it } from "vitest";
import { getPartnerMoneyMatrix } from "@/data/affiliate/money-matrix";
import { PAYOUT_RAILS } from "@/data/affiliate/payout-rails";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

const matrix = getPartnerMoneyMatrix();

describe("affiliate money matrix readiness semantics", () => {
  it("covers every active partner exactly once", () => {
    expect(matrix).toHaveLength(ACTIVE_PARTNERS.length);
    expect(new Set(matrix.map((row) => row.slug)).size).toBe(matrix.length);
    expect(new Set(matrix.map((row) => row.slug))).toEqual(new Set(ACTIVE_PARTNERS.map((partner) => partner.slug)));
  });

  it("does not call a working technical CTA end-to-end revenue ready while its payout profile is unverified", () => {
    for (const row of matrix) {
      if (row.technicalPathReady && row.payoutReadiness !== "VERIFIED") {
        expect(row.revenueReady).toBe(false);
        expect(row.blocker).toMatch(/payout/i);
      }
    }
  });

  it("derives payout readiness from the canonical account-level payout profiles", () => {
    const readinessByPartner = new Map(
      PAYOUT_RAILS.flatMap((rail) => rail.partnerSlugs.map((slug) => [String(slug), rail.readiness] as const)),
    );
    for (const row of matrix) {
      expect(row.payoutReadiness).toBe(readinessByPartner.get(row.slug));
    }
  });

  it("keeps every active partner's technical CTA path ready (URL, rel, disclosure)", () => {
    for (const row of matrix) {
      expect(row.technicalPathReady, `${row.slug}: technical path not ready -- ${row.blocker}`).toBe(true);
    }
  });

  it("never lets the resolved CTA URL drift from the canonical active-partner registry URL", () => {
    for (const partner of ACTIVE_PARTNERS) {
      const software = getSoftware(partner.slug);
      expect(software, `${partner.slug}: no software record`).toBeDefined();
      const resolvedUrl = getSoftwareCtaUrl(software!);
      expect(resolvedUrl.startsWith(partner.affiliateUrl!)).toBe(true);
      expect(getSoftwareCtaRel(software!)).toBe("sponsored noopener noreferrer");
      expect(shouldShowAffiliateDisclosure(software!)).toBe(true);
    }
  });

  it("resolves the exact verified tracking URL for the highest-priority audited partners", () => {
    const expected: Record<string, string> = {
      wrike: "https://get.wrike.com/wdgn8ok7i5ij",
      pipedrive: "https://aff.trypipedrive.com/ajtcgyu06e7i",
      monday: "https://try.monday.com/1p2fpizulcj7",
      getresponse: "https://try.getresponsetoday.com/5op8zmw94gq1",
      close: "https://refer.close.com/0alqdg4so8rm",
      airtable: "https://airtable.partnerlinks.io/b0dz88v48tek",
      shopify: "https://shopify.pxf.io/L0EG9O",
      wix: "https://wix.pxf.io/c/7623171/2096727/25616?trafcat=wsb",
      omnisend: "https://your.omnisend.com/PznLej",
      mailerlite: "https://www.mailerlite.com/?linkId=lp_170762&sourceId=eyal-haimovich&tenantId=mailerlite",
      jotform: "https://www.jotform.com/?partner=miloosh",
    };
    for (const [slug, url] of Object.entries(expected)) {
      const software = getSoftware(slug);
      expect(software, `${slug}: no software record`).toBeDefined();
      expect(getSoftwareCtaUrl(software!)).toBe(url);
    }
  });
});
