import { describe, expect, it } from "vitest";
import { COMPARISON_V2_WAVE, isComparisonTemplateV2 } from "@/data/seo/comparison-waves";
import { COMPARISON_VERDICTS, VERDICTS_WRITTEN_ON, getComparisonVerdict } from "@/data/seo/comparison-verdicts";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getSoftware, type Software } from "@/data/software";
import { buildPricingRows, sourcedCons, sourcedPros } from "@/lib/comparison-v2";

const pairOf = new Map(PUBLISHED_COMPARISONS.map(([a, b]) => [getComparisonSlug(a, b), [getSoftware(a)!, getSoftware(b)!] as const]));
const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z£$])/).filter(Boolean);
const corpus = (products: readonly Software[]) =>
  products.map((s) => JSON.stringify({ name: s.name, bestFor: s.bestFor, features: s.features, pricing: s.pricing, pros: s.pros, cons: s.cons })).join(" ").replace(/(\d),(\d)/g, "$1$2");
const numbersIn = (text: string) => (text.replace(/(\d),(\d)/g, "$1$2").match(/\d+(?:\.\d+)?k?/g) ?? []).map((n) => n.replace(/\.$/, ""));

describe("comparison v2 wave", () => {
  it("lists distinct, published, same-category comparisons", () => {
    expect(new Set(COMPARISON_V2_WAVE).size).toBe(COMPARISON_V2_WAVE.length);
    for (const slug of COMPARISON_V2_WAVE) {
      const pair = pairOf.get(slug);
      expect(pair, `${slug} is not published`).toBeDefined();
      expect(pair![0].category, slug).toBe(pair![1].category);
      expect(isComparisonTemplateV2(slug)).toBe(true);
    }
    expect(isComparisonTemplateV2("notion-vs-clickup")).toBe(false);
  });

  it("only lists pairs the page can be written from sourced data: dated pricing records re-read on the verdict date, sourced pros and cons", () => {
    for (const slug of COMPARISON_V2_WAVE) {
      const [a, b] = pairOf.get(slug)!;
      for (const product of [a, b]) {
        expect(sourcedPros(product).length, `${slug}: ${product.slug} pros`).toBeGreaterThan(0);
        expect(sourcedCons(product).length, `${slug}: ${product.slug} cons`).toBeGreaterThan(0);
        expect((product.pricing?.lastVerified ?? "") >= VERDICTS_WRITTEN_ON, `${slug}: ${product.slug} pricing was not re-read on ${VERDICTS_WRITTEN_ON}`).toBe(true);
      }
      expect(buildPricingRows(a, b), `${slug} pricing`).not.toBeNull();
    }
  });
});

describe("comparison verdicts", () => {
  it("exist for exactly the wave pairs", () => {
    expect(Object.keys(COMPARISON_VERDICTS).sort()).toEqual([...COMPARISON_V2_WAVE].sort());
    expect(getComparisonVerdict("notion-vs-clickup")).toBeNull();
  });

  it("keep the decision rule to two sentences and the verdict to three", () => {
    for (const [slug, v] of Object.entries(COMPARISON_VERDICTS)) {
      expect(sentences(v.rule).length, `${slug} rule`).toBeLessThanOrEqual(2);
      expect(sentences(v.verdict).length, `${slug} verdict`).toBeLessThanOrEqual(3);
    }
  });

  it("only use numbers that appear in the two products' stored data", () => {
    for (const [slug, v] of Object.entries(COMPARISON_VERDICTS)) {
      const [a, b] = pairOf.get(slug)!;
      const text = corpus([a, b]);
      expect(numbersIn(`${v.rule} ${v.verdict}`).filter((n) => !text.includes(n)), `${slug} uses numbers the data does not contain`).toEqual([]);
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
  const verified = { status: "verified", lastVerified: "2026-10-19", officialSource: "https://x.example/pricing" } as const;

  it("returns null unless both products have dated, sourced pricing that is verified or verified sales-only", () => {
    expect(buildPricingRows(product(verified), product({ ...verified, status: "unavailable" }))).toBeNull();
    expect(buildPricingRows(product(verified), product({ ...verified, lastVerified: undefined }))).toBeNull();
    expect(buildPricingRows(product(verified), product(undefined))).toBeNull();
  });

  it("shows a sales-only product as custom pricing with no public price, and never invents a unit for an annual price", () => {
    const rows = buildPricingRows(
      product({ ...verified, model: "paid", entryPaid: { amount: "49", currency: "USD", billingPeriod: "monthly", perSeat: true, annualBillingRequired: true } }),
      product({ ...verified, status: "contact_sales", model: "paid" }),
    )!;
    const by = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(by["Pricing model"]!.b).toBe("Custom pricing (contact sales)");
    expect(by["Cheapest paid plan"]).toMatchObject({ a: "$49 per user per month, billed annually", b: "Contact sales (no public price)" });
    expect(by["Free plan"]!.b).toBe("Not stated on the pricing page");
  });
});
