import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";

const ecwid = getSoftware("ecwid")!;

describe("Ecwid pricing route integrity", () => {
  it("uses the current direct-plan lineup without reviving the old generic free plan", () => {
    expect(ecwid.pricing?.status).toBe("verified");
    expect(ecwid.pricing?.entryPaid).toMatchObject({ amount: "5", currency: "USD", billingPeriod: "monthly", annualBillingRequired: false });
    expect(ecwid.pricing?.hasFreeTier).toBe(false);
    expect(ecwid.pricing?.freePlan).toBe(false);
    expect(ecwid.pricing?.tiers?.map((tier) => tier.name)).toEqual(["Starter", "Venture", "Business", "Unlimited"]);
  });

  it("records current monthly USD amounts only where the official change notice supplies them", () => {
    const tiers = Object.fromEntries((ecwid.pricing?.tiers ?? []).map((tier) => [tier.name, tier]));
    expect(tiers.Starter?.amount).toBe("5");
    expect(tiers.Venture?.amount).toBe("35");
    expect(tiers.Business?.amount).toBe("65");
    expect(tiers.Unlimited?.amount).toBe("149");
    expect(JSON.stringify(ecwid.pricing)).not.toMatch(/14\.08|29\.08|82\.50/);
  });

  it("keeps the Wix signup exception explicit rather than treating it as the default Ecwid plan", () => {
    expect(ecwid.pricing?.startingPrice).toContain("$5 USD/month");
    expect(ecwid.pricing?.startingPrice).toContain("Wix signups");
    expect((ecwid.cons ?? []).join(" ")).toContain("separate plan lineup");
    expect(ecwid.sources).toContain("https://support.ecwid.com/hc/en-us/articles/207808335-Ecwid-plans-and-features-for-Wix");
  });
});
