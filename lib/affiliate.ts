import type { Software } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getAffiliateActivation, hasCurrentActiveRelationship } from "@/lib/revenue/affiliate-manager";

/**
 * Reusable affiliate-link architecture.
 *
 * Source precedence is intentional:
 * 1. canonical active-partner registry URL;
 * 2. legacy runtime activation, which itself is restricted to a current ACTIVE relationship;
 * 3. software-entry affiliateUrl fallback -- MILOOSH CRITICAL MONETIZATION
 *    CLOSEOUT (2026-08-29) P1-1: this catalog-level field (docs/monetization.md's
 *    original Sprint 4/6 design, predating the current canonical-ledger/
 *    active-partners operational-truth system) used to activate monetization
 *    on its own, with no cross-check against that system at all -- a stale
 *    or accidentally-set affiliateUrl in a product's JSON could silently go
 *    live with sponsored/disclosure rendering and no verified relationship
 *    behind it. Now gated behind the exact same operational-truth check
 *    (hasCurrentActiveRelationship) already used to gate the env/config-file
 *    fallback below it, so a bare catalog-level URL can never independently
 *    activate monetization -- there must also be a real ACTIVE relationship
 *    on record for the same slug;
 * 4. official vendor URL.
 *
 * An environment variable must never override a network-issued URL already
 * verified in the canonical active registry.
 */

export type AffiliateLink = {
  officialUrl: string;
  affiliateUrl?: string;
};

export function preferredUrl(link: AffiliateLink): string {
  return link.affiliateUrl || link.officialUrl;
}

export function isAffiliateLink(link: AffiliateLink): boolean {
  return Boolean(link.affiliateUrl);
}

export function affiliateRel(link: AffiliateLink): string {
  return isAffiliateLink(link) ? "sponsored noopener noreferrer" : "noopener noreferrer";
}

/**
 * Appends optional Miloosh tracking parameters without overwriting parameters
 * already issued by the affiliate network. Existing keys always win.
 */
export function withTrackingParams(url: string, params: Record<string, string>): string {
  if (Object.keys(params).length === 0) return url;

  try {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getConfiguredTrackingParams(): Record<string, string> {
  const ref = process.env.NEXT_PUBLIC_AFFILIATE_REF;
  return ref ? { ref } : {};
}

function softwareToAffiliateLink(software: Software): AffiliateLink {
  const registeredPartnerUrl = getActivePartner(software.slug)?.affiliateUrl ?? undefined;
  const activation = registeredPartnerUrl ? null : getAffiliateActivation(software.slug);
  const gatedCatalogUrl =
    software.affiliateUrl && hasCurrentActiveRelationship(software.slug) ? software.affiliateUrl : undefined;
  const affiliateUrl =
    registeredPartnerUrl ??
    (activation?.isActive ? activation.affiliateUrl ?? undefined : undefined) ??
    gatedCatalogUrl;

  return { officialUrl: software.website, affiliateUrl };
}

export function getSoftwareCtaUrl(software: Software): string {
  const link = softwareToAffiliateLink(software);
  const url = preferredUrl(link);
  return isAffiliateLink(link) ? withTrackingParams(url, getConfiguredTrackingParams()) : url;
}

export function getSoftwareCtaRel(software: Software): string {
  return affiliateRel(softwareToAffiliateLink(software));
}

export function shouldShowAffiliateDisclosure(software: Software): boolean {
  return isAffiliateLink(softwareToAffiliateLink(software));
}
