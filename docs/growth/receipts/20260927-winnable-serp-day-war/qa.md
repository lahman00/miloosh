# QA — Daytime Winnable SERP + Research Moat War (2026-09-27)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx vitest run` (full suite) | **249 files / 2166 tests passed on the confirming re-run.** See note below on the first run's transient failures. |
| `npm run lint` | Clean |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems |
| `npm run build` | Production build succeeds; `/research/cms-buying-decision-2026` and both new API routes appear in the route manifest with no errors or warnings |
| `npm run maintenance:seo` | 0 issues across 1778 titles / 1736 descriptions / 984 sitemap entries |
| `npm run growth:google-war` | Regenerated fresh (not read from the stale cached report) -- this is what surfaced the real protection-registry discrepancy described below |

## A real, resolved discrepancy: stale protection data

Early in this session, `var/growth/google-war/latest.json` (a machine-generated report from
the prior evening) was consulted for experiment-protection status and showed `/software/ecwid`
as `EXPERIMENT_PROTECTED` with no obvious source -- neither `data/growth/frozen-cohorts.ts` nor
the hardcoded `LEGACY_RESERVED` list in `lib/google-war/protection.ts` mentioned Ecwid. Rather
than trust the stale snapshot or dismiss the flag, `npm run growth:google-war` was re-run fresh.
The regenerated report resolved the discrepancy: `loadProtection()` also scans
`docs/*experiment*.json` files, and `docs/work-revenue-experiment-receipt-2026-09-12.json`
contains a real, currently-`MEASURING` experiment on `/software/ecwid` running until
2026-10-10. This is a genuine active experiment this session correctly avoided touching. The
same fresh regeneration also confirmed Adyen (control), Drupal, Joomla, Webflow, Contentful, and
Storyblok (all treatment, different waves) as protected -- see `cms-cluster.json` and
`top-12.json` for the full detail. **Always regenerate this report fresh rather than trusting a
cached one when protection status matters for a same-session decision.**

## Test suite: one transient failure, confirmed environmental, not a regression

The first full-suite run (started 08:02, while Codex's own release-lane vitest suite was running
concurrently in its separate worktree) reported 16 failed tests across 7 files, one example being
`tests/reddit/worker-lifecycle.test.ts` (a test that spawns real child processes and file locks,
previously documented in this engagement as sensitive to CPU contention). This session made zero
changes to any Reddit-related code (confirmed via `git status --short`, which shows only
`app/research/page.tsx`, the new `cms-buying-decision-2026` app/lib files, and one new test file).

Two confirmations were run rather than assuming this was fine:
1. Re-ran `tests/reddit/worker-lifecycle.test.ts` alone: **8/8 passed** in 13 seconds, while
   Codex's competing process was still running.
2. Re-ran the **entire** suite a second time end to end once Codex's process had finished:
   **249/249 files, 2166/2166 tests passed, zero failures.**

This confirms the first run's failures were caused by two full Vitest suites (this session's and
Codex's release-lane suite) competing for CPU/memory on the same machine simultaneously, not a
code defect. Per this engagement's standing rule, the test was not modified or skipped to make it
"pass" -- it already passes on its own merits; the failure was purely an artifact of concurrent
load, documented honestly here rather than hidden.

## Browser QA

Verified live against the dev server for the new page:

- **Desktop:** headline stat cards, migration-direction table, and full per-vendor detail cards
  all render with real data.
- **390x844 and 320x700:** confirmed no page-level horizontal overflow at either width.
- **A real bug found and fixed during this QA pass**: the "Full detail" cards' external source
  links were built by splitting each vendor's `officialSource` string on commas to extract a URL
  -- this broke on Webflow's entry, whose `officialSource` field contains an explanatory
  parenthetical with its own internal comma, producing a malformed `href` with trailing text
  baked into the URL. Fixed by adding a dedicated `primarySourceUrl` field to
  `CmsMigrationProfile` (never derived by string-parsing) and a regression test asserting every
  profile's `primarySourceUrl` is a clean, single, directly-usable URL.
- **Internal links:** every link on the new page (`/category/cms`, `/software/wordpress`,
  `/software/umbraco`, `/compare/craft-cms-vs-wordpress`, `/research`, both API routes) returns
  HTTP 200. External vendor links (including the fixed Webflow link) verified via live DOM
  inspection to have correct `href` and `target="_blank"`.
- **Research hub:** `/research` now correctly lists all four assets.
- No merchant navigation occurred during QA.
