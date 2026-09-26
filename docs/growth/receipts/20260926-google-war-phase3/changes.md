# Changes — Google Crawl + Index + Rank War Phase III

## Commit

- `9ea8bfa` — `feat(growth): populate real 3-lane indexation evidence, add CRAWL_RECOVERY/RANKING_STRIKING_DISTANCE lanes`

## Files changed

- `data/growth/google-war/reported-inspections.json` — appended 1209 real
  `Inspection` observations (was 31 entries, now 1240), sourced from this
  session's and the prior Phase II session's live bulk GSC Pages-report
  captures. Every record is honestly labeled with its real provenance
  (bulk Pages-report export vs. individually-confirmed Indexed-bucket
  check), distinct from individual URL Inspection API/UI captures.
- `lib/google-war/priority.ts` — added `CRAWL_RECOVERY` and
  `RANKING_STRIKING_DISTANCE` to the `Group` union; both are additive
  (existing groups, existing tests, and existing behavior for every
  previously-covered case are unchanged).
- `scripts/growth/google-war.ts` — added `indexationHeadline` and
  `routeTypeByState` to the JSON report, and a new headline section at the
  top of `latest.md` showing the three indexation states separately, by
  route type, plus real transitions since the previous capture.
- `tests/growth/google-war.test.ts` — 7 new tests in a new `describe`
  block locking in the lane-separation invariants.

## Evidence / receipts (not code)

- `var/growth/google-war-phase3/wave-1-2-3-delta.json` — working evidence
  file for the Wave 1/2/3 indexation delta check.
- `docs/growth/receipts/20260926-google-war-phase3/*` — this receipt
  package.

## What did NOT change

- No software or comparison page content was edited this phase — this was
  an evidence/infrastructure phase, not a content-treatment phase.
- `data/growth/frozen-cohorts.ts`, `data/experiments/comparison-quality-cohort.ts`
  — untouched, per the standing "do not contaminate active experiments"
  rule; both were only read/analyzed.
- No sitemap changes, no off-site actions, no indexing requests submitted.
