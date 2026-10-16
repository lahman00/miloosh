import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import hold from "@/data/seo/price-label-hold.json";
import { OWNER_PRICE_LABEL_FACTUAL_RELEASES } from "@/data/seo/price-label-factual-releases";
import { ownerBusinessDate } from "@/scripts/seo/generate-price-label-hold";
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
  it("shows the owner-approved Pipedrive factual correction without changing its amount", () => {
    expect(isPriceLabelHeld("pipedrive")).toBe(false);
    expect(entryLine(text(getSoftware("pipedrive")!))).toContain("USD 14 / month / seat · billed annually");
    expect(firstRevenuePriceLine(getSoftware("pipedrive")!)).toContain("USD 14 / month / seat · billed annually");
  });
  it("shows Front as monthly billed annually, but TickTick as a real yearly total", () => {
    expect(isPriceLabelHeld("front")).toBe(false);
    expect(isPriceLabelHeld("ticktick")).toBe(false);
    expect(entryLine(text(getSoftware("front")!))).toContain("USD 25 / month / seat · billed annually");
    expect(entryLine(text(getSoftware("ticktick")!))).toContain("USD 49.99 / year");
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
    expect(slugs.length).toBe(138);
    for (const slug of Object.keys(OWNER_PRICE_LABEL_FACTUAL_RELEASES)) expect(slugs).not.toContain(slug);
  });
});

describe("tier units that already say per user/month", () => {
  it("never prints a doubled 'per' or a repeated period in a profile that is not held", () => {
    const html = text(getSoftware("fathom")!);
    expect(html).toContain("USD 15 / month / user · billed annually");
    expect(html).not.toMatch(/\/ per |\/ month \/ per|month · billed annually \(price unit not stated\)/);
  });
});


describe("owner-local date for factual corrections", () => {
  it("recognizes the Israel-local October 17 approval while UTC is still October 16", () => {
    expect(ownerBusinessDate(new Date("2026-10-16T22:00:00Z"))).toBe("2026-10-17");
    expect(ownerBusinessDate(new Date("2026-10-16T20:59:00Z"))).toBe("2026-10-16");
  });
});
