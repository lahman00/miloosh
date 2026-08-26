import type { RecommendDomain } from "@/lib/recommend/domains";
import {
  PRODUCT_PROFILES,
  type ProductProfile,
} from "@/data/recommend/product-profiles";

/**
 * Additive domain evidence discovered after the original Recommend profile
 * authoring pass. Entries here are justified only by the product's stored,
 * sourced editorial record. Affiliate status is deliberately not imported or
 * consulted here.
 *
 * MailerLite and Omnisend were both researched/expanded on 2026-08-24 after
 * the original email_marketing profile set was authored. Their catalog records
 * explicitly describe email campaigns and marketing automation as core buyer
 * jobs, so leaving them CATALOG_ONLY made the Recommend funnel stale relative
 * to current editorial truth.
 *
 * Keep this overlay small and evidence-only. A future consolidation can fold
 * these entries into PRODUCT_PROFILES directly; the helpers below expose one
 * merged source of truth to runtime and coverage tooling in the meantime.
 */
export const SUPPLEMENTAL_PRODUCT_PROFILES: readonly ProductProfile[] = [
  { slug: "mailerlite", domains: ["email_marketing"] },
  { slug: "omnisend", domains: ["email_marketing"] },
] as const;

const MERGED_PROFILE_BY_SLUG = new Map<string, ProductProfile>();

for (const profile of PRODUCT_PROFILES) {
  MERGED_PROFILE_BY_SLUG.set(profile.slug, profile);
}

for (const supplemental of SUPPLEMENTAL_PRODUCT_PROFILES) {
  const existing = MERGED_PROFILE_BY_SLUG.get(supplemental.slug);
  if (!existing) {
    MERGED_PROFILE_BY_SLUG.set(supplemental.slug, supplemental);
    continue;
  }

  const domains = [...new Set([...existing.domains, ...supplemental.domains])];
  MERGED_PROFILE_BY_SLUG.set(existing.slug, {
    slug: existing.slug,
    domains,
  });
}

export function getProductProfileFromEvidence(slug: string): ProductProfile | undefined {
  return MERGED_PROFILE_BY_SLUG.get(slug);
}

export function isEligibleForDomainFromEvidence(slug: string, domain: RecommendDomain): boolean {
  return getProductProfileFromEvidence(slug)?.domains.includes(domain) ?? false;
}

export function getSlugsForDomainFromEvidence(domain: RecommendDomain): string[] {
  return [...MERGED_PROFILE_BY_SLUG.values()]
    .filter((profile) => profile.domains.includes(domain))
    .map((profile) => profile.slug);
}
