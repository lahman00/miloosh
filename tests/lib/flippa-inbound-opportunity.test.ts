import { describe, expect, it } from "vitest";
import { INBOUND_AFFILIATE_OPPORTUNITIES } from "@/data/affiliate/inbound-opportunities";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";

describe("Flippa inbound opportunity", () => {
  it("keeps the conflicting direct invitation in terms review rather than active truth", () => {
    const flippa = INBOUND_AFFILIATE_OPPORTUNITIES.find((item) => item.id === "flippa-2026-08-21");

    expect(flippa).toBeDefined();
    expect(flippa).toMatchObject({
      vendorName: "Flippa",
      catalogSlug: null,
      network: "PartnerStack",
      status: "TERMS_REVIEW",
      affiliateUrl: null,
      acceptedAt: null,
      ownerAcceptanceRequired: true,
    });
    expect(flippa!.headlineOffer).toContain("20%");
    expect(flippa!.verifiedPublicEconomics).toContain("15%");
    expect(flippa!.nextAction).toContain("Do not accept");
    expect(ACTIVE_PARTNER_SLUGS).not.toContain("flippa");
  });
});
