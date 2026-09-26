# QA — Why We Don't Rank War Phase V (2026-09-26)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors (after clearing a stale, gitignored `.next/dev/types` artifact unrelated to source changes) |
| `npx vitest run` (full suite) | 246 files / 2138 tests passed |
| `npm run lint` | Clean |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems |
| `npm run build` | Production build succeeds |

## Browser QA (Part 37)

- Verified live (dev server) that the Organization JSON-LD on the homepage now includes real
  `logo`, `description`, and `contactPoint` values (not placeholders), and that the logo asset
  itself resolves to a real, valid 399x356 PNG.
- No content-page rendering changed this session (only sitewide `<script type="application/
  ld+json">` output and Phase IV's already-verified Umbraco page), so no separate 1440/390/320
  visual QA pass was needed beyond what Phase IV already did for the one content page touched.
- No merchant navigation occurred during QA.

## Scope note

This phase was primarily an evidence-gathering and diagnostic mission (per its own success
criteria: "success is NOT 30 rewritten pages"). The gates above cover the two real code changes
made (Organization schema enrichment; Phase IV's preserved Umbraco SERP override). No new
templates, calculators, or content pages were built this session, so there is no additional
page-level QA surface beyond what's listed.
