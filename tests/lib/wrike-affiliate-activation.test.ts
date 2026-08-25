import { describe, expect, it } from "vitest";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getAffiliateProgram } from "@/data/revenue/affiliate-programs";
import { getPayoutRailForPartner } from "@/data/affiliate/payout-rails";

describe("Wrike affiliate activation", () => {
  it("keeps Wrike active on the exact issued PartnerStack referral URL", () => {
    const partner = getActivePartner("wrike");
    expect(partner?.status).toBe("active");
    expect(partner?.affiliateUrl).toBe("https://get.wrike.com/wdgn8ok7i5ij");
    expect(partner?.blocker).toBeNull();
  });

  it("keeps the canonical relationship active without inventing undisclosed terms", () => {
    const relationship = CURRENT_AFFILIATE_LEDGER.find((entry) => entry.programId === "wrike");
    expect(relationship?.status).toBe("ACTIVE");
    expect(relationship?.affiliateUrl).toBe("https://get.wrike.com/wdgn8ok7i5ij");
    expect(relationship?.network).toBe("PartnerStack");
    expect(relationship?.cookieWindow).toBeNull();
  });

  it("records the first-party program evidence as high confidence", () => {
    const program = getAffiliateProgram("wrike");
    expect(program?.programExists).toBe("yes");
    expect(program?.networkName).toBe("PartnerStack");
    expect(program?.confidence).toBe("high");
    expect(program?.cookieDuration).toBeUndefined();
  });

  it("assigns Wrike to the actual PartnerStack account while keeping payout readiness unverified", () => {
    const rail = getPayoutRailForPartner("wrike");
    expect(rail.id).toBe("partnerstack-personal");
    expect(rail.accountIdentity).toBe("lahman00@gmail.com");
    expect(rail.readiness).toBe("UNVERIFIED");
  });
});
