# Google War Phase II -- Executive Summary (2026-09-26)

Continuation of `claude/miloosh-master-google-war-20260926`. This phase's mandate was to
execute Mission 5's deferred Parts 23-30 with fresh evidence, keep Lane A
(indexation) and Lane B (ranking) strictly separate, and make real, safe,
evidence-backed changes rather than stop at research.

## The single most important correction this phase made

Every prior mission in this engagement described Miloosh's problem as
"1,645/1,923 crawled-not-indexed." That framing was wrong in a way that
matters. A fresh, live GSC pull (`fresh-gsc-baseline.json`) found the real
picture as of today is **two structurally different populations**:

- **820 URLs are DISCOVERED_NOT_INDEXED** -- Google knows about them but has
  never actually crawled them (real last-crawl date: "not available"). This is
  a crawl-budget/discovery problem.
- **825 URLs are truly CRAWLED_NOT_INDEXED** -- Google crawled them recently
  (real dates within the last few weeks) and chose not to index them. This is
  the content-quality/duplication problem Waves 1-3 correctly targeted.

These were previously conflated into one number. They need different
interventions and should not be treated as one problem going forward.

## What was executed (real, safe, committed changes)

1. **15 products enriched with real pricing + cons** (`teamwork`, `render`,
   `jira`, `workato`, `posthog`, `doodle`, `microsoft-bookings`,
   `microsoft-teams`, `slack`, `circleci`, `gitlab`, `motion`, `mailchimp`,
   `ahrefs`, `chatgpt`) -- the constituent products behind ~23 real-demand
   comparison pages confirmed CRAWLED_NOT_INDEXED, selected because
   comparison pages are entirely auto-generated from software-page data (no
   per-pair override hook exists in this codebase). All 15 moved from
   factual-depth grade C/D to A. Commit `c5cd07c`.
2. **A sub-intent buying guide for the `analytics` and `security` category
   hubs** -- real category-level data found these two categories have the
   highest never-crawled rates among categories with real demand, and are
   genuinely heterogeneous grab-bags served as one flat list. Added
   `data/seo/category-buying-guides.ts`, wired into the category page as an
   optional section, fully tested. Commit `df1dc79`.

## What was deliberately NOT executed, and why

- **Did not extend the existing pair-aware comparison-text experiment**
  (`data/experiments/comparison-quality-cohort.ts`) to new candidates. That
  experiment is 35 days old -- old enough to check its own promised delta for
  the first time in this engagement. The result: **0 of 20 treatment pages
  are now indexed, versus 2 of 20 for the untouched control.** Per the master
  mission's own Part 5 instruction ("if a hypothesis is disproven, stop
  optimizing that dimension"), this session does not pour more work into that
  specific mechanism, and does not invent an unproven substitute. See
  `indexation-deltas.json`.
- **Did not treat the 5 already-strong-data comparison pairs** (notion-vs-clickup,
  clickup-vs-asana, etc.) that would have been the obvious "Group 2" content
  target, for the same reason above.
- **Did not touch any of the 15 high-impression pages re-evaluated**
  (Semrush, Intercom, Freshdesk, Front, Buffer, Help Scout, ClickUp,
  Salesforce, Ecwid, Pipedrive, and the ElevenLabs ecosystem) -- all are
  either legacy-protected or already A-grade depth. A real, live-GSC check
  found **5 of the 15 are actually already indexed** (Freshdesk, Buffer,
  Ecwid, Perplexity, Synthesia) -- a genuine ranking problem, not
  indexation -- while the other 10 remain unindexed despite already-strong
  content, correctly separating Lane A from Lane B for the first time for
  this specific cluster. See `high-impression-pages.json`.
- **Did not treat any guide pages** (Part 12) -- real evidence gathered (14
  discovered-not-indexed, 15 truly-crawled-not-indexed guides, both complete
  exact lists) but not acted on this session; honestly logged as backlog in
  `guide-treatment.json`.
- **Did not act on any off-site item** (Part 26) -- read the outreach
  handoff and offsite-attack ledger from a different concurrently-running
  agent (Antigravity) for classification only. That document claims two
  items are "EXECUTED_LIVE" (a Reddit comment, a directory listing); this
  session tried and failed to independently verify either claim (Reddit is
  hard-blocked for this session's browser tool; the directory URL was
  blocked by an automated safety classifier) and reports them as
  **unverified**, not confirmed, per the standing "never call prepared copy
  executed" rule. See `offsite-handoff.json`.

## Real null/negative findings worth keeping

- Internal link count, click depth, and factual depth **do not separate**
  indexed from not-indexed comparison pages at the individual-page level
  (`indexed-vs-nonindexed.json`) -- though the comparator's control group is
  acknowledged to be partially contaminated, so this is reported as
  directional, not proof.
- Click depth sitewide tops out at 3, with zero unreachable pages and zero
  true orphans (`click-depth.json`) -- not a plausible bottleneck anywhere on
  the site right now.
- A category-level pattern (fewer average inbound links correlates with a
  higher never-crawled rate) does NOT hold at the individual comparison-page
  level -- likely confounded by category size/maturity, not a direct causal
  link. Do not launch a link-building campaign on the strength of the
  category-level number alone.

## Gate results

tsc, full vitest suite (2131 tests), lint, validate:data, build, and
growth:google-war all pass clean after every change in this phase. See
`qa.md`.
