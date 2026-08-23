import { getAllSoftware } from "@/data/software";
import type { Software } from "@/data/software/types";

/**
 * MILOOSH WAR MODE mission (2026-08-24) — the Miloosh SaaS Pricing
 * Pressure Index 2026. Every statistic here is computed directly from
 * data/software/*.json's real, first-party-sourced `pricing` field --
 * nothing is estimated, inferred from unstructured text, or extrapolated
 * beyond what the structured schema actually records. Per the PR
 * methodology doc (docs/pr-targets-2026-08-24.md): "define the sample
 * before calculating results, state sample size, separate observed fact
 * from modeled cost, publish inclusion/exclusion rules."
 *
 * SAMPLE: every catalog entry with a real, sourced `pricing` object
 * (`pricing.status === "verified"` or `"contact_sales"` -- i.e. an entry
 * that was actually checked against the vendor's own page, not merely
 * present). As of this build: 65 of 247 catalog entries. The other 182
 * are EXCLUDED, not counted as "no free tier" or any other negative --
 * absence of verified pricing data is not evidence about the product's
 * actual pricing.
 *
 * MODELED COSTS: only computed for entries with `entryPaid.perSeat ===
 * true` (an explicit, structurally-recorded fact, not an inference).
 * Flat-priced, usage-based, or unrecorded-basis products are excluded
 * from modeled team-cost figures rather than assumed to scale linearly
 * with seats -- doing otherwise would misrepresent real flat/usage
 * pricing as if it were per-seat.
 */

export interface PricingIndexProduct {
  slug: string;
  name: string;
  category: string;
  hasFreeTier: boolean;
  hasFreeTrial: boolean;
  model: string;
  perSeat: boolean;
  enterpriseContactSales: boolean;
  startingMonthlyEquivalent: number | null;
  billingPeriod: string | null;
  lastVerified: string | null;
  officialSource: string | null;
}

export interface ModeledTeamCost {
  slug: string;
  name: string;
  perSeatMonthlyRate: number;
  cost5: number;
  cost10: number;
  cost25: number;
  cost50: number;
}

export interface PricingIndexStat {
  label: string;
  numerator: number;
  denominator: number;
  pct: number;
}

export interface PricingIndex {
  generatedAt: string;
  sampleSize: number;
  totalCatalogSize: number;
  inclusionRule: string;
  exclusionRule: string;
  products: PricingIndexProduct[];
  stats: PricingIndexStat[];
  medianStartingPrice: number | null;
  modeledTeamCosts: ModeledTeamCost[];
  medianModeledCost10Seats: number | null;
  medianModeledCost25Seats: number | null;
  highestModeledCost50Seats: ModeledTeamCost | null;
  categoryMedianStartingPrice: { category: string; median: number; sampleSize: number }[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function stat(label: string, numerator: number, denominator: number): PricingIndexStat {
  return { label, numerator, denominator, pct: denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0 };
}

function isVerifiedPricing(software: Software): boolean {
  const status = software.pricing?.status;
  return status === "verified" || status === "contact_sales";
}

export function buildPricingIndex(): PricingIndex {
  const all = getAllSoftware();
  const sample = all.filter(isVerifiedPricing);

  const products: PricingIndexProduct[] = sample.map((s) => ({
    slug: s.slug,
    name: s.name,
    category: s.category,
    hasFreeTier: Boolean(s.pricing?.hasFreeTier || s.pricing?.freePlan),
    hasFreeTrial: Boolean(s.pricing?.freeTrial?.available),
    model: s.pricing?.model ?? "unknown",
    perSeat: Boolean(s.pricing?.entryPaid?.perSeat),
    enterpriseContactSales: Boolean(s.pricing?.enterpriseContactSales),
    startingMonthlyEquivalent: s.pricing?.entryPaid ? Number.parseFloat(s.pricing.entryPaid.amount) : null,
    billingPeriod: s.pricing?.entryPaid?.billingPeriod ?? null,
    lastVerified: s.pricing?.lastVerified ?? null,
    officialSource: s.pricing?.officialSource ?? null,
  }));

  const withFiniteStartingPrice = products.filter((p) => p.startingMonthlyEquivalent !== null && Number.isFinite(p.startingMonthlyEquivalent));

  const stats: PricingIndexStat[] = [
    stat("Free tier available", products.filter((p) => p.hasFreeTier).length, products.length),
    stat("Free trial available", products.filter((p) => p.hasFreeTrial).length, products.length),
    stat("Explicitly per-seat pricing", products.filter((p) => p.perSeat).length, products.length),
    stat("Enterprise tier requires contacting sales", products.filter((p) => p.enterpriseContactSales).length, products.length),
    stat("Pricing model: freemium", products.filter((p) => p.model === "freemium").length, products.length),
    stat("Pricing model: paid (no free tier)", products.filter((p) => p.model === "paid").length, products.length),
  ];

  const perSeatProducts = sample.filter((s) => s.pricing?.entryPaid?.perSeat);
  const modeledTeamCosts: ModeledTeamCost[] = perSeatProducts
    .map((s) => {
      const rate = Number.parseFloat(s.pricing!.entryPaid!.amount);
      if (!Number.isFinite(rate)) return null;
      return {
        slug: s.slug,
        name: s.name,
        perSeatMonthlyRate: rate,
        cost5: Math.round(rate * 5 * 100) / 100,
        cost10: Math.round(rate * 10 * 100) / 100,
        cost25: Math.round(rate * 25 * 100) / 100,
        cost50: Math.round(rate * 50 * 100) / 100,
      };
    })
    .filter((row): row is ModeledTeamCost => row !== null)
    .sort((a, b) => b.cost10 - a.cost10);

  const categoriesInSample = [...new Set(withFiniteStartingPrice.map((p) => p.category))];
  const categoryMedianStartingPrice = categoriesInSample
    .map((category) => {
      const inCategory = withFiniteStartingPrice.filter((p) => p.category === category);
      return { category, median: median(inCategory.map((p) => p.startingMonthlyEquivalent!)) ?? 0, sampleSize: inCategory.length };
    })
    .filter((row) => row.sampleSize >= 3) // a "category median" from 1-2 products is really just an average of a couple points, not a defensible statistic
    .sort((a, b) => b.median - a.median);

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: sample.length,
    totalCatalogSize: all.length,
    inclusionRule: "Every catalog entry with pricing.status of \"verified\" or \"contact_sales\" -- i.e. checked directly against the vendor's own current pricing page.",
    exclusionRule: "Entries with no pricing.status (pricing not yet independently verified) are excluded entirely from every statistic below, never counted as a negative.",
    products,
    stats,
    medianStartingPrice: median(withFiniteStartingPrice.map((p) => p.startingMonthlyEquivalent!)),
    modeledTeamCosts,
    medianModeledCost10Seats: median(modeledTeamCosts.map((m) => m.cost10)),
    medianModeledCost25Seats: median(modeledTeamCosts.map((m) => m.cost25)),
    highestModeledCost50Seats: modeledTeamCosts.length > 0 ? [...modeledTeamCosts].sort((a, b) => b.cost50 - a.cost50)[0]! : null,
    categoryMedianStartingPrice,
  };
}
