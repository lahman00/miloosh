/**
 * Wix multi-funnel affiliate routing (2026-08-17).
 *
 * Wix's affiliate manager issued FOUR distinct official Impact.com
 * tracking links, one per product line, each with its own campaign ID.
 * These are deliberately NOT collapsed into data/software/wix.json's
 * single `affiliate_url` field (which stays the safe default/fallback —
 * Website Builder, per "if context is unclear, default to Website
 * Builder"). This module is the one place that knows all four, and the
 * one place a page picks the right one for its actual content — see
 * getWixAffiliateUrl() below and its callers (the software page uses the
 * default; comparison pages pick a funnel via WIX_COMPARISON_CONTEXT).
 *
 * Advertiser: Wix — Impact advertiser ID 5514169. Our tracking/publisher
 * ID 7623171. Program/account ID 25616 (shared across all four funnels,
 * visible in each URL's path). Source: Wix affiliate manager email,
 * 2026-08-17.
 */

import type { Software } from "@/data/software";
import { getSoftwareCtaUrl } from "@/lib/affiliate";

export const WIX_CONTEXTS = ["website-builder", "domain", "headless", "ecommerce"] as const;

export type WixFunnelContext = (typeof WIX_CONTEXTS)[number];

export type WixFunnel = {
  context: WixFunnelContext;
  label: string;
  campaignId: string;
  url: string;
  audience: string;
  lastVerifiedAt: string;
};

export const WIX_FUNNELS: Record<WixFunnelContext, WixFunnel> = {
  "website-builder": {
    context: "website-builder",
    label: "Website Builder",
    campaignId: "2096727",
    url: "https://wix.pxf.io/c/7623171/2096727/25616?trafcat=wsb",
    audience: "General Wix reviews, website builder comparisons, Wix alternatives for a normal website builder, small business/creator/freelancer website content.",
    lastVerifiedAt: "2026-08-17",
  },
  domain: {
    context: "domain",
    label: "Domain",
    campaignId: "2097932",
    url: "https://wix.pxf.io/c/7623171/2097932/25616?trafcat=domain",
    audience: "Domain-related content, domain registration comparisons, domain buying guides, relevant domain CTAs.",
    lastVerifiedAt: "2026-08-17",
  },
  headless: {
    context: "headless",
    label: "Headless",
    campaignId: "3972832",
    url: "https://wix.pxf.io/c/7623171/3972832/25616?trafcat=headless",
    audience: "Developers, AI coding tools (Claude Code, Codex, Cursor, Lovable, Bolt), custom frontend, headless architecture, SaaS/MVP development, agencies needing frontend flexibility.",
    lastVerifiedAt: "2026-08-17",
  },
  ecommerce: {
    context: "ecommerce",
    label: "eCommerce",
    campaignId: "2097924",
    url: "https://wix.pxf.io/c/7623171/2097924/25616?trafcat=ecom",
    audience: "Ecommerce comparisons, online store content, Shopify alternatives, ecommerce website builders, merchant/store-building guides.",
    lastVerifiedAt: "2026-08-17",
  },
};

const DEFAULT_CONTEXT: WixFunnelContext = "website-builder";

/** The one function that turns "what is this content actually about" into the correct tracking link. Unknown/omitted context safely falls back to Website Builder — never guesses toward a narrower funnel. */
export function getWixAffiliateUrl(context?: WixFunnelContext | null): string {
  return WIX_FUNNELS[context ?? DEFAULT_CONTEXT].url;
}

export function getWixFunnel(context?: WixFunnelContext | null): WixFunnel {
  return WIX_FUNNELS[context ?? DEFAULT_CONTEXT];
}

/**
 * Per-comparison-pair context, keyed by the OTHER product's slug (every
 * one of these pairs is Wix vs. something else). Classified by genuine
 * product fit plus the Wix partner manager's explicit funnel guidance.
 * Contentful, Sanity, Storyblok, and Strapi are API-first headless CMSs;
 * Joomla vs Wix is also explicitly assigned to Wix Headless per the Wix
 * partner manager's correction on 2026-09-02. Those comparisons route
 * to the Headless funnel. Squarespace, WordPress, Webflow, Ghost, Craft
 * CMS, and Umbraco remain general website-builder/CMS decisions. Shopify
 * (added 2026-08-17, PUBLISHED_COMPARISONS) is a direct ecommerce-
 * platform decision — routes to the eCommerce funnel, the exact intent
 * that funnel exists for. No current Wix comparison is about domains
 * specifically (still an honest gap — no domain-registrar product is in
 * the catalog yet).
 */
export const WIX_COMPARISON_CONTEXT: Record<string, WixFunnelContext> = {
  contentful: "headless",
  sanity: "headless",
  storyblok: "headless",
  strapi: "headless",
  squarespace: "website-builder",
  wordpress: "website-builder",
  webflow: "website-builder",
  ghost: "website-builder",
  joomla: "headless",
  "craft-cms": "website-builder",
  umbraco: "website-builder",
  shopify: "ecommerce",
};

/** Resolves the right funnel for a Wix comparison page from the OTHER product's slug — falls back to the safe Website Builder default for any pairing not explicitly classified above (e.g. a future comparison added later). */
export function getWixContextForComparison(otherSlug: string): WixFunnelContext {
  return WIX_COMPARISON_CONTEXT[otherSlug] ?? DEFAULT_CONTEXT;
}

/** Human-facing Wix product label for a comparison. Keeps the global catalog name as "Wix" while making intent-specific offerings explicit where Wix provided a dedicated funnel. */
export function getWixProductLabelForComparison(otherSlug: string): string {
  const context = getWixContextForComparison(otherSlug);
  if (context === "headless") return "Wix Headless";
  if (context === "ecommerce") return "Wix eCommerce";
  if (context === "domain") return "Wix Domains";
  return "Wix";
}

/**
 * Composes with lib/affiliate.ts's generic single-URL resolver: every
 * product except Wix still resolves through the normal
 * getSoftwareCtaUrl() path (its own data/software/*.json affiliate_url,
 * or the plain official site if none). Only Wix gets routed through the
 * funnel-aware lookup, using the OTHER product in the pairing to pick
 * the right funnel. Kept here (not in lib/affiliate.ts) so that file
 * stays generic and untouched by Wix-specific knowledge.
 */
export function resolveComparisonCtaUrl(software: Software, otherSlug: string): string {
  if (software.slug === "wix") {
    return getWixAffiliateUrl(getWixContextForComparison(otherSlug));
  }
  return getSoftwareCtaUrl(software);
}
