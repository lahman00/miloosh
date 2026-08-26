import { describe, expect, it } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";

describe("Jotform current affiliate truth", () => {
  it("records the submitted application as pending without inventing approval or a link", () => {
    const jotform = CURRENT_AFFILIATE_LEDGER.find((item) => item.programId === "jotform-affiliate");

    expect(jotform).toBeDefined();
    expect(jotform).toMatchObject({
      productSlugs: ["jotform"],
      status: "PENDING_REVIEW",
      applicationSubmittedAt: "2026-08-18",
      decisionAt: null,
      affiliateUrl: null,
      ownerBlocker: null,
      formBlocker: null,
    });
    expect(jotform!.commissionModel).toContain("30%");
    expect(jotform!.notes).toContain("Do not activate");
    expect(ACTIVE_PARTNER_SLUGS).not.toContain("jotform");
  });
});
