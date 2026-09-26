# QA — Indexation Recovery Attack — 2026-09-26

## Automated gates (run after every commit, not just once at the end)
- Full suite: **237 files / 2,074 tests passed** (up from 236/2,071 at the
  starting commit — 3 new tests added: 1 for the cons-rendering template
  change, plus the existing anti-templating suite exercised more heavily).
- `tsc --noEmit`: clean after every commit.
- ESLint on every changed file: clean.
- `npm run validate:data`: **354 software pages, 27 categories, 1,348
  comparisons, 0 problems** — unchanged before and after all data edits.
- `npm run build` (`VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN=''`):
  clean, three times across the session.

## Rendered QA (real local production server, real browser)
- `next start` on an isolated QA build, verified via `curl` (200) and a
  real browser session for: `/software/whimsical`, `/software/airtable`
  (a first-revenue-cohort page, to verify no duplicate "Watch before
  buying" section), `/software/jasper`.
- Confirmed the Decision Guide section renders with the correct, real,
  differentiated copy for whimsical (verified full text against the
  source file).
- Confirmed the "Watch before buying" section renders exactly once on
  `/software/whimsical` (non-cohort) and exactly once on
  `/software/airtable` (cohort — via `FirstRevenueSoftwarePanel`, not
  duplicated by the new template code).
- Mobile QA at 375px (`resize_window` mobile preset) on
  `/software/whimsical`: no horizontal overflow
  (`document.documentElement.scrollWidth > window.innerWidth` = `false`),
  the new cons list reads cleanly with no layout breakage, no
  console errors.
- Zero console errors on every page checked.
- No merchant/affiliate destination was navigated to or clicked at any
  point.

## Live production checks (real, authenticated Google Search Console)
- Individual live URL Inspection performed for all 14 treatment
  candidates before any edit — 14/14 confirmed "Crawled - currently not
  indexed," not inferred from HTTP 200.
- Individual live URL Inspection performed for 4 of 10 control candidates
  (adyen, braze, gitbook, twilio) — all 4 confirmed the same status,
  establishing the control cohort is a genuinely comparable baseline.
- 5 live indexing-request attempts; 4 confirmed received, 1 blocked by a
  real, observed daily quota (see `indexing-requests.md`). No affiliate/
  merchant page was visited during any of this.

## Not verified (explicitly, per the mission's own Section 23)
- Whether any of the 4 successful indexing requests results in the page
  actually entering the index, or on what timeline.
- Any change in ranking, impressions, clicks, or CTR as a result of this
  session's work — far too early to observe, and not claimed.
- Any merchant page load, signup, sale, commission, or payout.
- The indexation status of the 6 control-cohort products that were not
  individually live-inspected this session (see `baseline.json`).
