import cohorts from "./template-cohorts.json";

/**
 * Comparison pages that use the v2 comparison template, in rollout waves.
 *
 * Owner decision, 2026-10-12: new templates go out in waves, each measured before the next, to editable pages
 * only. Wave 1 is every comparison that has all of the following, so the page can be written from sourced data and
 * nothing else:
 *   - two products in the same category, in CRM / sales, project management, accounting / finance, marketing or
 *     HR / payroll;
 *   - a page that the template cohort file marks editable (no running measurement, nothing in flight);
 *   - verified, dated, sourced pricing on both sides;
 *   - sourced strengths (`pros`) and sourced constraints (`cons`) on both sides.
 * 40 pairs met this on 2026-10-12; the owner asked for 40 good pages rather than 50 weaker ones.
 *
 * tests/seo/comparison-waves.test.ts re-checks every criterion, so a data change that removes the support for a
 * listed pair fails the build instead of quietly publishing an unsupported page.
 */
export const COMPARISON_V2_WAVE_1: readonly string[] = [
  "apollo-io-vs-linkedin-sales-navigator",
  "bamboohr-vs-gusto",
  "bill-vs-ramp",
  "bill-vs-tipalti",
  "brevo-vs-getresponse",
  "brex-vs-expensify",
  "brex-vs-navan",
  "brex-vs-ramp",
  "callrail-vs-ruler-analytics",
  "constant-contact-vs-brevo",
  "constant-contact-vs-moosend",
  "constant-contact-vs-zoho-campaigns",
  "deel-vs-gusto",
  "deel-vs-papaya-global",
  "deel-vs-remote",
  "expensify-vs-navan",
  "expensify-vs-ramp",
  "fathom-vs-fireflies-ai",
  "freshbooks-vs-wave",
  "freshbooks-vs-zoho-books",
  "getresponse-vs-zoho-campaigns",
  "mailerlite-vs-brevo",
  "mailerlite-vs-getresponse",
  "mailerlite-vs-zoho-campaigns",
  "moosend-vs-brevo",
  "moosend-vs-getresponse",
  "moosend-vs-zoho-campaigns",
  "omnisend-vs-brevo",
  "omnisend-vs-zoho-campaigns",
  "papaya-global-vs-remote",
  "quickbooks-online-vs-freshbooks",
  "quickbooks-online-vs-wave",
  "quickbooks-online-vs-xero",
  "quickbooks-online-vs-zoho-books",
  "whatconverts-vs-callrail",
  "whatconverts-vs-ruler-analytics",
  "wave-vs-zoho-books",
  "xero-vs-freshbooks",
  "xero-vs-wave",
  "xero-vs-zoho-books",
];

const WAVE_1 = new Set<string>(COMPARISON_V2_WAVE_1);
const EDITABLE = new Set<string>(cohorts.comparisons.editable);

/** The comparison uses the v2 template: it is in a rollout wave AND the cohort file still says editable. */
export function isComparisonTemplateV2(slug: string): boolean {
  return WAVE_1.has(slug) && EDITABLE.has(slug);
}
