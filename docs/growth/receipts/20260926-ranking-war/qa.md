# QA — 85-URL Ranking War Phase IV (2026-09-26)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx vitest run` (full suite) | 246 files / 2138 tests. See note below on one flaky file. |
| `npm run lint` | Clean |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems |
| `npm run growth:google-war` | 1782 nodes, 79034 edges, 0 true orphans, 0 quality regressions, 0 intent conflicts |

## Flaky test note

`tests/reddit/worker-lifecycle.test.ts` (a Reddit-CLI-worker lock/lifecycle test that spawns
real child processes) showed non-deterministic failures (5, then 7, then 8 failing tests
across three consecutive full-suite runs during this session) despite being completely
unrelated to this session's changes (`data/seo/serp-overrides.ts` is a plain data file with no
code path touching Reddit automation). Confirmed as environmental/resource-contention flakiness,
not a regression:
- The file itself is untouched by this session (`git diff --stat` shows no changes).
- Re-running it in isolation (no other background processes/dev servers active) passed cleanly:
  8/8 tests, 0 failures.
- This session had a dev server, multiple browser tabs, and background bash tasks running
  concurrently in a shared multi-agent environment — exactly the kind of load that would affect
  a test spawning real subprocesses and file locks with timing assumptions.

Per the standing "never skip tests, never weaken tests to pass" rule, this test was left
completely untouched. It is flagged here for visibility, not fixed or bypassed.

## Browser QA (Part 46)

- `/compare/umbraco-vs-wordpress`: verified via live dev server. Desktop: tab title correctly
  shows the new SERP override ("Umbraco vs WordPress (2026): .NET CMS vs PHP Publishing |
  Miloosh"). Content, pricing table, comparison paths, and CTA all render correctly and
  unchanged. Mobile (375px): full-page screenshot confirms clean rendering, no overflow, no
  layout breakage.
- `/software/umbraco`: verified the "Umbraco comparisons" section renders all 13 real
  comparison links including "Umbraco vs WordPress," confirming the internal link this
  session's reasoning depended on actually exists in the rendered page (not just the data
  layer).
- No console errors on either page.
- No merchant navigation occurred during QA.
