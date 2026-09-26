import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getSoftware, type Software } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { isPublishedComparison } from "@/data/comparisons";
import { FIRST_REVENUE_PAGES, getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { generateFaq } from "@/lib/generators";
import { formatIsoDate } from "@/lib/date";
import { firstRevenuePriceLine } from "@/lib/revenue/first-revenue-price";
import { getFaqJsonLd } from "@/lib/structured-data";
import { PricingSection } from "@/components/PricingSection";

vi.mock("@/components/TrackedCtaLink", () => ({
  TrackedCtaLink: ({ children, href, rel }: { children: React.ReactNode; href: string; rel: string }) => React.createElement("a", { href, rel }, children),
}));
vi.mock("@/components/TrackedVendorLink", () => ({
  TrackedVendorLink: ({ children, href, rel }: { children: React.ReactNode; href: string; rel: string }) => React.createElement("a", { href, rel }, children),
}));

/**
 * Wave-2 monetization pass (2026-09-26) on three existing, ACTIVE-partner
 * software pages with observed alternatives-intent impressions. None of them
 * joins the five-page first-revenue cohort, and no URL is added.
 */
const WAVE2 = [
  { slug: "pipedrive", affiliateUrl: "https://aff.trypipedrive.com/ajtcgyu06e7i" },
] as const;

function load(slug: string): Software {
  const software = getSoftware(slug);
  if (!software) throw new Error(`missing software record: ${slug}`);
  return software;
}

function renderPricing(software: Software): string {
  return renderToStaticMarkup(React.createElement(PricingSection, { software }));
}

describe("Wave-2 pages: affiliate handoff and cohort boundary", () => {
  it("leaves the canonical five-page first-revenue cohort unchanged", () => {
    expect(FIRST_REVENUE_PAGES.map((page) => page.slug).sort()).toEqual(["airtable", "close", "elevenlabs", "setmore", "todoist"]);
    for (const { slug } of WAVE2) expect(getFirstRevenuePage(slug)).toBeUndefined();
  });

  it.each(WAVE2)("$slug routes its merchant CTA through the exact ACTIVE issued URL with sponsored rel and disclosure", ({ slug, affiliateUrl }) => {
    const software = load(slug);
    expect(getActivePartner(slug)?.affiliateUrl).toBe(affiliateUrl);
    const relationship = CURRENT_AFFILIATE_LEDGER.find((entry) => entry.productSlugs.includes(slug) && entry.status === "ACTIVE");
    expect(relationship?.affiliateUrl).toBe(affiliateUrl);
    // The catalog record must not carry its own tracking URL; the canonical registry is the only source.
    expect(software.affiliateUrl).toBeUndefined();
    expect(getSoftwareCtaUrl(software).startsWith(affiliateUrl)).toBe(true);
    expect(getSoftwareCtaRel(software)).toBe("sponsored noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(software)).toBe(true);
    const html = renderPricing(software);
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain("Affiliate Disclosure");
  });

  it.each(WAVE2)("$slug lists only real alternatives, each with a published head-to-head comparison", ({ slug }) => {
    const software = load(slug);
    for (const alternative of software.alternatives) {
      expect(getSoftware(alternative.slug), alternative.slug).toBeDefined();
      const published = isPublishedComparison(slug, alternative.slug) || isPublishedComparison(alternative.slug, slug);
      expect(published, `${slug} vs ${alternative.slug}`).toBe(true);
    }
  });

  it.each(WAVE2)("$slug renders a record-owned decision FAQ whose structured data matches the visible text", ({ slug }) => {
    const software = load(slug);
    const faq = generateFaq(software);
    expect(software.faq?.length).toBeGreaterThanOrEqual(4);
    expect(faq).toEqual(software.faq);
    // The page owns "<brand> alternatives" intent: the first question answers it and names every listed alternative.
    expect(faq[0]!.question).toBe(`What are the best ${software.name} alternatives?`);
    for (const alternative of software.alternatives) expect(faq[0]!.answer).toContain(alternative.name);
    const jsonLd = getFaqJsonLd(faq);
    expect(jsonLd.mainEntity.map((item) => [item.name, item.acceptedAnswer.text])).toEqual(faq.map((item) => [item.question, item.answer]));
  });

  it.each(WAVE2)("$slug FAQ price claims cite the stored pricing verification date, never a newer one", ({ slug }) => {
    const software = load(slug);
    const verified = formatIsoDate(software.pricing!.lastVerified!);
    const dated = (software.faq ?? []).filter((item) => /US\$\d/.test(item.answer) && /last checked/i.test(item.answer));
    expect(dated.length).toBeGreaterThan(0);
    for (const item of dated) expect(item.answer, item.question).toContain(verified);
  });
});

describe("Pipedrive buyer-decision record", () => {
  const pipedrive = () => load("pipedrive");

  it("stores per-seat monthly rates with the annual-billing commitment explicit, never as a $14-per-year price", () => {
    const pricing = pipedrive().pricing!;
    expect(pricing.entryPaid).toEqual({ amount: "14", currency: "USD", billingPeriod: "monthly", perSeat: true, annualBillingRequired: true });
    expect(pricing.tiers?.map((tier) => [tier.name, tier.amount, tier.billingPeriod])).toEqual([
      ["Lite", "14", "monthly"], ["Growth", "39", "monthly"], ["Premium", "59", "monthly"], ["Ultimate", "79", "monthly"],
    ]);
    for (const tier of pricing.tiers!) {
      expect(tier.notes).toContain("billed annually");
      expect(tier.notes).toContain(`US$${Number(tier.amount) * 12}/seat/year`);
    }
    expect(firstRevenuePriceLine(pipedrive())).toBe("14-day free trial, no permanent free plan. Paid-plan snapshot: USD 14/month per seat. Annual billing required for this rate.");
  });

  it("renders the pricing card as a monthly per-seat rate with the annual requirement, not '/ annual'", () => {
    const html = renderPricing(pipedrive());
    expect(html).toContain("Annual billing required at this price.");
    expect(html).toContain("/ monthly / seat");
    expect(html).not.toContain("/ annual");
    expect(html).toContain("Free plan: <span class=\"text-white\">no</span>");
    expect(html).toContain("yes, 14 days");
  });

  it("uses only the current Lite/Growth/Premium/Ultimate packaging", () => {
    // Obsolete Pipedrive plan labels (removed from the guides on 2026-09-12). "Enterprise" is not
    // checked because it legitimately appears in a Salesforce alternative's strengths.
    const serialized = JSON.stringify(pipedrive());
    expect(serialized).not.toMatch(/\b(Essentials?|Advanced|Professional)\b/);
    expect(pipedrive().pricing!.tiers!.map((tier) => tier.name)).toEqual(["Lite", "Growth", "Premium", "Ultimate"]);
  });

  it("keeps the source-backed plan gates and limits visible as cons", () => {
    const cons = pipedrive().cons ?? [];
    expect(cons.some((con) => /no permanent free plan/i.test(con) && con.includes("14-day trial"))).toBe(true);
    expect(cons.some((con) => con.includes("Lite") && con.includes("email sync") && con.includes("Growth"))).toBe(true);
    expect(cons.some((con) => con.includes("annual billing") && con.includes("per seat"))).toBe(true);
    expect(cons.some((con) => con.includes("HubSpot"))).toBe(true);
  });

  it("answers the Growth email-sync gate and seat economics with arithmetic that matches the stored tiers", () => {
    const faq = pipedrive().faq ?? [];
    const gate = faq.find((item) => item.question.includes("email sync"));
    expect(gate?.answer).toMatch(/^Growth\./);
    const cost = faq.find((item) => item.question.includes("five-person"));
    const [lite, growth] = pipedrive().pricing!.tiers!;
    expect(cost?.answer).toContain(`5 × US$${lite!.amount} = US$${5 * Number(lite!.amount)} a month, or US$${(60 * Number(lite!.amount)).toLocaleString("en-US")} a year`);
    expect(cost?.answer).toContain(`5 × US$${growth!.amount} = US$${5 * Number(growth!.amount)} a month, or US$${(60 * Number(growth!.amount)).toLocaleString("en-US")} a year`);
    expect(cost?.answer).toContain("not a quote");
  });

  it("keeps the existing editorial order and adds sales-first alternatives after it", () => {
    expect(pipedrive().alternatives.map((alternative) => alternative.slug)).toEqual(["hubspot", "salesforce", "zoho-crm", "freshsales", "close"]);
  });
});

describe("Wrike buyer-decision record", () => {
  const wrike = () => load("wrike");

  it("never invents a Wrike commission rate", () => {
    const relationship = CURRENT_AFFILIATE_LEDGER.find((entry) => entry.programId === "wrike");
    expect(relationship?.status).toBe("ACTIVE");
    expect(relationship?.commissionModel).not.toMatch(/\d+(?:\.\d+)?\s*%/);
    expect(relationship?.commissionModel).toMatch(/not disclosed/i);
    expect(JSON.stringify(wrike())).not.toMatch(/commission|\d+\s*%/i);
  });

  it("keeps a free plan, a 14-day trial and annual-billed per-user monthly rates", () => {
    const pricing = wrike().pricing!;
    expect(pricing.freePlan).toBe(true);
    expect(pricing.hasFreeTier).toBe(true);
    expect(pricing.freeTrial).toEqual({ available: true, days: 14 });
    expect(pricing.entryPaid).toEqual({ amount: "10", currency: "USD", billingPeriod: "monthly", perSeat: true, annualBillingRequired: true });
    const [free, team, business, pinnacle, apex] = pricing.tiers!;
    expect([free!.name, free!.amount]).toEqual(["Free", "0"]);
    expect([team!.name, team!.amount, team!.billingPeriod]).toEqual(["Team", "10", "monthly"]);
    expect(team!.notes).toContain("billed annually");
    expect(team!.notes).toContain("2-15 users");
    expect([business!.name, business!.amount, business!.billingPeriod]).toEqual(["Business", "25", "monthly"]);
    expect(business!.notes).toContain("billed annually");
    expect(business!.notes).toContain("5-200 users");
    expect(pinnacle!.notes).toContain("resource/capacity planning");
    expect([pinnacle!.amount, apex!.amount]).toEqual([undefined, undefined]);
    expect(pricing.enterpriseContactSales).toBe(true);
  });

  it("does not contradict the Team plan's annual billing in its cons", () => {
    const cons = wrike().cons ?? [];
    // The 2026-08-23 con said annual billing starts at Business; the 2026-09-10 verified entry plan (Team) is annual-billed.
    expect(cons.join(" ")).not.toMatch(/from Business tier upward/i);
    expect(cons.some((con) => con.includes("Team") && con.includes("billed annually"))).toBe(true);
  });

  it("carries the sourced seat, license, capacity-planning and renewal limits", () => {
    const cons = (wrike().cons ?? []).join(" ");
    expect(cons).toContain("groups of five up to 30 users");
    expect(cons).toContain("External users are paid full users");
    expect(cons).toContain("Pinnacle");
    expect(cons).toContain("take effect at renewal");
    expect(wrike().features.find((feature) => feature.startsWith("Resource allocation"))).toContain("Pinnacle");
    for (const source of ["https://www.wrike.com/price/", "https://help.wrike.com/hc/en-us/articles/209603989-Types-of-Licenses-in-Wrike"]) {
      expect(wrike().sources).toContain(source);
    }
  });

  it("renders the Wrike price as monthly per seat with the annual requirement", () => {
    const html = renderPricing(wrike());
    expect(html).toContain("/ monthly / seat");
    expect(html).toContain("Annual billing required at this price.");
    expect(html).not.toContain("/ annual");
  });
});
