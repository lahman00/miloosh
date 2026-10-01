import { describe, expect, it } from "vitest";
import { INBOUND_AFFILIATE_OPPORTUNITIES } from "@/data/affiliate/inbound-opportunities";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getSoftware } from "@/data/software";

describe("inbound affiliate opportunities", () => {
  it("records Buddy Punch as terms review, not an accepted or active relationship", () => {
    const buddyPunch = INBOUND_AFFILIATE_OPPORTUNITIES.find((entry) => entry.vendorName === "Buddy Punch");
    expect(buddyPunch).toBeDefined();
    expect(buddyPunch?.status).toBe("TERMS_REVIEW");
    expect(buddyPunch?.acceptedAt).toBeNull();
    expect(buddyPunch?.affiliateUrl).toBeNull();
    expect(buddyPunch?.ownerAcceptanceRequired).toBe(true);
    expect(buddyPunch?.catalogSlug).toBeNull();
    expect(ACTIVE_PARTNERS.some((partner) => String(partner.slug) === "buddy-punch")).toBe(false);
  });

  it("closes the Trainual inbound opportunity once the first-party approval and exact asset are canonical", () => {
    const trainual = INBOUND_AFFILIATE_OPPORTUNITIES.find((entry) => entry.vendorName === "Trainual");
    expect(trainual).toBeDefined();
    expect(trainual?.status).toBe("CLOSED");
    expect(trainual?.acceptedAt).toBe("2026-09-30");
    expect(trainual?.affiliateUrl).toBe("https://start.trainual.com/0j9to92n49iy");
    expect(trainual?.ownerAcceptanceRequired).toBe(false);
    expect(trainual?.catalogSlug).toBe("trainual");
    expect(getSoftware("trainual")).toBeDefined();
    expect(trainual?.verifiedPublicEconomics).toContain("10% recurring commission");
    expect(trainual?.verifiedPublicEconomics).toContain("90-day cookie");
    expect(ACTIVE_PARTNERS.find((partner) => String(partner.slug) === "trainual")?.affiliateUrl).toBe(
      "https://start.trainual.com/0j9to92n49iy"
    );
  });
});
