import { describe, expect, it } from "vitest";
import cohortFile from "@/data/seo/template-cohorts.json";
import { COMPARISON_V2_WAVE_1, isComparisonTemplateV2 } from "@/data/seo/comparison-waves";
import { COMPARISON_VERDICTS, getComparisonVerdict } from "@/data/seo/comparison-verdicts";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getSoftware, type Software } from "@/data/software";
import { buildPricingRows, sourcedCons, sourcedPros } from "@/lib/comparison-v2";

const GROUPS = new Set(["crm", "sales", "project-management", "accounting", "finance-and-erp", "marketing", "hr-and-payroll"]);
const pairOf = new Map(PUBLISHED_COMPARISONS.map(([a, b]) => [getComparisonSlug(a, b), [getSoftware(a)!, getSoftware(b)!] as const]));
const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z£$])/).filter(Boolean);

/** Everything a verdict may draw a number from: the pricing record, sourced pros and cons, features, name and best-for of both products. */
const corpus = (products: readonly Software[]) =>
  products
    .map((s) => JSON.stringify({ name: s.name, bestFor: s.bestFor, features: s.features, pricing: s.pricing, pros: s.pros, cons: s.cons }))
    .join(" ")
    .replace(/(\d),(\d)/g, "$1$2");
const numbersIn = (text: string) => (text.replace(/(\d),(\d)/g, "$1$2").match(/\d+(?:\.\d+)?k?/g) ?? []).map((n) => n.replace(/\.$/, ""));

describe("comparison wave 1", () => {
  it("lists published, distinct comparisons that the template cohort file marks editable", () => {
    expect(new Set(COMPARISON_V2_WAVE_1).size).toBe(COMPARISON_V2_WAVE_1.length);
    for (const slug of COMPARISON_V2_WAVE_1) {
      expect(pairOf.has(slug), `${slug} is not a published comparison`).toBe(true);
      expect(cohortFile.comparisons.editable, `${slug} is held`).toContain(slug);
      expect(isComparisonTemplateV2(slug)).toBe(true);
    }
  });

  it("only lists pairs that the page can be written from sourced data alone: same category in scope, verified pricing, sourced pros and cons on both sides", () => {
    for (const slug of COMPARISON_V2_WAVE_1) {
      const [a, b] = pairOf.get(slug)!;
      expect(a.category, slug).toBe(b.category);
      expect(GROUPS.has(a.category), `${slug} category ${a.category}`).toBe(true);
      for (const product of [a, b]) {
        expect(sourcedPros(product).length, `${slug}: ${product.slug} pros`).toBeGreaterThan(0);
        expect(sourcedCons(product).length, `${slug}: ${product.slug} cons`).toBeGreaterThan(0);
      }
      expect(buildPricingRows(a, b), `${slug} pricing`).not.toBeNull();
    }
  });

  it("never turns the template on for a comparison outside the wave or one the cohort file holds", () => {
    expect(isComparisonTemplateV2("notion-vs-clickup")).toBe(false);
    for (const slug of Object.keys(cohortFile.comparisons.held)) expect(isComparisonTemplateV2(slug)).toBe(false);
  });
});

describe("comparison verdicts", () => {
  it("exist for exactly the wave pairs", () => {
    expect(Object.keys(COMPARISON_VERDICTS).sort()).toEqual([...COMPARISON_V2_WAVE_1].sort());
    expect(getComparisonVerdict("notion-vs-clickup")).toBeNull();
  });

  it("keep the decision rule to two sentences and the verdict to three", () => {
    for (const [slug, v] of Object.entries(COMPARISON_VERDICTS)) {
      expect(sentences(v.rule).length, `${slug} rule`).toBeLessThanOrEqual(2);
      expect(sentences(v.verdict).length, `${slug} verdict`).toBeLessThanOrEqual(3);
      expect(v.rule.length, `${slug} rule length`).toBeLessThan(330);
    }
  });

  it("only use numbers that appear in the two products' stored data", () => {
    for (const [slug, v] of Object.entries(COMPARISON_VERDICTS)) {
      const [a, b] = pairOf.get(slug)!;
      const text = corpus([a, b]);
      const unsupported = numbersIn(`${v.rule} ${v.verdict}`).filter((n) => !text.includes(n));
      expect(unsupported, `${slug} uses numbers the data does not contain`).toEqual([]);
    }
  });

  it("name both products and do not crown a winner", () => {
    for (const [slug, v] of Object.entries(COMPARISON_VERDICTS)) {
      const [a, b] = pairOf.get(slug)!;
      const text = `${v.rule} ${v.verdict}`;
      expect(text, slug).toContain(a.name.split(" ")[0]!);
      expect(text, slug).toContain(b.name.split(" ")[0]!);
      expect(text, slug).not.toMatch(/\b(best|winner|wins|clear choice|better overall|superior)\b/i);
    }
  });
});

describe("buildPricingRows", () => {
  const product = (pricing: Software["pricing"]) => ({ slug: "x", name: "X", pricing }) as Software;
  const verified = { status: "verified", lastVerified: "2026-10-12", officialSource: "https://x.example/pricing" } as const;

  it("returns null unless both products have verified, dated, sourced pricing", () => {
    expect(buildPricingRows(product(verified), product({ ...verified, status: "contact_sales" }))).toBeNull();
    expect(buildPricingRows(product(verified), product({ ...verified, lastVerified: undefined }))).toBeNull();
    expect(buildPricingRows(product(verified), product(undefined))).toBeNull();
  });

  it("states a monthly price per month, an annual-billing price without a unit it does not know, and says so when something is not stated", () => {
    const rows = buildPricingRows(
      product({ ...verified, model: "freemium", freePlan: true, freeTrial: { available: true, days: 14 }, entryPaid: { amount: "12", currency: "USD", billingPeriod: "monthly", annualBillingRequired: true, perSeat: true } }),
      product({ ...verified, model: "paid", entryPaid: { amount: "12.50", currency: "USD", billingPeriod: "annual" } }),
    )!;
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(byLabel["Cheapest paid plan"]).toMatchObject({ a: "$12 per user per month, billed annually", b: "$12.50 with annual billing" });
    expect(byLabel["Free plan"]).toMatchObject({ a: "Yes", b: "Not stated on the pricing page" });
    expect(byLabel["Free trial"]).toMatchObject({ a: "14 days", b: "Not stated on the pricing page" });
    expect(byLabel["Pricing last verified"]!.a).toBe("October 12, 2026");
  });
});
