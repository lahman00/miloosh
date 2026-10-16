import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import hold from "@/data/seo/price-label-hold.json";
import { PricingSection } from "@/components/PricingSection";
import { getAllSoftware, getSoftware, type Software } from "@/data/software";
import { isPriceLabelHeld } from "@/lib/price-label-hold";
import { firstRevenueCompactPrice, firstRevenuePriceLine } from "@/lib/revenue/first-revenue-price";

const text = (software: Software) => renderToStaticMarkup(createElement(PricingSection, { software })).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const entryLine = (html: string) => /Entry paid plan (.*?)(?: Annual billing required| Free plan| Free trial|$)/.exec(html)?.[1] ?? "";

describe("price wording on a profile that is not under a hold", () => {
  it("states Apollo.io's annual-billing price as a monthly rate", () => {
    expect(isPriceLabelHeld("apollo-io")).toBe(false);
    expect(entryLine(text(getSoftware("apollo-io")!))).toContain("USD 49 / month / seat · billed annually");
    expect(text(getSoftware("apollo-io")!)).not.toMatch(/USD 49 \/ annual/);
  });

  it("states Fathom's annual-billing price as a monthly rate and keeps a monthly tier as a monthly price", () => {
    const html = text(getSoftware("fathom")!);
    expect(entryLine(html)).toContain("USD 16 / month / seat · billed annually");
    expect(html).not.toMatch(/\/ annual/);
  });

  it("keeps a genuine yearly total yearly", () => {
    expect(isPriceLabelHeld("secureframe")).toBe(false);
    expect(entryLine(text(getSoftware("secureframe")!))).toContain("USD 7000 / year");
  });

  it("words one-time, monthly and unknown tiers without printing the raw cadence", () => {
    const base = getSoftware("apollo-io")!;
    const software = { ...base, pricing: { ...base.pricing!, entryPaid: undefined, tiers: [
      { name: "One", amount: "279", currency: "USD", billingPeriod: "one_time" as const, unit: "project" },
      { name: "Two", amount: "29", currency: "USD", billingPeriod: "monthly" as const },
      { name: "Three", amount: "20", currency: "USD", billingPeriod: "unknown" as const },
    ] } } as Software;
    const html = text(software);
    expect(html).toContain("USD 279 / project one time");
    expect(html).toContain("USD 29 / month");
    expect(html).toContain("USD 20 · billing period unstated");
  });

  it("uses the corrected wording in the money-page price lines for an annual entry", () => {
    const fathom = getSoftware("fathom")!;
    expect(firstRevenuePriceLine(fathom)).toContain("Paid-plan snapshot: USD 16 / month / seat · billed annually.");
    expect(firstRevenueCompactPrice(fathom)).toBe("USD 16/mo per seat · billed annually");
    expect(firstRevenuePriceLine(getSoftware("secureframe")!)).toContain("USD 7000 / year");
  });
});

describe("price wording on a profile that is under a hold", () => {
  it("leaves Pipedrive (protected) exactly as it was until the hold ends", () => {
    expect(isPriceLabelHeld("pipedrive")).toBe(true);
    expect(entryLine(text(getSoftware("pipedrive")!))).toContain("USD 14 / annual / seat");
    expect(firstRevenuePriceLine(getSoftware("pipedrive")!)).toContain("USD 14/year per seat");
  });

  it("keeps the previous monthly wording of a held money page", () => {
    expect(firstRevenueCompactPrice(getSoftware("airtable")!)).toBe("USD 20/mo per seat · billed annually");
  });
});

describe("the hold list", () => {
  it("names only published profiles, sorted and unique, with the owner's date", () => {
    const slugs = hold.heldSoftware;
    const published = new Set(getAllSoftware().map((s) => s.slug));
    expect(slugs.filter((slug) => !published.has(slug))).toEqual([]);
    expect(slugs).toEqual([...new Set(slugs)].sort());
    expect(hold.holdUntil).toBe("2026-11-04");
    expect(hold.baseSha).toMatch(/^[0-9a-f]{40}$/);
  });
});
