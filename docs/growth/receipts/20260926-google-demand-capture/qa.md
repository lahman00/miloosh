# QA — Google Demand Capture — 2026-09-26

## Automated gates
- Targeted tests (`tests/guides/role-guides.test.ts`): 6/6 passed after the
  registry.ts fix, including a new test locking in the fix.
- Full suite: **236 files / 2,071 tests passed** (up from 236/2,070 at the
  starting commit).
- `tsc --noEmit`: clean.
- ESLint on changed files (`data/guides/registry.ts`,
  `tests/guides/role-guides.test.ts`): clean.
- `npm run build` (`VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN=''`):
  clean, twice (once per real verification pass).

## Rendered QA (real local production server, real browser, not curl)
- `next start` on an isolated QA build, `PORT=3220`.
- `/best-crm-for-startups`: 200, real browser render confirmed the fixed
  pricing context text ("Lite $14/seat/mo; Growth $39/seat/mo (full email
  sync, automations and nurturing sequences); Premium $59/seat/mo — all
  billed annually.") and the fixed tradeoff/limitations text render exactly
  as written, in place of the old stale Essential/Advanced/Professional
  figures and the removed "fraction of the cost" FAQ claim.
- `/best-crm-for-real-estate`: 200, same confirmation for its own Pipedrive
  entry ("no claim is made about real-estate-specific adoption share";
  corrected pricingNote).
- Zero console errors on either page.
- No merchant/affiliate destination was navigated to or clicked during QA.
  All checks were same-origin, localhost-only.

## Live production checks (real, authenticated Google Search Console —
not a local build)
- Confirmed sitewide indexation coverage: 218 indexed / 1,705 not indexed,
  broken down by Google's own stated reason (58 non-canonical duplicates,
  2 redirects, 820 "crawled but not indexed", 825 "crawled - currently not
  indexed").
- Inspected `/software/pipedrive` live: crawled successfully, indexing
  permitted, self-canonical confirmed by Google, status "Crawled -
  currently not indexed," last crawl 2026-08-30.
- Inspected `/software/wrike` live: same status, last crawl 2026-08-16.
- Submitted a real indexing request for both URLs; both confirmed received.
- No affiliate/merchant page was visited or clicked at any point.

## Not verified
- Whether either indexing request results in the page actually entering
  the index, or on what timeline.
- Any change in ranking, impressions, clicks, or CTR as a result of this
  session's work — too early to observe, and this session did not wait for
  or fabricate such a result.
- Any merchant page load, signup, sale, commission, or payout.
