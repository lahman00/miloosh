/** Historical comparison enhancement cohort, NOT the active conversion campaign.
 * Primary targets and query evidence: data/revenue/first-revenue-cohort.ts.
 * Keep existing URLs/indexability; do not distribute this as a second five-page sprint.
 */
export type DecisionMoneyPageConfig = {
  comparison: string;
  updatedAt: string;
  queryCluster: readonly string[];
  decisionQuestion: string;
  recheckBeforeBuying: readonly string[];
};

export const DECISION_MONEY_PAGES: readonly DecisionMoneyPageConfig[] = [
  {
    comparison: "wix-vs-shopify",
    updatedAt: "2026-09-25",
    queryCluster: [
      "wix vs shopify",
      "shopify vs wix for small business",
      "wix vs shopify pricing",
      "should i switch from wix to shopify",
    ],
    decisionQuestion:
      "Do you need a broader website builder with commerce, or a commerce-first operating system for the store?",
    recheckBeforeBuying: [
      "You need self-hosted or open-source ownership — compare WooCommerce before choosing either.",
      "Your migration plan does not yet account for URLs, products, customers, analytics, apps, payments, and redirects.",
    ],
  },
  {
    comparison: "monday-vs-airtable",
    updatedAt: "2026-09-25",
    queryCluster: [
      "monday vs airtable",
      "airtable vs monday for project management",
      "monday vs airtable pricing",
      "should i switch from airtable to monday",
    ],
    decisionQuestion:
      "Is the core problem project execution and coordination, or flexible relational data and custom operational workflows?",
    recheckBeforeBuying: [
      "You mainly need lightweight personal task management — a simpler task app may cost less and require less setup.",
      "You have not priced the required seats, record limits, automations, and higher-tier features for the real team size.",
    ],
  },
  {
    comparison: "constant-contact-vs-getresponse",
    updatedAt: "2026-09-25",
    queryCluster: [
      "constant contact vs getresponse",
      "getresponse vs constant contact pricing",
      "constant contact vs getresponse for small business",
      "constant contact alternative getresponse",
    ],
    decisionQuestion:
      "Do you value straightforward small-business email support and events, or broader automation, funnels, webinars, and ecommerce marketing?",
    recheckBeforeBuying: [
      "Your list is growing quickly but you have not priced the same contact count on both platforms.",
      "Email is only one part of the requirement and your real blocker is CRM, ecommerce lifecycle, or enterprise orchestration.",
    ],
  },
  {
    comparison: "mailerlite-vs-moosend",
    updatedAt: "2026-09-25",
    queryCluster: [
      "mailerlite vs moosend",
      "moosend vs mailerlite pricing",
      "mailerlite vs moosend automation",
      "best email marketing for small business mailerlite moosend",
    ],
    decisionQuestion:
      "Is a permanent free entry tier and broader creator toolkit more important, or lower paid entry pricing with unlimited sends?",
    recheckBeforeBuying: [
      "You need ecommerce-native lifecycle depth — compare Omnisend or another ecommerce-focused platform before committing.",
      "You have not modeled subscriber growth, send volume, automation limits, and support requirements for the next 12 months.",
    ],
  },
  {
    comparison: "surveymonkey-vs-jotform",
    updatedAt: "2026-09-25",
    queryCluster: [
      "surveymonkey vs jotform",
      "jotform vs surveymonkey pricing",
      "surveymonkey vs jotform for surveys",
      "jotform vs surveymonkey for forms",
    ],
    decisionQuestion:
      "Is the job primarily structured survey research and analysis, or operational forms, registrations, approvals, payments, and data collection?",
    recheckBeforeBuying: [
      "You need enterprise-grade research methodology and governance — compare Qualtrics before choosing either.",
      "You have not mapped response/submission limits, required users, payment collection, branding, and logic needs to the paid tier.",
    ],
  },
] as const;

const BY_COMPARISON = new Map(
  DECISION_MONEY_PAGES.map((item) => [item.comparison, item])
);

export function getDecisionMoneyPage(
  comparison: string
): DecisionMoneyPageConfig | undefined {
  return BY_COMPARISON.get(comparison);
}

export const DECISION_STAGE_QUERIES =
  DECISION_MONEY_PAGES.flatMap((item) => item.queryCluster);
