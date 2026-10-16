import { describe, expect, it } from "vitest";
import { annualAmountMeaning, describePrice } from "@/lib/pricing-display";
import { getAllSoftware } from "@/data/software";

describe("annualAmountMeaning", () => {
  it("reads a monthly-equivalent rate from the starting price or the notes", () => {
    expect(annualAmountMeaning("14", ["$14/seat/month", "Per seat/month, billed annually (US$168/seat/year)."])).toBe("per_month");
    expect(annualAmountMeaning("8.25", ["Starter: $8.25/month equivalent on annual billing ($99/year)"])).toBe("per_month");
    expect(annualAmountMeaning("10", ["$10/seat/month billed yearly"])).toBe("per_month");
    expect(annualAmountMeaning("499", ["Core: $0; Team: $499/month with annual commitment ($599 month-to-month)"])).toBe("per_month");
  });

  it("reads a genuine yearly total", () => {
    expect(annualAmountMeaning("49.99", ["Premium: $49.99/year"])).toBe("per_year");
    expect(annualAmountMeaning("1500", ["$1,500/year", "Covers 108 countries"])).toBe("per_year");
    expect(annualAmountMeaning("179.99", ["$179.99/endpoint/year"])).toBe("per_year");
  });

  it("recognises a monthly rate from its yearly total in the notes", () => {
    expect(annualAmountMeaning("12.50", ["$12.50", "3 users (billed annually at $150/yr)."])).toBe("per_month");
  });

  it("says unknown when the strings are silent or contradict each other", () => {
    expect(annualAmountMeaning("69", ["", ""])).toBe("unknown");
    expect(annualAmountMeaning("14.00", ["$14", "Workflows and reports ($20/user/mo billed monthly)."])).toBe("unknown");
    expect(annualAmountMeaning("5", ["$5/month", "$5/year"])).toBe("unknown");
    expect(annualAmountMeaning("x", ["$5/month"])).toBe("unknown");
  });

  it("ignores other amounts in the text", () => {
    expect(annualAmountMeaning("14", ["$20/month for the next tier", "$14 per seat"])).toBe("unknown");
  });
});

describe("describePrice", () => {
  it("words a Pipedrive-like annual price as a monthly rate billed annually, never as a yearly price", () => {
    const result = describePrice({ amount: "14", currency: "USD", billingPeriod: "annual", per: "seat" }, ["$14/seat/month", "Per seat/month, billed annually (US$168/seat/year)."]);
    expect(result).toEqual({ basis: "per_month_billed_annually", text: "USD 14 / month / seat · billed annually" });
    expect(result.text).not.toMatch(/annual\s*\/|\/ annual|\/ year/);
  });

  it("words a regular monthly price per month and adds the annual-billing condition only when required", () => {
    expect(describePrice({ amount: "29", currency: "USD", billingPeriod: "monthly" }).text).toBe("USD 29 / month");
    expect(describePrice({ amount: "29", currency: "USD", billingPeriod: "monthly", per: "user", annualBillingRequired: true }).text).toBe("USD 29 / month / user · billed annually");
  });

  it("words a genuine yearly total as a yearly price", () => {
    expect(describePrice({ amount: "49.99", currency: "USD", billingPeriod: "annual" }, ["Premium: $49.99/year"])).toEqual({ basis: "per_year", text: "USD 49.99 / year" });
  });

  it("words a one-time price as one time", () => {
    expect(describePrice({ amount: "279", currency: "USD", billingPeriod: "one_time", per: "project" })).toEqual({ basis: "one_time", text: "USD 279 / project one time" });
  });

  it("states only what is known for an unknown billing period, and for an annual price whose unit is not stated", () => {
    expect(describePrice({ amount: "20", currency: "USD", billingPeriod: "unknown" })).toEqual({ basis: "unstated", text: "USD 20 · billing period unstated" });
    expect(describePrice({ amount: "69", currency: "USD", billingPeriod: "annual", per: "seat" })).toEqual({ basis: "billed_annually_unit_unstated", text: "USD 69 / seat · billed annually (price unit not stated)" });
  });

  it("never turns an annual entry into a bare 'annual' unit for any product in the catalog", () => {
    for (const software of getAllSoftware()) {
      const entry = software.pricing?.entryPaid;
      if (!entry) continue;
      const tier = software.pricing!.tiers?.find((t) => t.amount === entry.amount);
      const { text } = describePrice({ amount: entry.amount, currency: entry.currency, billingPeriod: entry.billingPeriod, per: entry.perSeat ? "seat" : null }, [software.pricing!.startingPrice, tier?.notes]);
      expect(text, software.slug).not.toMatch(/\/ annual|\/annual/);
      if (software.slug === "pipedrive") expect(text).toBe("USD 14 / month / seat · billed annually");
      if (software.slug === "front") expect(text).toBe("USD 25 / month / seat · billed annually");
      if (software.slug === "ticktick") expect(text).toBe("USD 49.99 / year");
    }
  });
});
