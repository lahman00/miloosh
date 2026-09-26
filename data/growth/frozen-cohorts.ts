/**
 * Google Indexation Factory, Wave 2 (2026-09-26) — a registry of software
 * slugs that are frozen as measurement assets for an active before/after
 * indexation experiment, kept separate from the per-wave receipts so a
 * future wave (or the permanent growth:indexation-readiness tool) can
 * check "is this page mid-experiment?" without re-deriving the list from
 * old commit messages. Add a new wave's treatment/control slugs here when
 * that wave concludes; never remove a wave's entry just because the wave
 * is over — removal should only happen once that wave's own comparison
 * has actually been read and the freeze is deliberately lifted.
 *
 * Distinct from docs/work-revenue-experiment-receipt-*.json, which tracks
 * revenue-cohort buyer-checklist experiments with their own measurement
 * windows — a page can appear in both registries for unrelated reasons.
 */
export type FrozenCohort = {
  wave: string;
  reason: string;
  treatment: readonly string[];
  control: readonly string[];
};

export const FROZEN_COHORTS: readonly FrozenCohort[] = [
  {
    wave: "indexation-recovery-20260926",
    reason:
      "14 real GSC-confirmed crawled-not-indexed pages given pricing/cons/decision-guide treatment, plus a 10-page untouched control baseline, both left in place for a later before/after comparison.",
    treatment: [
      "whimsical", "scribe", "fullstory", "marketo-engage", "lucidchart",
      "firebase", "vercel", "netlify", "contentful", "hotjar",
      "jasper", "copy-ai", "perplexity", "synthesia",
    ],
    control: [
      "adyen", "braze", "gitbook", "twilio",
      "knowledgeowl", "bloomfire", "workos", "webflow", "swaggerhub", "sanity",
    ],
  },
  {
    wave: "indexation-factory-wave2-20260926",
    reason:
      "30 real GSC-confirmed crawled-not-indexed pages given pricing/cons/decision-guide treatment, plus a 12-page untouched control baseline, both left in place for a later before/after comparison.",
    treatment: [
      "directus", "toggl-track", "opencart", "plausible", "crazy-egg",
      "drupal", "matomo", "miro", "evernote", "mattermost",
      "power-automate", "deepl", "okta", "jenkins", "gorgias",
      "docker", "algolia", "ticktick", "kayako", "fathom-analytics",
      "craft-cms", "microsoft-onenote", "plaid", "auth0", "signal",
      "document360", "superhuman", "salesforce-commerce-cloud", "strapi", "ifttt",
    ],
    control: [
      "reclaim-ai", "zeplin", "amplitude", "google-chat", "keap", "elastic",
      "google-meet", "snyk", "mixpanel", "slite", "bitbucket", "linear", "clockify",
    ],
  },
];

export function isFrozenSlug(slug: string): boolean {
  return FROZEN_COHORTS.some((c) => c.treatment.includes(slug) || c.control.includes(slug));
}

export function frozenCohortFor(slug: string): FrozenCohort | undefined {
  return FROZEN_COHORTS.find((c) => c.treatment.includes(slug) || c.control.includes(slug));
}
