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
 * Master Google Domination reconciliation (2026-09-26): this is now the
 * SINGLE canonical source for wave-based protection, consumed by both
 * scripts/growth/indexation-readiness.ts (via isFrozenSlug) and
 * lib/google-war/protection.ts's reservedProtection() (which used to hardcode
 * its own separate, Wave-1-only CONCURRENT_TREATMENT/CONCURRENT_CONTROL
 * copy of this same data, and had no knowledge of Wave 2 at all until this
 * reconciliation). Add a wave here once and both systems see it.
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
  {
    wave: "master-google-war-wave3-20260926",
    reason:
      "20 real GSC-confirmed crawled-not-indexed pages given pricing/cons/decision-guide treatment (selected from the merged growth:google-war system's CONTENT_DEPTH_GAP classification, cross-validated against the independently-built remediation-queue.ts), plus a 10-page untouched control baseline, both left in place for a later before/after comparison.",
    treatment: [
      "sketch", "google-analytics", "wiz", "weebly", "heap",
      "adobe-commerce", "ghost", "shift4shop", "docusaurus", "rapidapi",
      "crisp", "pipedream", "prestashop", "guru", "zendesk",
      "freshsales", "joomla", "storyblok", "tailscale", "duo-security",
    ],
    control: [
      "keeper-security", "figma", "mkdocs", "reamaze", "archbee",
      "kong", "shopware", "craft", "runway", "zeroheight",
    ],
  },
];

export function isFrozenSlug(slug: string): boolean {
  return FROZEN_COHORTS.some((c) => c.treatment.includes(slug) || c.control.includes(slug));
}

export function frozenCohortFor(slug: string): FrozenCohort | undefined {
  return FROZEN_COHORTS.find((c) => c.treatment.includes(slug) || c.control.includes(slug));
}
