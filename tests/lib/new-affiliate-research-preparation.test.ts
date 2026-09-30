import { describe, expect, it } from "vitest";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getSoftware } from "@/data/software";
import receipt from "@/docs/growth/receipts/20260930-new-affiliate-candidates/candidates.json";

describe("new publisher program research is not affiliate activation", () => {
  it.each(receipt.candidates)("$slug has a catalog home and one evidence-linked research entry", candidate => {
    expect(getSoftware(candidate.slug)).toBeDefined();
    const rows = AFFILIATE_PROGRAMS.filter(row => row.slug === candidate.slug);
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceUrls).toContain(candidate.source);
    expect(rows[0].notes).toContain("NOT SUBMITTED");
    expect(candidate.status).toBe("PREPARED_NOT_SUBMITTED");
    expect(candidate.approvalVerified).toBe(false);
    expect(candidate.issuedAffiliateUrl).toBeNull();
    // Receipt remains the original preparation snapshot. Later activation must
    // have independent first-party evidence, not be inferred from this receipt.
    const active = ACTIVE_PARTNERS.find(row => String(row.slug) === candidate.slug);
    if (active) {
      const current = CANONICAL_AFFILIATE_LEDGER.find(row => row.productSlugs.includes(candidate.slug) && row.status === "ACTIVE");
      expect(current?.affiliateUrl).toBe(active.affiliateUrl);
      expect(current?.evidence.some(source => source.includes("Gmail"))).toBe(true);
    }
  });
  it("does not invent missing commission terms or confuse payout basis", () => {
    expect(AFFILIATE_PROGRAMS.find(row => row.slug === "pandadoc")?.commissionModel).toBeNull();
    expect(AFFILIATE_PROGRAMS.find(row => row.slug === "aircall")?.recurrence).toBe("unknown");
    expect(AFFILIATE_PROGRAMS.find(row => row.slug === "remote")?.commissionModel).toContain("management fees");
    expect(AFFILIATE_PROGRAMS.find(row => row.slug === "gusto")?.recurrence).toBe("one_time");
  });
  it("keeps all existing active links intact", () => {
    expect(ACTIVE_PARTNERS).toHaveLength(24);
  });
});
