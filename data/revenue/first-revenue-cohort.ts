export type FirstRevenueQuery = {
  query: string;
  evidence: "measured-gsc" | "decision-target";
};

export type FirstRevenuePage = {
  slug: "airtable" | "todoist" | "close" | "setmore" | "elevenlabs";
  priority: number;
  baseline: { impressions: number; clicks: number; position: number };
  ctaLabel: string;
  notFor: string;
  queries: FirstRevenueQuery[];
};

export const FIRST_REVENUE_CAPTURED_AT = "2026-09-24T21:25:05.877225Z";
export const FIRST_REVENUE_GSC_WINDOW = { startDate: "2026-08-07", endDate: "2026-09-21" };

export const FIRST_REVENUE_PAGES: FirstRevenuePage[] = [
  {
    slug: "airtable",
    priority: 1,
    baseline: { impressions: 329, clicks: 1, position: 78.4 },
    ctaLabel: "Check Airtable pricing",
    notFor: "Skip it if you mainly need a lightweight task list or a docs-first workspace rather than structured relational data.",
    queries: [
      { query: "airtable pricing", evidence: "decision-target" },
      { query: "airtable alternatives", evidence: "decision-target" },
      { query: "airtable vs notion", evidence: "decision-target" },
      { query: "airtable vs monday", evidence: "decision-target" },
    ],
  },
  {
    slug: "todoist",
    priority: 2,
    baseline: { impressions: 167, clicks: 0, position: 69.9 },
    ctaLabel: "Check Todoist pricing",
    notFor: "Skip it if your team needs a broader project system with deep reporting, built-in time tracking, or a company wiki.",
    queries: [
      { query: "todoist alternative", evidence: "measured-gsc" },
      { query: "todoist pricing", evidence: "decision-target" },
      { query: "todoist vs ticktick", evidence: "decision-target" },
      { query: "todoist vs microsoft to do", evidence: "decision-target" },
    ],
  },
  {
    slug: "close",
    priority: 3,
    baseline: { impressions: 93, clicks: 0, position: 68.3 },
    ctaLabel: "Try Close free",
    notFor: "Skip it if your sales workflow does not benefit from built-in calling, email and SMS, or if usage-based communications costs are a poor fit.",
    queries: [
      { query: "close crm pricing", evidence: "decision-target" },
      { query: "close crm alternatives", evidence: "decision-target" },
      { query: "close vs pipedrive", evidence: "decision-target" },
      { query: "close vs hubspot", evidence: "decision-target" },
    ],
  },
  {
    slug: "setmore",
    priority: 4,
    baseline: { impressions: 80, clicks: 0, position: 70.0 },
    ctaLabel: "Check Setmore pricing",
    notFor: "Skip it if you need paid-plan features such as two-way calendar sync or SMS reminders but are committed to a free-only setup.",
    queries: [
      { query: "setmore alternatives", evidence: "measured-gsc" },
      { query: "acuity scheduling vs setmore", evidence: "measured-gsc" },
      { query: "setmore pricing", evidence: "decision-target" },
      { query: "setmore vs calendly", evidence: "decision-target" },
    ],
  },
  {
    slug: "elevenlabs",
    priority: 5,
    baseline: { impressions: 67, clicks: 0, position: 73.2 },
    ctaLabel: "Check ElevenLabs pricing",
    notFor: "Skip it if you need unrestricted commercial use on a free plan or predictable high-volume usage without credit limits.",
    queries: [
      { query: "elevenlabs alternatives", evidence: "measured-gsc" },
      { query: "elevenlabs pricing", evidence: "decision-target" },
      { query: "elevenlabs vs murf ai", evidence: "decision-target" },
      { query: "elevenlabs vs descript", evidence: "decision-target" },
    ],
  },
];

export const FIRST_REVENUE_SLUGS = new Set(FIRST_REVENUE_PAGES.map((page) => page.slug));

export function getFirstRevenuePage(slug: string): FirstRevenuePage | undefined {
  return FIRST_REVENUE_PAGES.find((page) => page.slug === slug);
}
