/**
 * Comparison pages that use the v2 comparison template: a quick verdict, a pricing table from verified data and
 * sourced pros and cons only.
 *
 * Selected 2026-10-19 by `npm run growth:opportunity-matrix`: same-category pairs that include a payout-verified affiliate
 * partner, whose page is editable under the protection snapshot and whose two products' data feed no protected,
 * observed or in-flight page. Each product's pricing was re-read from the vendor's own pricing page on that date.
 * Only listed pages change; every other comparison keeps the current template, and a rendered comparison of the whole
 * site against production is the proof that no protected page differs.
 *
 * tests/seo/comparison-waves.test.ts re-checks the criteria that can be checked in code.
 */
export const COMPARISON_V2_WAVE: readonly string[] = [
  "apollo-io-vs-cognism",
  "apollo-io-vs-linkedin-sales-navigator",
  "apollo-io-vs-outreach",
  "apollo-io-vs-salesloft",
  "callrail-vs-ruler-analytics",
  "krispcall-vs-dialpad",
  "krispcall-vs-nextiva",
  "whatconverts-vs-callrail",
];

const WAVE = new Set<string>(COMPARISON_V2_WAVE);

export function isComparisonTemplateV2(slug: string): boolean {
  return WAVE.has(slug);
}
