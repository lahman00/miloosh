# QA -- Google War Phase II (2026-09-26)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx vitest run` (full suite) | 246 files / 2131 tests passed |
| `npm run lint` | Clean |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems |
| `npm run maintenance:seo` | 1778 titles / 1736 descriptions / 984 sitemap entries, 0 issues |
| `npm run affiliate:audit` | Exit 0; pre-existing staleness/backlog warnings only, nothing new |
| `npm run build` | Production build succeeds, all routes prerender including the changed category pages |
| `npm run growth:google-war` | 1782 nodes, 79034 edges, 0 true orphans, 0 quality regressions, 0 intent conflicts |
| `npm run growth:indexation-readiness` | PASS 175 (up from 162) / WARN 59 / FAIL 5 (down from 6 -- ahrefs cleared) / PROTECTED 115 |

## Browser QA

- `/category/analytics` and `/category/security` (new buying-guide section):
  verified via live dev server at desktop width and 390px mobile width --
  chips wrap correctly, no layout overflow, no console errors.
- `/category/crm` (a category with NO buying guide -- the fallback path):
  verified no crash, no console errors, unaffected rendering.
- No merchant navigation occurred during any QA step.

## Known tool limitations encountered and worked around

- The GSC UI's `read_page`/`get_page_text` tools returned stale cached
  content on repeated calls without an intervening navigation or filter
  settle-wait; worked around by using `find` for live counts and by adding a
  ~1s wait between a filter change and any content read.
- CSV/Sheets/Excel export from the GSC UI triggers a real file download this
  session's browser tool cannot capture as a response body; worked around by
  reading the live-rendered table via `read_page` instead (reliable for
  <200-row tables, partial/large-sample for 600+-row tables).
- Two off-site verification attempts (a Reddit URL, a directory URL) were
  blocked by this session's own safety layers (a hard domain block and an
  automated exfiltration classifier respectively) -- reported as unverified
  rather than worked around.
