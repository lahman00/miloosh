import { isComparisonTemplateV2 } from "@/data/seo/comparison-waves";

/**
 * Pages that carry the premium-report validation card (2026-10-24). Three high-intent comparisons from the v2 wave: editable, live,
 * with official pricing re-verified on 2026-10-19/20 and a payout-verified partner on one side. The card is a demand test for a
 * product that does not exist; it never replaces a vendor link or a recommendation.
 */
export const PREMIUM_GATE_COMPARISONS: readonly string[] = [
  "apollo-io-vs-linkedin-sales-navigator",
  "callrail-vs-ruler-analytics",
  "krispcall-vs-dialpad",
];

export function isPremiumGateComparison(slug: string): boolean {
  return PREMIUM_GATE_COMPARISONS.includes(slug) && isComparisonTemplateV2(slug);
}

/** Descriptive tracking location of the card's button. */
export const PREMIUM_GATE_CTA_LOCATION = "premium-gate-comparison";

export function premiumGatePaths(): string[] {
  return PREMIUM_GATE_COMPARISONS.map((slug) => `/compare/${slug}`);
}
