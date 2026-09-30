import { describe, expect, it } from "vitest";
import { INBOUND_AFFILIATE_OPPORTUNITIES } from "@/data/affiliate/inbound-opportunities";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getSoftware } from "@/data/software";

describe("inbound affiliate opportunities", () => {
  it.each(["Cloro", "Catalister"])("records %s without manufacturing acceptance or a referral URL", name => {
    const opportunity = INBOUND_AFFILIATE_OPPORTUNITIES.find(item => item.vendorName === name);
    expect(opportunity?.status).toBe("TERMS_REVIEW");
    expect(opportunity?.acceptedAt).toBeNull();
    expect(opportunity?.affiliateUrl).toBeNull();
    expect(opportunity?.sourceEvidence.some(source => source.includes("Gmail"))).toBe(true);
  });
  it("records accepted MRPeasy without manufacturing a catalog page or public activation", () => {
    const opportunity = INBOUND_AFFILIATE_OPPORTUNITIES.find(item => item.vendorName === "MRPeasy");
    expect(opportunity?.status).toBe("ACCEPTED_NOT_ACTIVATED");
    expect(opportunity?.acceptedAt).toBe("2026-09-30");
    expect(opportunity?.affiliateUrl).toBe("https://try.mrpeasy.com/rlmf8edfjcie");
    expect(opportunity?.catalogSlug).toBeNull();
    expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === "mrpeasy")).toBe(false);
  });
  it("records accepted Buddy Punch without manufacturing a catalog page or public activation", () => {
    const buddyPunch = INBOUND_AFFILIATE_OPPORTUNITIES.find((entry) => entry.vendorName === "Buddy Punch");
    expect(buddyPunch).toBeDefined();
    expect(buddyPunch?.status).toBe("ACCEPTED_NOT_ACTIVATED");
    expect(buddyPunch?.acceptedAt).toBe("2026-09-30");
    expect(buddyPunch?.affiliateUrl).toBe("https://try.buddypunch.com/8nzdz9riy7v0");
    expect(buddyPunch?.ownerAcceptanceRequired).toBe(false);
    expect(buddyPunch?.catalogSlug).toBeNull();
    expect(ACTIVE_PARTNERS.some((partner) => String(partner.slug) === "buddy-punch")).toBe(false);
  });

  it("closes the Trainual intake only after first-party approval and an exact issued asset", () => {
    const trainual = INBOUND_AFFILIATE_OPPORTUNITIES.find((entry) => entry.vendorName === "Trainual");
    expect(trainual).toBeDefined();
    expect(trainual?.status).toBe("CLOSED");
    expect(trainual?.acceptedAt).toBe("2026-09-30");
    expect(trainual?.affiliateUrl).toBe("https://start.trainual.com/0j9to92n49iy");
    expect(trainual?.ownerAcceptanceRequired).toBe(false);
    expect(trainual?.catalogSlug).toBe("trainual");
    expect(getSoftware("trainual")).toBeDefined();
    expect(trainual?.headlineOffer).toContain("private assigned tier remains unverified");
    expect(trainual?.verifiedPublicEconomics).toContain("10% recurring baseline");
    expect(trainual?.verifiedPublicEconomics).toContain("90-day cookie");
    expect(ACTIVE_PARTNERS.find(partner => partner.slug === "trainual")?.affiliateUrl).toBe(
      "https://start.trainual.com/0j9to92n49iy",
    );
  });
});
