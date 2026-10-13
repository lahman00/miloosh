import type { getSoftware } from "@/data/software";

/**
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) P1-2: the finite,
 * real set of ctaLocation values this codebase actually sends -- swept
 * directly from every literal `ctaLocation="..."` in components/app (6
 * commercial CTA surfaces) plus the 9 fixed vendor-link labels
 * components/VendorLinksBlock.tsx hardcodes (never user input, so this
 * list is exhaustive by construction, not a guess) plus the
 * `pricing-source-link` editorial surface and the `vendor-link` fallback
 * used when a vendor-link click carries no specific location. A client
 * could still send an arbitrary string here (this endpoint is public),
 * so anything outside this set is normalized to a single bounded
 * sentinel rather than stored verbatim -- unbounded arbitrary strings
 * must never become unbounded analytics cardinality.
 */
export const KNOWN_CTA_LOCATIONS = new Set([
  "software-page-cta",
  "buyer-checklist-cta",
  "pricing-section-cta",
  "alternative-decision-guide",
  "compare-page-choose-card",
  "role-guide-card-cta",
  "role-guide-summary-table",
  "money-page-decision-card",
  "money-page-sticky-cta",
  "pricing-source-link",
  "vendor-link-pricing",
  "vendor-link-free-trial",
  "vendor-link-documentation",
  "vendor-link-support",
  "vendor-link-integrations",
  "vendor-link-status-page",
  "vendor-link-community",
  "vendor-link-current-deals",
  "vendor-link-enterprise-contact",
  "vendor-link",
]);

export function normalizeCtaLocation(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return KNOWN_CTA_LOCATIONS.has(value) ? value : "unknown-cta-location";
}

type SoftwareRecord = NonNullable<ReturnType<typeof getSoftware>>;

/**
 * Direct vendor links may target a specific server-verified subpage rather
 * than the vendor homepage. Resolve those destinations from the canonical
 * software record and the finite ctaLocation vocabulary, never from a URL
 * supplied by the browser. Unknown locations fail safely to the homepage.
 */
export function resolveVendorLinkUrl(software: SoftwareRecord, ctaLocation?: string): string {
  switch (ctaLocation) {
    case "pricing-source-link":
      return software.pricing?.officialSource ?? software.website;
    case "vendor-link-pricing":
      return software.links?.pricing ?? software.website;
    case "vendor-link-free-trial":
      return software.links?.trial ?? software.website;
    case "vendor-link-documentation":
      return software.links?.docs ?? software.website;
    case "vendor-link-support":
      return software.links?.support ?? software.website;
    case "vendor-link-integrations":
      return software.links?.integrations ?? software.website;
    case "vendor-link-status-page":
      return software.links?.status ?? software.website;
    case "vendor-link-community":
      return software.links?.community ?? software.website;
    case "vendor-link-current-deals":
      return software.links?.deals ?? software.website;
    case "vendor-link-enterprise-contact":
      return software.links?.enterprise ?? software.website;
    default:
      return software.website;
  }
}
