export type Alternative = {
  name: string;
  slug: string;
  description: string;
  bestFor: string;
  strengths: string[];
};

export type PricingTier = {
  name: string;
  amount?: string;
  currency?: string;
  billingPeriod?: "monthly" | "annual" | "one_time" | "unknown";
  annualBillingRequired?: boolean;
  unit?: string;
  notes?: string;
};

export type Pricing = {
  model?: "free" | "freemium" | "paid" | "open_source" | "unknown";
  startingPrice?: string;
  hasFreeTier?: boolean;
  /** 2026-08-17 growth sprint — source-backed pricing fields, all additive to the original three above. */
  status?: "verified" | "unavailable" | "contact_sales" | "free_only" | "unknown";
  freePlan?: boolean;
  freeTrial?: { available: boolean; days?: number };
  entryPaid?: { amount: string; currency: string; billingPeriod: "monthly" | "annual" | "one_time" | "unknown"; perSeat?: boolean; annualBillingRequired?: boolean };
  tiers?: PricingTier[];
  enterpriseContactSales?: boolean;
  /** YYYY-MM-DD — distinct from the product's top-level accessedAt; pricing goes stale faster than the rest of the profile. */
  lastVerified?: string;
  officialSource?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

/** Sprint 6 Phase 5 — vendor link blocks. All optional; none populated today. */
export type VendorLinks = {
  pricing?: string;
  docs?: string;
  support?: string;
  integrations?: string;
  status?: string;
  community?: string;
  /** Sprint 20 Phase 7 — affiliate-readiness insertion points. */
  trial?: string;
  deals?: string;
  enterprise?: string;
};

export type Software = {
  name: string;
  slug: string;
  category: string;
  description: string;
  website: string;
  logo?: string;
  founded?: number;
  company?: string;
  pricing?: Pricing;
  platforms?: string[];
  bestFor: string;
  pros?: string[];
  cons?: string[];
  features: string[];
  alternatives: Alternative[];
  faq?: FaqItem[];
  tags?: string[];
  sources: string[];
  /** Date sources[] was fetched/verified, YYYY-MM-DD. */
  accessedAt: string;
  /** Phase 5 — monetization-ready architecture. Never fabricated; see docs/monetization.md. */
  affiliateUrl?: string;
  sponsored?: boolean;
  featured?: boolean;
  links?: VendorLinks;
};
