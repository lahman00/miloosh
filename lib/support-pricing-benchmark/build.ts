import { getAllSoftware } from "@/data/software";
import type { Software } from "@/data/software/types";
import { AI_USAGE_PRICING_BY_SLUG, type AiUsagePricing } from "./data";
import researchPricingSnapshots from "./research-pricing-snapshots.json";

// Exact pricing records from Claude's 981a491 research handoff. Keep frozen
// control product pages unchanged while retaining the newly verified research.
const researchPricing = researchPricingSnapshots as Record<string, Software["pricing"]>;

/**
 * "2026 Customer Support Pricing Benchmark" -- built to replace an
 * unpublished draft ("2026 Customer Support Pricing Divergence Index")
 * found at docs/growth/receipts/20260926-authority-expansion-war/linkable-asset.md
 * that claimed a 15-vendor sample but showed verified data for only 3.
 * This module draws its sample from Miloosh's own catalog instead of an
 * ad hoc vendor list: every product tagged category "customer-support"
 * (16 as of 2026-09-26). Not called an "index" -- there is no single
 * composite score here, only per-vendor verified facts and worked
 * scenario calculations, which is what "benchmark" means and "index"
 * does not. See docs/growth/receipts/20260926-citable-research/methodology.md.
 */

export interface SupportPricingRow {
  slug: string;
  name: string;
  officialSource: string | null;
  lastVerified: string | null;
  status: string; // verified | contact_sales | unknown | ...
  model: string; // freemium | paid | ...
  hasFreeTier: boolean | null;
  hasFreeTrial: boolean | null;
  enterpriseContactSales: boolean | null;
  entryPerSeat: boolean | null;
  entryAmount: number | null;
  entryCurrency: string | null;
  entryBillingPeriod: string | null;
  recordedStartingPrice: string | null;
  aiUsagePricing: AiUsagePricing;
}

export interface CrossingScenario {
  vendor: string;
  seatRate: number;
  seats: number;
  aiUnitPrice: number;
  aiUnit: string;
  rows: { resolutions: number; seatCost: number; aiCost: number; total: number }[];
}

export interface SupportPricingBenchmark {
  generatedAt: string;
  sampleSize: number;
  totalCatalogSize: number;
  verifiedCount: number;
  unknownSlugs: string[];
  verificationWindow: { earliest: string | null; latest: string | null };
  inclusionRule: string;
  rows: SupportPricingRow[];
  billingUnitStats: {
    perSeatOnly: number;
    disclosedAiUsageUnit: number;
    contactSalesForBaseSeat: number;
    freeTierAvailable: number;
    freeTrialAvailable: number;
    entryPricePublic: number;
    noPublicPricingAtAll: number;
  };
  disclosedAiUsageRows: SupportPricingRow[];
  crossingScenario: CrossingScenario | null;
}

const CATEGORY = "customer-support";

export function buildSupportPricingBenchmark(all: readonly Software[] = getAllSoftware()): SupportPricingBenchmark {
  const catalogSample = all.filter((s) => s.category === CATEGORY).map(s =>
    researchPricing[s.slug] ? { ...s, pricing: researchPricing[s.slug] } : s);
  const rows: SupportPricingRow[] = catalogSample.map((s) => {
    const ai = AI_USAGE_PRICING_BY_SLUG[s.slug] ?? { disclosed: false, unitPrice: null, unit: null, note: "Not individually classified in this benchmark." };
    const amount = s.pricing?.entryPaid?.amount;
    return {
      slug: s.slug,
      name: s.name,
      officialSource: s.pricing?.officialSource ?? null,
      lastVerified: s.pricing?.lastVerified ?? null,
      status: s.pricing?.status ?? "unknown",
      model: s.pricing?.model ?? "unknown",
      hasFreeTier: s.pricing?.hasFreeTier ?? s.pricing?.freePlan ?? null,
      hasFreeTrial: s.pricing?.freeTrial?.available ?? null,
      enterpriseContactSales: s.pricing?.enterpriseContactSales ?? null,
      entryPerSeat: s.pricing?.entryPaid?.perSeat ?? null,
      entryAmount: amount !== undefined && /^\d+(?:\.\d+)?$/.test(amount) ? Number(amount) : null,
      entryCurrency: s.pricing?.entryPaid?.currency ?? null,
      entryBillingPeriod: s.pricing?.entryPaid?.billingPeriod ?? null,
      recordedStartingPrice: s.pricing?.startingPrice ?? null,
      aiUsagePricing: ai,
    };
  });

  const known = rows.filter((r) => isKnownRow(r));
  const unknownSlugs = rows.filter((r) => !isKnownRow(r)).map((r) => r.slug);
  const verificationDates = rows.map((r) => r.lastVerified).filter((d): d is string => Boolean(d)).sort();

  const disclosedAiUsageRows = rows.filter((r) => r.aiUsagePricing.disclosed);

  const billingUnitStats = {
    perSeatOnly: rows.filter((r) => r.entryPerSeat === true && !r.aiUsagePricing.disclosed).length,
    disclosedAiUsageUnit: disclosedAiUsageRows.length,
    contactSalesForBaseSeat: rows.filter((r) => r.entryAmount === null && r.status === "contact_sales").length,
    freeTierAvailable: rows.filter((r) => r.hasFreeTier === true).length,
    freeTrialAvailable: rows.filter((r) => r.hasFreeTrial === true).length,
    entryPricePublic: rows.filter((r) => r.entryAmount !== null).length,
    noPublicPricingAtAll: rows.filter((r) => r.status === "unknown" && r.entryAmount === null).length,
  };

  // Crossing scenario: the only vendor in the disclosed-AI-usage subset with
  // BOTH a public per-seat rate AND a public per-unit AI rate AND no
  // undisclosed included-allowance that would offset the arithmetic --
  // i.e. the only one a full monthly-total formula can be built from public
  // information alone. See rows' aiUsagePricing.note for why the others
  // (Freshdesk has an included-session allowance; Gorgias's rate is
  // tier-dependent with its own allowance; Re:amaze's allowance size isn't
  // published; Kayako's seat rate isn't published) don't qualify.
  const intercom = rows.find((r) => r.slug === "intercom");
  let crossingScenario: CrossingScenario | null = null;
  if (intercom && intercom.entryAmount !== null && intercom.aiUsagePricing.unitPrice !== null) {
    const seats = 3;
    const seatRate = intercom.entryAmount;
    const aiUnitPrice = intercom.aiUsagePricing.unitPrice;
    const volumes = [0, 100, 300, 500, 1000];
    crossingScenario = {
      vendor: intercom.name,
      seatRate,
      seats,
      aiUnitPrice,
      aiUnit: intercom.aiUsagePricing.unit ?? "unit",
      rows: volumes.map((resolutions) => {
        const seatCost = Math.round(seatRate * seats * 100) / 100;
        const aiCost = Math.round(aiUnitPrice * resolutions * 100) / 100;
        return { resolutions, seatCost, aiCost, total: Math.round((seatCost + aiCost) * 100) / 100 };
      }),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: rows.length,
    totalCatalogSize: all.length,
    verifiedCount: known.length,
    unknownSlugs,
    verificationWindow: { earliest: verificationDates[0] ?? null, latest: verificationDates.at(-1) ?? null },
    inclusionRule: `Every catalog product with category "${CATEGORY}" as of the compilation date -- not a hand-picked vendor list.`,
    rows,
    billingUnitStats,
    disclosedAiUsageRows,
    crossingScenario,
  };
}

function isKnownRow(r: SupportPricingRow): boolean {
  return r.status === "verified" || r.status === "contact_sales";
}
