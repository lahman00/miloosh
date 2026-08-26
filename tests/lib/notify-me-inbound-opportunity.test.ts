import { describe, expect, it } from "vitest";
import { INBOUND_AFFILIATE_OPPORTUNITIES } from "@/data/affiliate/inbound-opportunities";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";

describe("Notify Me inbound opportunity", () => {
  it("records the stale 20% invitation against the newer public 50%-then-25% economics without activating it", () => {
    const notifyMe = INBOUND_AFFILIATE_OPPORTUNITIES.find((item) => item.id === "notify-me-2026-08-19");

    expect(notifyMe).toBeDefined();
    expect(notifyMe).toMatchObject({
      vendorName: "Notify Me",
      catalogSlug: null,
      network: "PartnerStack",
      status: "TERMS_REVIEW",
      affiliateUrl: null,
      acceptedAt: null,
      ownerAcceptanceRequired: true,
    });
    expect(notifyMe!.headlineOffer).toContain("20%");
    expect(notifyMe!.verifiedPublicEconomics).toContain("50%");
    expect(notifyMe!.verifiedPublicEconomics).toContain("25%");
    expect(notifyMe!.nextAction).toContain("Do not accept");
    expect(ACTIVE_PARTNER_SLUGS).not.toContain("notify-me");
  });
});
