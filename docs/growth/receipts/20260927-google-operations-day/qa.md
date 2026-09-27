# QA — Google operations day

## Passed

- Independent Vercel source/alias/HTTP verification, before and after the operations pass: production unchanged, exact SHA/READY, HTTP 200.
- Current production health/canonicals/schemas/sitemap and four JSON/CSV endpoints; expected `/categories` 404 is not a sitemap route.
- Full rendered production crawl: 1,785/1,785; 4,138 commercial links; 0 failures; 0 baseline changes; 0 writes/merchant navigations.
- Fifteen mocked production browser journeys at 1440, 390 and 320px: research→software/comparison→CTA exposure/click→one intercepted handoff. This proves client behavior, not durable production persistence or merchant arrival.
- Two public JSON exports exactly match intended 16/7 public rows and six public top-level fields. No private GSC/affiliate/secret/receipt data in the inspected responses. CSV HTTP/content checks also passed.
- 23 distinct editorial source URLs on the two new research pages: 0 404/410/redirect-loop findings, 1 inaccessible source (Pipedrive pricing HTTP 403, not proven dead). Older pricing-index source coverage was not repeated.
- Typecheck and lint; a later full production build also completed TypeScript. Supplementary changed-file ESLint passed after removing an unused import.
- Focused operations/capture/evidence tests: 60/60. Capture tests use mocks only, preserve prior evidence on partial reads and require private local 0600 output. Earlier broader four-file check: 91/91. Final operations/capture/research-authority check after fresh-link alert coverage: 45/45 across three files; typecheck, changed-file lint and browser QA also passed again.
- Static-gate unit tests: 11/11. Data: 354 products, 27 categories, 1,348 comparisons, 0 problems.
- Affiliate audit exits 0: 22 ACTIVE; 99 non-blocking research/follow-up findings (84 stale, 1 coverage gap, 9 orphaned research, 5 overdue follow-ups). No automatic follow-up was sent.
- Optimized production builds PASS; final build ID `l_wgh02yhJimCGbqxOFWZ` (earlier `S98-I909C5l3S7akkBVwh` also passed). 3,539 generated entries include metadata/images, not 3,539 editorial pages. Research HTML sizes unchanged: 134,130 and 130,431 bytes before/after.
- Query import replay: 188→188, added 0. The Help Scout capture's source-row-count label was corrected to 13 (not inherited Freshdesk 66); numeric rows unchanged. Pre-correction generated cache archived locally, and the corrected canonical capture is committed.

## Final normal release gate: PASS

`npm run growth:release-google` finished successfully at 2026-09-27T05:42 UTC: all **14/14 gates** passed, including **260/260 test files, 2,347/2,347 tests** (51.49 seconds). Typecheck, lint, static-gate tests, data, affiliates, build, static artifacts, query import, Google report, strict command center, browser smoke and diff check passed. Final normal gate timestamps are included in `alerts.json`. No alternate runner, timeout increase, test exclusion or assertion weakening was used. Production unchanged; Claude's unmerged candidate still requires explicit protected-page review and its own full QA.

Tested implementation saved as local commit `4cc291237518bc84c010b2db90a6ce2f6df5d7d8`. The subsequent receipt-only commit changes no application, test or operations implementation.

## Earlier failures retained, not hidden

The normal `growth:release-google` runner passed protected-intake, typecheck and lint, then stopped at its full-suite gate: **2327 passed / 15 failed, 259 files, 2342 tests**. The failures were deadline/child-startup timeouts, not assertion mismatches in the changed operations code:

- `tests/reddit/worker-lifecycle.test.ts`: 8 child CLI invocations missed the existing 2.5-second deadline; empty JSON outputs followed timeout termination.
- `tests/growth/indexation-readiness.test.ts`: 2 existing 5-second timeouts.
- `tests/seo-factory/alternative-guides.test.ts`: 1 existing 5-second timeout.
- `tests/lib/indexation-priority.test.ts`, `tests/growth/google-war-import.test.ts`, `tests/analytics/report-unavailable.test.ts`, `tests/category/featured-comparisons.test.ts`: 1 timeout each.

A focused seven-file rerun without changing any timeout passed 37 and failed 10 (six Reddit startup deadlines, three indexation-readiness deadlines, one alternatives-guide deadline). Cold/runtime contention is consistent with these symptoms, but is not independently established as the sole cause. The final normal suite subsequently passed all tests. No test/timeout relaxation, social implementation change or cleanup of unrelated processes occurred. Earlier failure evidence: `var/growth/operations/baseline/day-full-suite-timeouts.log` and `day-failed-gates.json`.

Static-artifact validation passed: 1,785 public HTML pages, 987 sitemap URLs and 86,632 internal links. `growth:google-war` and the strict command-center report passed: zero quality regressions, intent conflicts, software orphans or blocking CTA findings. All three control rooms, four research routes and three merchant surfaces passed browser QA at 1440, 390 and 320px, with mocked analytics/handoffs only. Desktop/mobile operations screenshots were visually inspected; tables intentionally scroll within their section on narrow screens, with no document overflow. These checks passed both separately and in the final normal release runner.

## Scope and safety

Production/content/cohort/affiliate/social source diff is empty. Claude's checkout was only read. Current operations intake PASS; latest cumulative Claude candidate `61eee274c25749645d262c44cc785f2fefe8c431` is BLOCKED_PROTECTED_REVIEW for inherited Buffer, ClickUp, Help Scout, Semrush and Zapier changes. Its latest research-only commit has no direct protected-product changes; that does not replace independent candidate QA. No reset/rebase/stash/push/deploy/index request/message/Blob write/merchant navigation. Raw private analytics remain ignored, 0600. No secrets printed or committed.
