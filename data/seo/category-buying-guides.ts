/**
 * Master Google War Phase II (2026-09-26) — real, evidence-backed gap this
 * closes: scripts/growth/category map (var/growth/google-war-phase2/
 * category-indexation-map.json) found "analytics" and "security" have the
 * highest never-crawled rates among categories with real GSC demand (46%
 * and 39% of their products respectively), despite already-solid factual
 * depth (medians 82 and 81). The category page itself (app/category/
 * [slug]/page.tsx) is a flat, undifferentiated grid of every member
 * product — for these two categories specifically, the member list is
 * genuinely heterogeneous (analytics mixes web/product analytics, BI
 * dashboards, survey tools, and raw data infrastructure; security mixes
 * password managers, identity/access, endpoint/threat detection, and
 * compliance/GRC), so a flat list serves no single buyer question well.
 * This is the "ambiguous intent" cause the mission's own category-analysis
 * framework names as a real, distinct possibility — not asserted as the
 * proven cause of the crawl gap, just a genuine, sourced editorial
 * improvement (grouping real category members by the actual job they do,
 * using each product's own already-published category/best_for/pricing
 * fields) that a buyer landing on a 20+ item flat grid would concretely
 * benefit from regardless of the indexation outcome.
 *
 * Deliberately scoped to only the two categories with real evidence behind
 * them this session — not applied blindly to all 27 categories.
 */

export type CategoryBuyingDimension = {
  label: string;
  description: string;
  memberSlugs: string[];
};

export type CategoryBuyingGuide = {
  intro: string;
  dimensions: CategoryBuyingDimension[];
};

export const CATEGORY_BUYING_GUIDES: Record<string, CategoryBuyingGuide> = {
  analytics: {
    intro:
      "\"Analytics\" covers several genuinely different jobs. Before comparing individual tools, it helps to know which of these you actually need — a product-analytics platform for user behavior, a BI tool for dashboards and reporting, a data-infrastructure layer for moving and warehousing raw data, or a survey/feedback tool.",
    dimensions: [
      {
        label: "Product and web analytics",
        description: "Tracking what visitors and users actually do on a site or in a product — page views, events, funnels, session replay.",
        memberSlugs: ["google-analytics", "adobe-analytics", "heap", "mixpanel", "posthog", "hotjar", "fullstory", "plausible", "matomo", "fathom-analytics", "crazy-egg", "amplitude", "segment"],
      },
      {
        label: "Business intelligence and dashboards",
        description: "Turning business data (often from several systems) into reports and dashboards for decision-making.",
        memberSlugs: ["tableau", "looker", "microsoft-power-bi", "domo"],
      },
      {
        label: "Data infrastructure and warehousing",
        description: "Moving, storing, and transforming raw data at scale — the layer underneath BI tools and custom reporting, usually an engineering-owned decision rather than a marketing or product one.",
        memberSlugs: ["databricks", "snowflake", "google-cloud-bigquery", "dbt-cloud", "fivetran", "airbyte"],
      },
      {
        label: "Surveys and enterprise feedback",
        description: "Collecting structured feedback directly from customers or employees, rather than passively observing behavior.",
        memberSlugs: ["qualtrics", "surveymonkey"],
      },
      {
        label: "Trade and supply-chain intelligence",
        description: "Shipment-level customs and trade data for tracking suppliers, competitors, and global supply chains — a different discipline from web or product analytics.",
        memberSlugs: ["volza"],
      },
    ],
  },
  security: {
    intro:
      "\"Security\" software spans several distinct buying decisions with different budget owners. It's worth identifying which one you're actually solving for before comparing vendors within it.",
    dimensions: [
      {
        label: "Password and credential management",
        description: "A shared vault for passwords and other secrets, for individuals or teams.",
        memberSlugs: ["1password", "bitwarden", "dashlane", "keeper", "keeper-security", "lastpass", "nordpass"],
      },
      {
        label: "Identity, access, and network security",
        description: "Controlling who can authenticate into what — single sign-on, multi-factor authentication, and network-level access control.",
        memberSlugs: ["auth0", "okta", "duo-security", "tailscale"],
      },
      {
        label: "Endpoint, cloud, and threat detection",
        description: "Detecting and responding to active threats across devices, cloud infrastructure, or application code.",
        memberSlugs: ["crowdstrike", "sentinelone", "sophos-endpoint", "wiz", "cloudflare", "snyk"],
      },
      {
        label: "Compliance and security-program management (GRC)",
        description: "Managing audits, policies, and evidence for frameworks like SOC 2 or ISO 27001, plus security-awareness training.",
        memberSlugs: ["drata", "knowbe4", "onetrust", "secureframe", "sprinto", "vanta"],
      },
    ],
  },
};

export function getCategoryBuyingGuide(categorySlug: string): CategoryBuyingGuide | undefined {
  return CATEGORY_BUYING_GUIDES[categorySlug];
}
