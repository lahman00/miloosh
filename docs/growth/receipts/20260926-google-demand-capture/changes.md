# Changes — Google Demand Capture — 2026-09-26

Branch `claude/gsc-demand-20260926`. Starting SHA `f1e147d` (tip of
`claude/wave2-attack-20260926`, which had already committed real, tested
Pipedrive/Wrike/WhatConverts fixes earlier the same day — read in full,
not redone). Local commits only. **Nothing pushed, merged, or deployed.**

## Safety checks performed before any edit
- `git status`, `git log`, `git branch -a`, `git worktree list` across the
  canonical site checkout and every active worktree.
- Found five other concurrent worktrees/branches active or recently active
  the same day: `claude/first-revenue-20260926` (mine, from an earlier
  session), `claude/revenue-mining-20260926`, `claude/wave2-attack-20260926`
  (uncommitted "feeder network" work in progress, not touched),
  `codex/search-opportunity-20260926`, `integration/first-revenue-20260926`,
  plus two Codex worktrees under `01-Current/`. Confirmed via `lsof` that
  `codex-revenue-integrity-20260926` had a **live process actively reading
  `data/seo/alternative-guides.ts`** at investigation time — that file and
  worktree were avoided entirely.
- Read all `docs/work-revenue-experiment-receipt-*.json` files to find every
  page under an active `"decision": "MEASURING"` experiment before touching
  anything. Found exactly one page-level MEASURING experiment relevant to
  this mission's targets: `/software/wrike` (id `work-revenue-20260910-
  wrike`, PRIMARY checkpoint due 2026-10-08). Pipedrive's own page has no
  live MEASURING receipt (the only receipt naming Pipedrive targets
  `/software/zoho-crm`, whose own page and links to pipedrive/close were
  therefore also left untouched).
- Isolated into a new worktree/branch (`claude/gsc-demand-20260926`) built
  on `claude/wave2-attack-20260926`'s tip, rather than editing in place in
  any of the busy shared worktrees.

## Commits
1. **`a88bd27` — `fix(pipedrive): remove unsupported claims and stale
   pricing from two guides`** (`data/guides/registry.ts`,
   `tests/guides/role-guides.test.ts`). Two Pipedrive entries in
   `data/guides/registry.ts` (`best-crm-for-startups`,
   `best-crm-for-real-estate`) carried: an unverifiable popularity claim
   ("widely favored by real estate teams"), an unsupported comparative cost
   claim ("a fraction of the cost" vs HubSpot — contradicted by the same
   guide's own HubSpot pricingNote showing near-identical entry pricing),
   and a `pricingNote` quoting stale tier names/prices (Essential $14 /
   Advanced $29 / Professional $49) that don't match the current catalog
   (Lite $14 / Growth $39 / Premium $59 / Ultimate $79). Fixed all three,
   scoped to Pipedrive's own two entries only — this is a large, ~2,400-line
   shared registry with unrelated stale data on other products (Close,
   HubSpot's own normalization stance), deliberately left alone to keep
   this change narrow and traceable, matching the same restraint
   `claude/wave2-attack-20260926`'s own receipt already documented for this
   exact file. Added a regression test locking the fix in.

## External (non-code) actions
- **Requested indexing directly via live, authenticated Google Search
  Console** for `https://miloosh.com/software/pipedrive` and
  `https://miloosh.com/software/wrike` — both confirmed "Indexing request
  received." Full justification and evidence in `tier-a-actions.md`. This
  is not a code change and touches no file in the repository; recorded here
  for a complete account of everything done this session, per the
  mission's own "report exact numbers" instruction.
- No GSC/indexing request was made for any other URL. No mass submission.

## Explicitly not changed, and why
- **`/software/wrike`'s content, copy, title, or internal links** — active
  MEASURING experiment through 2026-10-08.
- **`/software/zoho-crm`'s content or its links to pipedrive/close** —
  separate active MEASURING experiment through 2026-10-10.
- **`/software/pipedrive`'s title, meta description, or H1** — no override
  exists; the generated defaults already lead with "alternatives," matching
  measured query intent, so no rewrite was justified. (Pipedrive also sits
  in `scripts/growth/gsc-opportunity-miner.ts`'s hardcoded
  `LEGACY_PROTECTED_COHORT` list — checked directly, found not backed by any
  currently-live receipt for this exact page, but held to the same
  no-title-change standard wave2 already chose, out of caution.)
- **Pipedrive's internal links** — real evidence (see
  `internal-link-graph.json` / `pipedrive-wrike-link-audit.json`) showed it
  is already the #6 most-linked product site-wide and #2 in its own
  category; adding more links was not editorially justified.
- **Other stale `pricingNote` entries in `data/guides/registry.ts`** (Close,
  Freshsales, HubSpot) — real, found, but outside this session's Pipedrive/
  Wrike scope. Flagged in `remaining-opportunities.md`.
- **No new comparison pages created** (e.g. pipedrive-vs-trello, a real
  13-impression query with both products catalogued) — content creation
  requiring genuine vendor research is a different kind of task than the
  engineering/audit work this session did; flagged as a real, ready-to-execute
  opportunity instead.
- **No new "MEASURING" experiment was registered** for this session's
  registry.ts fix — that convention (see
  `scripts/growth/register-war-room-experiments.ts` and the
  `docs/work-revenue-experiment-receipt-*.json` files) is used for on-page
  content changes made specifically to test a ranking hypothesis. This
  session's fix is a factual-accuracy correction, not a ranking
  intervention, so no controlled-experiment tracking applies to it.
