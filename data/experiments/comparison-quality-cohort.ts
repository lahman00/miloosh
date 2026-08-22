/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22) — the controlled
 * experiment this codebase's own operating principle demands: "we are
 * testing that hypothesis experimentally," never asserting it as fact.
 *
 * HYPOTHESIS (unproven, being tested — not asserted as true):
 *   Comparison pages whose "who should choose" text is genuinely
 *   pair-specific (not identical across every comparison a product
 *   appears in) may be more likely to be indexed/ranked by Google than
 *   pages where that text is boilerplate repeated verbatim.
 *
 * EVIDENCE BEHIND THE HYPOTHESIS (real, but explicitly NOT proof of
 * causation):
 *   - var/agents/latest-report.json (content-comparison-similarity-analyzer,
 *     2026-08-21): 74.9% of comparison-page pairs sharing a product exceed
 *     50% Jaccard word-overlap similarity. That finding's own text: "This
 *     is a measured content-overlap fact, not a claim that it causes
 *     non-indexation -- no GSC data exists yet to test that."
 *   - var/agents/gsc-snapshots.json (owner-reported, 2026-08-09): only
 *     38/1,358 sitemap URLs indexed, dominant reason "Crawled - currently
 *     not indexed" (1,307/1,320) -- Google's own language for "we looked,
 *     we chose not to index," consistent with (but not proof of) a
 *     thin/duplicate-content explanation among several live hypotheses
 *     (the site is also only ~23 days old at investigation time, itself a
 *     strong independent explanation).
 *
 * ROOT-CAUSE MECHANISM (real, code-level, 100% verified by reading
 * lib/comparison.ts directly): of the 7 real content-generating functions
 * feeding a comparison page, 5 are ALREADY pair-specific (title, meta
 * description, intro, rows, key differences -- meta description and intro
 * were already fixed for exactly this reason in an earlier mission, Sprint
 * 20 Phase 6, 2026-08-10). The pros list and cons disclosure are
 * INTENTIONALLY identical everywhere (a product's own real feature list
 * and an honest "we don't publish unverified cons" policy statement --
 * correctly unchanging, not a defect). The one real remaining gap:
 * generateWhoShouldChoose() derives its output from a single product's own
 * data only, so it's byte-identical across every comparison that product
 * appears in regardless of the competitor.
 *
 * THE FIX BEING TESTED: generateWhoShouldChoosePairAware() in
 * lib/comparison.ts, applied ONLY to TREATMENT_COHORT below. It reuses the
 * exact same real, already-validated feature/platform data
 * generateKeyDifferences() already computes elsewhere on the same page --
 * no new facts, no invented claims, no synonym-spinning. When no real
 * difference exists it falls back to the unchanged sentence rather than
 * fabricate one.
 *
 * COHORT SELECTION METHODOLOGY: both cohorts are the top 40 comparison
 * pages by scripts/growth/indexation-priority.ts's real evidence-based
 * score (real cached GSC impressions/position where available, comparison-
 * graph connectivity and freshness as structural proxies otherwise -- see
 * that file for the full method and evidence-type labeling). TREATMENT is
 * ranks 1-20, CONTROL is ranks 21-40 -- comparable profile, no overlap, a
 * fair adjacent-rank split rather than an arbitrary or cherry-picked one.
 * Selected 2026-08-22 from a live run of buildIndexationPriorityList(500)
 * filtered to comparison-kind rows.
 *
 * MEASUREMENT PLAN: scripts/experiments/comparison-quality-baseline.ts
 * records a real Day-0 snapshot (word-overlap similarity against sibling
 * comparisons, word count, uniqueness of the whoShouldChoose text) for
 * both cohorts to var/experiments/ (gitignored, loaded at runtime only --
 * never a compile-time import, per the 2026-08-22 production incident).
 * Re-run later against fresh GSC/indexation data to compare treatment vs.
 * control -- not done as part of this initial setup, since there's been
 * no time for Google to re-crawl anything yet.
 */

export const EXPERIMENT_STARTED_AT = "2026-08-22";

export const TREATMENT_COHORT: readonly string[] = [
  "adobe-analytics-vs-segment",
  "notion-vs-clickup",
  "notion-vs-todoist",
  "notion-vs-gitbook",
  "clickup-vs-todoist",
  "notion-vs-clockify",
  "clickup-vs-asana",
  "notion-vs-slite",
  "notion-vs-smartsheet",
  "notion-vs-confluence",
  "notion-vs-trello",
  "airtable-vs-notion",
  "todoist-vs-asana",
  "notion-vs-evernote",
  "notion-vs-toggl-track",
  "clickup-vs-smartsheet",
  "clickup-vs-monday",
  "clickup-vs-trello",
  "notion-vs-guru",
  "clickup-vs-confluence",
] as const;

export const CONTROL_COHORT: readonly string[] = [
  "notion-vs-ticktick",
  "todoist-vs-clockify",
  "linear-vs-notion",
  "notion-vs-coda",
  "asana-vs-monday",
  "clickup-vs-airtable",
  "notion-vs-microsoft-onenote",
  "notion-vs-craft",
  "notion-vs-things",
  "confluence-vs-gitbook",
  "clickup-vs-jira",
  "clickup-vs-linear",
  "trello-vs-todoist",
  "clickup-vs-wrike",
  "clickup-vs-shortcut",
  "clickup-vs-zoho-projects",
  "clickup-vs-coda",
  "coda-vs-todoist",
  "todoist-vs-evernote",
  "todoist-vs-airtable",
] as const;
