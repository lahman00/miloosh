import type { Software } from "@/data/software";
import { KNOWN_CTA_LOCATIONS, normalizeCtaLocation } from "@/lib/analytics/cta-locations";

/**
 * Resolve direct vendor-link destinations from the canonical software record.
 * Never accepts a browser-supplied destination URL.
 */
export function resolveVendorLinkUrl(software: Software, ctaLocation?: string): string {
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

export const outboundDestinationTestHelpers = {
  resolveVendorLinkUrl,
  normalizeCtaLocation,
  KNOWN_CTA_LOCATIONS,
};
