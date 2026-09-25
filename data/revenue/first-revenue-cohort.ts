/** Current query evidence: private Mac receipt: ~/MilooshReceipts/20260925-first-revenue-integrity/measured-decision-queries.json.
 * Query metrics are property-wide, not proof of a query-to-primary-page landing.
 * Synonymous queries are grouped into these five existing pages, never new duplicate pages.
 */
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
  buyingCheck: string;
  /** A proposed pre-switch buyer test, not a claim that Miloosh ran a migration. */
  switchingCheck: string;
  /** Existing published head-to-heads for measured "X vs Y" queries that the top-three alternatives table does not already cover. */
  measuredComparisons?: string[];
  queries: FirstRevenueQuery[];
};

// Actual editorial/pricing-panel update, not a claim that every vendor fact was re-verified.
export const FIRST_REVENUE_CONTENT_UPDATED_AT = "2026-09-25";

export const FIRST_REVENUE_CAPTURED_AT = "2026-09-24T21:25:05.877225Z";
export const FIRST_REVENUE_GSC_WINDOW = { startDate: "2026-08-07", endDate: "2026-09-23" };

export const FIRST_REVENUE_PAGES: FirstRevenuePage[] = [
  {
    slug: "airtable",
    buyingCheck: "Rebuild one real workflow with linked records and a form. Count who genuinely needs edit access, then check the required record and automation limits before choosing a paid tier.",
    priority: 1,
    baseline: { impressions: 329, clicks: 1, position: 78.4 },
    ctaLabel: "Try Airtable free",
    notFor: "Skip it if you mainly need a lightweight task list or a docs-first workspace rather than structured relational data.",
    switchingCheck: "Export one real view to CSV and import it into the option you are considering. Check how linked records, attachments, automations and interfaces come across before moving a team; plan to rebuild whatever does not transfer.",
    measuredComparisons: ["coda-vs-airtable"],
    queries: [
      { query: "airtable alternatives", evidence: "measured-gsc" },
      { query: "airtable alternative", evidence: "measured-gsc" },
      { query: "airtable competitors", evidence: "measured-gsc" },
      { query: "best airtable alternatives", evidence: "measured-gsc" },
      { query: "alternative to airtable", evidence: "measured-gsc" },
      { query: "alternatives to airtable", evidence: "measured-gsc" },
      { query: "airtable vs trello", evidence: "measured-gsc" },
      { query: "coda vs airtable", evidence: "measured-gsc" },
      { query: "airtable vs zoho creator", evidence: "measured-gsc" },
    ],
  },
  {
    slug: "todoist",
    buyingCheck: "Try your real task-capture and weekly-planning routine first. Pay for a specific limit or planning feature you need, not for a replacement company wiki or a complex project reporting system.",
    priority: 2,
    baseline: { impressions: 167, clicks: 0, position: 69.9 },
    ctaLabel: "Try Todoist free",
    notFor: "Skip it if your team needs a broader project system with deep reporting, built-in time tracking, or a company wiki.",
    switchingCheck: "Move one real project with recurring tasks, labels and reminders first. Confirm due dates and recurrence survive the import before retiring your current app, and keep the old list read-only until a full week runs cleanly.",
    queries: [
      { query: "todoist alternative", evidence: "measured-gsc" },
      { query: "todoist alternatives", evidence: "measured-gsc" },
      { query: "best todoist alternative", evidence: "measured-gsc" },
      { query: "best todoist alternatives", evidence: "measured-gsc" },
      { query: "alternative to todoist", evidence: "measured-gsc" },
    ],
  },
  {
    slug: "close",
    buyingCheck: "Price the plan your real team can use: Solo is a one-user offer. Check whether your process needs workflows or dialing features before using the lowest advertised rate in your budget.",
    priority: 3,
    baseline: { impressions: 93, clicks: 0, position: 68.3 },
    ctaLabel: "Start Close's free trial",
    notFor: "Skip it if your sales workflow does not benefit from built-in calling, email and SMS, or if usage-based communications costs are a poor fit.",
    switchingCheck: "Import a sample of leads, contacts and activity history into the trial. Check custom fields, email sequences and whether your existing phone numbers and call recordings can move before committing the whole sales team.",
    queries: [
      { query: "close alternatives", evidence: "measured-gsc" },
    ],
  },
  {
    slug: "setmore",
    buyingCheck: "Run through booking, rescheduling and reminders from a customer device. Compare Free with Pro using your actual staff-calendar count and your need for two-way sync or SMS.",
    priority: 4,
    baseline: { impressions: 80, clicks: 0, position: 70.0 },
    ctaLabel: "Try Setmore free",
    notFor: "Skip it if you need paid-plan features such as two-way calendar sync or SMS reminders but are committed to a free-only setup.",
    switchingCheck: "List future bookings, services and staff calendars before switching. Decide how existing appointments move and when clients get the new booking link, so nobody books into a calendar you are about to retire.",
    queries: [
      { query: "setmore alternatives", evidence: "measured-gsc" },
      { query: "setmore alternative", evidence: "measured-gsc" },
      { query: "acuity scheduling vs setmore", evidence: "measured-gsc" },
      { query: "alternatives to setmore", evidence: "measured-gsc" },
    ],
  },
  {
    slug: "elevenlabs",
    buyingCheck: "Test a representative script and budget for revisions. Separate commercial-use requirements and cloning needs from voice quality, and compare renewal pricing rather than the first-month offer.",
    priority: 5,
    baseline: { impressions: 67, clicks: 0, position: 73.2 },
    ctaLabel: "Try ElevenLabs free",
    notFor: "Skip it if you need unrestricted commercial use on a free plan or predictable high-volume usage without credit limits.",
    switchingCheck: "Keep original voice samples, scripts and exported audio outside the platform. If you switch later, plan to rebuild any cloned voice from those samples and re-test pronunciation before re-rendering a series.",
    queries: [
      { query: "elevenlabs alternatives", evidence: "measured-gsc" },
    ],
  },
];

export const FIRST_REVENUE_SLUGS = new Set(FIRST_REVENUE_PAGES.map((page) => page.slug));

export function getFirstRevenuePage(slug: string): FirstRevenuePage | undefined {
  return FIRST_REVENUE_PAGES.find((page) => page.slug === slug);
}
