import { describe, expect, it } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ACTIVE_PARTNER_SLUGS, getActivePartner } from "@/data/affiliate/active-partners";

describe("Jotform current affiliate truth", () => {
  it("activates only the vendor-issued Miloosh tracking URL while keeping unknown attribution unknown", () => {
    const jotform = CURRENT_AFFILIATE_LEDGER.find((item) => item.programId === "jotform-affiliate");

    expect(jotform).toBeDefined();
    expect(jotform).toMatchObject({
      productSlugs: ["jotform"],
      status: "ACTIVE",
      applicationSubmittedAt: "2026-08-18",
      decisionAt: "2026-08-19",
      affiliateUrl: "https://www.jotform.com/?partner=miloosh",
      cookieWindow: null,
      ownerBlocker: null,
      formBlocker: null,
    });
    expect(jotform!.commissionModel).toContain("30%");
    expect(jotform!.commissionModel).toContain("60-day qualification period");
    expect(jotform!.evidence.join(" ")).toContain("Anna Scheucher");
    expect(jotform!.evidence.join(" ")).toContain("https://www.jotform.com/pricing/?partner=miloosh");
    expect(jotform!.notes).toContain("not a verified attribution-cookie window");
    expect(ACTIVE_PARTNER_SLUGS).toContain("jotform");
    expect(getActivePartner("jotform")?.affiliateUrl).toBe("https://www.jotform.com/?partner=miloosh");
  });
});
