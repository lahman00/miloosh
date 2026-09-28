import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase, alphanumeric, and hyphen-separated");

export const alternativeRawSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().min(1),
  best_for: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1),
});

export const pricingTierRawSchema = z.object({
  name: z.string().min(1),
  amount: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  // Unit semantics: this describes the numeric amount above. A "$10/month,
  // billed annually" price is monthly here; the contract cadence belongs in
  // annual_billing_required. Use "annual" only when amount itself is yearly.
  billing_period: z.enum(["monthly", "annual", "one_time", "unknown"]).optional(),
  annual_billing_required: z.boolean().optional(),
  unit: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

/**
 * 2026-08-17 growth sprint, Phase 3 — extended, source-backed pricing
 * schema. The original three fields (model/starting_price/has_free_tier,
 * Sprint 6) stay as-is for backward compatibility — nothing here is a
 * breaking change. The new fields below are additive and all optional:
 * status/last_verified/official_source exist specifically so a pricing
 * claim can be dated and sourced the same way every other factual claim
 * on this site already is (see accessed_at at the top level), rather
 * than a bare number with no provenance. Never populate entry_paid or
 * tiers by inference/guessing — only from an official vendor pricing
 * page, recorded with its real billing basis (monthly vs annual)
 * explicit, never silently converted.
 */
export const pricingRawSchema = z.object({
  model: z.enum(["free", "freemium", "paid", "open_source", "unknown"]).optional(),
  starting_price: z.string().min(1).optional(),
  has_free_tier: z.boolean().optional(),
  status: z.enum(["verified", "unavailable", "contact_sales", "free_only", "unknown"]).optional(),
  free_plan: z.boolean().optional(),
  free_trial: z
    .object({
      available: z.boolean(),
      days: z.number().int().positive().optional(),
    })
    .optional(),
  entry_paid: z
    .object({
      amount: z.string().min(1),
      currency: z.string().min(1),
      billing_period: z.enum(["monthly", "annual", "one_time", "unknown"]),
      per_seat: z.boolean().optional(),
      annual_billing_required: z.boolean().optional(),
    })
    .optional(),
  tiers: z.array(pricingTierRawSchema).optional(),
  enterprise_contact_sales: z.boolean().optional(),
  /** YYYY-MM-DD this specific pricing data was checked — distinct from the top-level accessed_at, since pricing changes far more often than the rest of a product's profile. */
  last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  official_source: z.string().url().optional(),
});

export const faqItemRawSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

// Sprint 6 Phase 5 — vendor link blocks. All optional; official_url
// (website) already exists as its own required field. None of these are
// populated on any entry today — no URL is invented without a verified
// official source. See docs/monetization.md.
export const vendorLinksRawSchema = z.object({
  pricing: z.string().url().optional(),
  docs: z.string().url().optional(),
  support: z.string().url().optional(),
  integrations: z.string().url().optional(),
  status: z.string().url().optional(),
  community: z.string().url().optional(),
  // Sprint 20 Phase 7 — affiliate-readiness insertion points, same rule as
  // the six above: schema-supported, never populated without a real URL.
  trial: z.string().url().optional(),
  deals: z.string().url().optional(),
  enterprise: z.string().url().optional(),
});

export const softwareRawSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  category: slugSchema,
  description: z.string().min(1),
  website: z.string().url(),
  logo: z.string().min(1).optional(),
  founded: z.number().int().min(1900).max(2100).optional(),
  company: z.string().min(1).optional(),
  pricing: pricingRawSchema.optional(),
  platforms: z.array(z.string().min(1)).optional(),
  best_for: z.string().min(1),
  pros: z.array(z.string().min(1)).optional(),
  cons: z.array(z.string().min(1)).optional(),
  features: z.array(z.string().min(1)).min(1),
  alternatives: z.array(alternativeRawSchema).min(1),
  faq: z.array(faqItemRawSchema).optional(),
  tags: z.array(z.string().min(1)).optional(),
  sources: z.array(z.string().url()).min(1),
  // Date the sources[] URLs above were fetched/verified, YYYY-MM-DD. Backs
  // the Sources Policy page's "access dates are stored" claim — see
  // docs/legal-and-trust.md.
  accessed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  order: z.number().int().optional(),
  // Phase 5 — monetization-ready architecture. Schema-supported, never
  // populated with fabricated data. See docs/monetization.md.
  affiliate_url: z.string().url().optional(),
  sponsored: z.boolean().optional(),
  featured: z.boolean().optional(),
  links: vendorLinksRawSchema.optional(),
});

export type AlternativeRaw = z.infer<typeof alternativeRawSchema>;
export type PricingRaw = z.infer<typeof pricingRawSchema>;
export type FaqItemRaw = z.infer<typeof faqItemRawSchema>;
export type VendorLinksRaw = z.infer<typeof vendorLinksRawSchema>;
export type SoftwareRaw = z.infer<typeof softwareRawSchema>;
