export type FirstRevenueGuidePlan = {
  slug: string;
  label: string;
  activePartnerSlugs: string[];
  decisionQueries: string[];
};

export const FIRST_REVENUE_GUIDES: readonly FirstRevenueGuidePlan[] = [
  {
    slug: "best-ecommerce-platform-for-small-business",
    label: "Ecommerce platform decision",
    activePartnerSlugs: ["shopify", "wix"],
    decisionQueries: [
      "best ecommerce platform for small business",
      "shopify vs woocommerce for small business",
      "shopify vs wix for ecommerce",
      "wix vs woocommerce for small business",
    ],
  },
  {
    slug: "best-crm-for-sales-teams",
    label: "Sales CRM decision",
    activePartnerSlugs: ["pipedrive", "close"],
    decisionQueries: [
      "best crm for small sales team",
      "pipedrive vs close crm",
      "pipedrive vs hubspot for sales teams",
      "close vs hubspot sales crm",
    ],
  },
  {
    slug: "best-project-management-for-agencies",
    label: "Agency project management decision",
    activePartnerSlugs: ["monday", "wrike"],
    decisionQueries: [
      "best project management software for agencies",
      "monday vs wrike for agencies",
      "monday vs clickup for agencies",
      "wrike vs clickup for agency",
    ],
  },
  {
    slug: "best-email-marketing-for-ecommerce",
    label: "Ecommerce email platform decision",
    activePartnerSlugs: ["omnisend", "mailerlite"],
    decisionQueries: [
      "best email marketing for ecommerce",
      "omnisend vs mailerlite ecommerce",
      "omnisend vs klaviyo for shopify",
      "mailerlite vs klaviyo ecommerce",
    ],
  },
  {
    slug: "best-lead-tracking-for-agencies",
    label: "Agency lead attribution decision",
    activePartnerSlugs: ["whatconverts"],
    decisionQueries: [
      "best lead tracking software for agencies",
      "whatconverts vs callrail for agencies",
      "whatconverts vs ruler analytics",
      "call tracking and lead attribution software for agencies",
    ],
  },
] as const;

export const FIRST_REVENUE_GUIDE_SLUGS = new Set(FIRST_REVENUE_GUIDES.map((guide) => guide.slug));

export function getFirstRevenueGuidePlan(slug: string): FirstRevenueGuidePlan | undefined {
  return FIRST_REVENUE_GUIDES.find((guide) => guide.slug === slug);
}
