/**
 * Canonical Miloosh First Revenue cohort.
 *
 * IMPORTANT:
 * - These five software pages are the PRIMARY money pages for the first-revenue sprint.
 * - gscPageSnapshot is measured page-level Search Console evidence from
 *   data/seo/priority-snapshot.json. It is NOT query-volume data.
 * - decisionQueryTargets are editorial/search targets selected from the buyer
 *   decisions these pages must answer. Never present them as measured GSC query volume.
 * - Do not add products to this cohort without a deliberate cohort change.
 */

export const FIRST_REVENUE_PRIMARY_SLUGS = [
  "airtable",
  "todoist",
  "close",
  "setmore",
  "elevenlabs",
] as const;

export type FirstRevenuePrimarySlug = (typeof FIRST_REVENUE_PRIMARY_SLUGS)[number];

export type FirstRevenueCohortEntry = {
  slug: FirstRevenuePrimarySlug;
  gscPageSnapshot: {
    impressions: number;
    clicks: number;
    ctr: number;
    averagePosition: number;
    source: "data/seo/priority-snapshot.json";
  };
  decisionQueryTargets: readonly string[];
  measuredDecisionRoutes: readonly {
    path: string;
    impressions: number;
    clicks: number;
    averagePosition: number;
  }[];
  chooseIf: readonly string[];
  skipIf: readonly string[];
  ctaLabel: string;
  affiliateEvidence: "data/affiliate/active-partners.ts";
};

export const FIRST_REVENUE_COHORT: readonly FirstRevenueCohortEntry[] = [
  {
    slug: "airtable",
    gscPageSnapshot: {
      impressions: 329,
      clicks: 1,
      ctr: 0.003,
      averagePosition: 78.4,
      source: "data/seo/priority-snapshot.json",
    },
    decisionQueryTargets: [
      "airtable pricing",
      "airtable review",
      "airtable alternatives",
      "airtable vs notion",
    ],
    measuredDecisionRoutes: [
      { path: "/compare/evernote-vs-airtable", impressions: 4, clicks: 0, averagePosition: 58.0 },
      { path: "/compare/airtable-vs-ticktick", impressions: 1, clicks: 0, averagePosition: 52.0 },
    ],
    chooseIf: [
      "You need relational data with spreadsheet-like views, interfaces, and workflow automation.",
      "Your team is moving beyond ordinary spreadsheets but does not want to build a custom database application from scratch.",
    ],
    skipIf: [
      "You need more than 5 editors on a permanent free plan.",
      "Per-base record and attachment limits are likely to be a recurring constraint for your workflow.",
    ],
    ctaLabel: "Check Airtable plans",
    affiliateEvidence: "data/affiliate/active-partners.ts",
  },
  {
    slug: "todoist",
    gscPageSnapshot: {
      impressions: 167,
      clicks: 0,
      ctr: 0,
      averagePosition: 69.9,
      source: "data/seo/priority-snapshot.json",
    },
    decisionQueryTargets: [
      "todoist pricing",
      "todoist review",
      "todoist alternatives",
      "todoist vs ticktick",
    ],
    measuredDecisionRoutes: [
      { path: "/compare/todoist-vs-microsoft-onenote", impressions: 9, clicks: 0, averagePosition: 52.2 },
      { path: "/compare/todoist-vs-superhuman", impressions: 6, clicks: 0, averagePosition: 5.8 },
      { path: "/compare/todoist-vs-motion", impressions: 4, clicks: 0, averagePosition: 57.5 },
      { path: "/compare/todoist-vs-clockify", impressions: 2, clicks: 0, averagePosition: 8.5 },
    ],
    chooseIf: [
      "You want fast cross-platform task capture with natural-language entry, recurring tasks, filters, and calendar views.",
      "You prefer a focused task manager over a broader all-in-one workspace.",
    ],
    skipIf: [
      "You need built-in time tracking.",
      "You want extensive document or wiki functionality inside the same product.",
    ],
    ctaLabel: "Check Todoist plans",
    affiliateEvidence: "data/affiliate/active-partners.ts",
  },
  {
    slug: "close",
    gscPageSnapshot: {
      impressions: 93,
      clicks: 0,
      ctr: 0,
      averagePosition: 68.3,
      source: "data/seo/priority-snapshot.json",
    },
    decisionQueryTargets: [
      "close crm pricing",
      "close crm review",
      "close crm alternatives",
      "close vs pipedrive",
    ],
    measuredDecisionRoutes: [
      { path: "/compare/close-vs-copper", impressions: 1, clicks: 0, averagePosition: 65.0 },
    ],
    chooseIf: [
      "Your sales team wants calling, email, SMS, pipeline management, and follow-up automation in one CRM.",
      "High-velocity outbound selling is a core workflow and reducing manual sales administration matters.",
    ],
    skipIf: [
      "You need a permanent free CRM tier.",
      "Your priority is a broad marketing-and-service suite rather than a sales-focused CRM.",
    ],
    ctaLabel: "Start Close trial",
    affiliateEvidence: "data/affiliate/active-partners.ts",
  },
  {
    slug: "setmore",
    gscPageSnapshot: {
      impressions: 80,
      clicks: 0,
      ctr: 0,
      averagePosition: 70.0,
      source: "data/seo/priority-snapshot.json",
    },
    decisionQueryTargets: [
      "setmore pricing",
      "setmore review",
      "setmore alternatives",
      "setmore vs acuity scheduling",
    ],
    measuredDecisionRoutes: [
      { path: "/compare/acuity-scheduling-vs-setmore", impressions: 9, clicks: 0, averagePosition: 63.7 },
      { path: "/compare/setmore-vs-youcanbookme", impressions: 1, clicks: 0, averagePosition: 41.0 },
    ],
    chooseIf: [
      "You run a service business that needs online booking, staff calendars, reminders, and payment integrations.",
      "A usable free tier with multiple staff calendars and unlimited appointments is important.",
    ],
    skipIf: [
      "You need two-way Google or Office calendar sync while staying on the free plan.",
      "You need more flexible intake-form customization or recurring service packages.",
    ],
    ctaLabel: "See Setmore options",
    affiliateEvidence: "data/affiliate/active-partners.ts",
  },
  {
    slug: "elevenlabs",
    gscPageSnapshot: {
      impressions: 67,
      clicks: 0,
      ctr: 0,
      averagePosition: 73.2,
      source: "data/seo/priority-snapshot.json",
    },
    decisionQueryTargets: [
      "elevenlabs pricing",
      "elevenlabs review",
      "elevenlabs alternatives",
      "elevenlabs vs descript",
    ],
    measuredDecisionRoutes: [
      { path: "/compare/chatgpt-vs-elevenlabs", impressions: 2, clicks: 0, averagePosition: 54.5 },
      { path: "/compare/elevenlabs-vs-runway", impressions: 1, clicks: 0, averagePosition: 52.0 },
    ],
    chooseIf: [
      "You need expressive text-to-speech, multilingual voice generation, voice cloning, dubbing, or a developer speech API.",
      "Voice quality and a specialized audio stack matter more than having a general-purpose video editor.",
    ],
    skipIf: [
      "Your long-form or high-volume workload is likely to exceed monthly credit quotas quickly.",
      "You need commercial usage from the free plan without its stated restrictions.",
    ],
    ctaLabel: "Try ElevenLabs",
    affiliateEvidence: "data/affiliate/active-partners.ts",
  },
] as const;

const FIRST_REVENUE_BY_SLUG = new Map(
  FIRST_REVENUE_COHORT.map((entry) => [entry.slug, entry] as const),
);

export function getFirstRevenueEntry(slug: string): FirstRevenueCohortEntry | undefined {
  return FIRST_REVENUE_BY_SLUG.get(slug as FirstRevenuePrimarySlug);
}

export function isFirstRevenuePrimarySlug(slug: string): slug is FirstRevenuePrimarySlug {
  return FIRST_REVENUE_BY_SLUG.has(slug as FirstRevenuePrimarySlug);
}

export const FIRST_REVENUE_DECISION_QUERY_TARGET_COUNT = FIRST_REVENUE_COHORT.reduce(
  (count, entry) => count + entry.decisionQueryTargets.length,
  0,
);
