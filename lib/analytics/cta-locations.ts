/** Finite vocabulary shared by impressions, browser clicks and handoffs. */
export const KNOWN_CTA_LOCATIONS = new Set([
  "software-page-cta", "buyer-checklist-cta", "pricing-section-cta", "alternative-decision-guide",
  "compare-page-choose-card", "role-guide-card-cta", "role-guide-summary-table",
  "money-page-decision-card", "money-page-sticky-cta", "pricing-source-link",
  "vendor-link-pricing", "vendor-link-free-trial", "vendor-link-documentation", "vendor-link-support",
  "vendor-link-integrations", "vendor-link-status-page", "vendor-link-community",
  "vendor-link-current-deals", "vendor-link-enterprise-contact", "vendor-link",
]);
export function normalizeCtaLocation(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return KNOWN_CTA_LOCATIONS.has(value) ? value : "unknown-cta-location";
}
