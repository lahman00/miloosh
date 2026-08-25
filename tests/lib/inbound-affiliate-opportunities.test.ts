import { describe, expect, it } from "vitest";
import { INBOUND_AFFILIATE_OPPORTUNITIES } from "@/data/affiliate/inbound-opportunities";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

describe("inbound affiliate opportunities", () => {
  it("records Buddy Punch as terms review, not an accepted or active relationship", () => {
    const buddyPunch = INBOUND_AFFILIATE_OPPORTUNITIES.find((entry) => entry.vendorName === "Buddy Punch");
    expect(buddyPunch).toBeDefined();
    expect(buddyPunch?.status).toBe("TERMS_REVIEW");
    expect(buddyPunch?.acceptedAt).toBeNull();
    expect(buddyPunch?.affiliateUrl).toBeNull();
    expect(buddyPunch?.ownerAcceptanceRequired).toBe(true);
    expect(buddyPunch?.catalogSlug).toBeNull();
    expect(ACTIVE_PARTNERS.some((partner) => partner.slug === "buddy-punch")).toBe(false);
  });
});
