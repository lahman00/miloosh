import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";

const shopify = getSoftware("shopify")!;

describe("Shopify pricing model integrity", () => {
  it("records the documented paid subscription model rather than an unknown placeholder", () => {
    expect(shopify.pricing?.model).toBe("paid");
    expect(shopify.pricing?.freePlan).toBe(false);
    expect(shopify.pricing?.entryPaid).toMatchObject({
      amount: "29",
      currency: "USD",
      billingPeriod: "monthly",
      annualBillingRequired: true,
    });
  });

  it("keeps the current official pricing page on the pricing contract", () => {
    expect(shopify.pricing?.lastVerified).toBe("2026-08-17");
    expect(shopify.pricing?.officialSource).toBe("https://www.shopify.com/pricing");
  });
});
