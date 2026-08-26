import { describe, expect, it } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";

describe("Jotform current affiliate truth", () => {
  it("records verified approval while refusing to invent a tracking link or attribution window", () => {
    const jotform = CURRENT_AFFILIATE_LEDGER.find((item) => item.programId === "jotform-affiliate");

    expect(jotform).toBeDefined();
    expect(jotform).toMatchObject({
      productSlugs: ["jotform"],
      status: "APPROVED_NEEDS_LINK",
      applicationSubmittedAt: "2026-08-18",
      decisionAt: "2026-08-19",
      affiliateUrl: null,
      cookieWindow: null,
      ownerBlocker: null,
      formBlocker: null,
    });
    expect(jotform!.commissionModel).toContain("30%");
    expect(jotform!.commissionModel).toContain("60-day qualification period");
    expect(jotform!.evidence.join(" ")).toContain("Anna Scheucher");
    expect(jotform!.notes).toContain("do not activate");
    expect(jotform!.notes).toContain("not a verified attribution-cookie window");
    expect(ACTIVE_PARTNER_SLUGS).not.toContain("jotform");
  });
});
