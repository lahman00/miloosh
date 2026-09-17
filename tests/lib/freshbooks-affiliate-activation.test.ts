import { getPartnerMoneyMatrix } from "@/data/affiliate/money-matrix";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

const issuedUrl = "https://partner.freshbooks.com/gg7ovvifr1bd";
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_AFFILIATE_REF", ""));
afterEach(() => vi.unstubAllEnvs());

describe("FreshBooks email-backed activation on 2026-09-17", () => {
  it("uses the exact account-specific asset in both relationship ledgers", () => {
    for (const ledger of [CANONICAL_AFFILIATE_LEDGER, CURRENT_AFFILIATE_LEDGER]) {
      const relation = ledger.find(p => p.programId === "freshbooks");
      expect(relation?.status).toBe("ACTIVE");
      expect(relation?.decisionAt).toBe("2026-09-15");
      expect(relation?.affiliateUrl).toBe(issuedUrl);
      expect(relation?.evidence.join(" ")).toContain("1a0a27bf25150cef");
    }
    expect(getActivePartner("freshbooks")?.affiliateUrl).toBe(issuedUrl);
  });
  it("keeps commercial links sponsored and disclosure visible", () => {
    const software = getSoftware("freshbooks");
    expect(software).toBeDefined();
    expect(getSoftwareCtaUrl(software!)).toBe(issuedUrl);
    expect(getSoftwareCtaUrl(software!, "pricing")).toBe(issuedUrl);
    expect(getSoftwareCtaRel(software!)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(software!)).toBe(true);
  });
  it("does not mistake referral approval for verified payouts or recurring revenue", () => {
    const relation = CURRENT_AFFILIATE_LEDGER.find(p => p.programId === "freshbooks")!;
    expect(relation.notes).toMatch(/payout.*unverified/i);
    const moneyRow = getPartnerMoneyMatrix().find(row => row.slug === "freshbooks")!;
    expect(moneyRow.technicalPathReady).toBe(true);
    expect(moneyRow.payoutReadiness).toBe("UNVERIFIED");
    expect(moneyRow.revenueReady).toBe(false);
    expect(relation.commissionModel).toBe("$10/qualified free trial, up to $200/paid plan");
    expect(relation.commissionModel).not.toMatch(/recurring|monthly/i);
  });
});
