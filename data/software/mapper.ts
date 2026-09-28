import type { AlternativeRaw, SoftwareRaw } from "@/data/software/schema";
import type { Alternative, Software } from "@/data/software/types";

function mapAlternative(raw: AlternativeRaw): Alternative {
  return {
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    bestFor: raw.best_for,
    strengths: raw.strengths,
  };
}

export function mapSoftware(raw: SoftwareRaw): Software {
  return {
    name: raw.name,
    slug: raw.slug,
    category: raw.category,
    description: raw.description,
    website: raw.website,
    logo: raw.logo,
    founded: raw.founded,
    company: raw.company,
    pricing: raw.pricing
      ? {
          model: raw.pricing.model,
          startingPrice: raw.pricing.starting_price,
          hasFreeTier: raw.pricing.has_free_tier,
          status: raw.pricing.status,
          freePlan: raw.pricing.free_plan,
          freeTrial: raw.pricing.free_trial,
          entryPaid: raw.pricing.entry_paid
            ? {
                amount: raw.pricing.entry_paid.amount,
                currency: raw.pricing.entry_paid.currency,
                billingPeriod: raw.pricing.entry_paid.billing_period,
                perSeat: raw.pricing.entry_paid.per_seat,
                annualBillingRequired: raw.pricing.entry_paid.annual_billing_required,
              }
            : undefined,
          tiers: raw.pricing.tiers?.map((t) => ({
            name: t.name,
            amount: t.amount,
            currency: t.currency,
            billingPeriod: t.billing_period,
            annualBillingRequired: t.annual_billing_required,
            unit: t.unit,
            notes: t.notes,
          })),
          enterpriseContactSales: raw.pricing.enterprise_contact_sales,
          lastVerified: raw.pricing.last_verified,
          officialSource: raw.pricing.official_source,
        }
      : undefined,
    platforms: raw.platforms,
    bestFor: raw.best_for,
    pros: raw.pros,
    cons: raw.cons,
    features: raw.features,
    alternatives: raw.alternatives.map(mapAlternative),
    faq: raw.faq,
    tags: raw.tags,
    sources: raw.sources,
    accessedAt: raw.accessed_at,
    affiliateUrl: raw.affiliate_url,
    sponsored: raw.sponsored,
    featured: raw.featured,
    links: raw.links
      ? {
          pricing: raw.links.pricing,
          docs: raw.links.docs,
          support: raw.links.support,
          integrations: raw.links.integrations,
          status: raw.links.status,
          community: raw.links.community,
          trial: raw.links.trial,
          deals: raw.links.deals,
          enterprise: raw.links.enterprise,
        }
      : undefined,
  };
}
