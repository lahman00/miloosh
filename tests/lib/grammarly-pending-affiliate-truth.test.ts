import { describe, expect, it } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";

describe("Grammarly current affiliate truth", () => {
  it("carves the submitted Creator application out of the generic Impact portfolio", () => {
    const grammarly = CURRENT_AFFILIATE_LEDGER.find((item) => item.programId === "grammarly-creator");
    const impactPortfolio = CURRENT_AFFILIATE_LEDGER.find((item) => item.programId === "impact-portfolio");

    expect(grammarly).toBeDefined();
    expect(grammarly).toMatchObject({
      productSlugs: ["grammarly"],
      status: "PENDING_REVIEW",
      applicationSubmittedAt: "2026-08-19",
      decisionAt: null,
      affiliateUrl: null,
      ownerBlocker: null,
      formBlocker: null,
    });
    expect(grammarly!.commissionModel).toContain("exact commission is not recorded");
    expect(impactPortfolio?.productSlugs).not.toContain("grammarly");
    expect(ACTIVE_PARTNER_SLUGS).not.toContain("grammarly");
  });
});
