# QA evidence

Private raw logs/screenshots: `/Users/eyalhaimovich/MilooshReceipts/20260926-google-visibility-war/`.

## Gates

- Full `npm test`: **2,104 / 2,104 tests passed in 240 files**, 71.46 seconds in the final run.
- Focused Google War, navigation, SEO Factory and protection suites: passed; tests cover unknown vs zero, exact URL variants, malformed evidence, immutable observation replay, timezones, source/canonical distinction, priority rules, complete HTML graph, noindex/nofollow/scripts, structural intent, targeted quality regression, repeated-fact exclusion, protection, deployed-proof and indexing eligibility.
- Importer integration test: first import succeeds, replay fails without overwriting; 537-row seed remains unchanged. Real dated-import smoke matched both checked-in normalized files byte-for-byte.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: passed, no warnings.
- `npm run validate:data`: 354 software, 27 categories, 1,348 comparisons; zero problems.
- `npm run maintenance:seo`: 1,778 titles, 1,736 descriptions, 984 sitemap entries; zero issues.
- `npm run report:links`: completed; legacy contextual-only counts are not called true orphan counts by the new graph.
- `npm run affiliate:audit`: completed; 22 active partners and **99 existing findings**, not a clean affiliate audit: 84 stale research, 1 catalog-research gap, 9 orphaned research, 5 overdue follow-ups. No affiliate state was modified.
- `npm run test:static-gate`: 11 Python regression tests passed.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `MILOOSH_QA_BUILD=1 npm run build`: passed production build `1OWeBrz-o40P5TJILrHZ4`, matching `technical-audit.json`; this is local, not a Vercel deployment.
- `git diff --check`: passed.

## Rendered artifact / HTTP verification

The existing static release gate audited 1,782 emitted public HTML pages, 984 unique sitemap URLs and **83,456** internal links. Zero failures: canonicals, title/description uniqueness, indexability, sitemap redirect/noindex hygiene, server-rendered metadata, JSON-LD/visible FAQ parity, missing fragments and broken routes. `/recommend`, the dynamically rendered sitemap route, was separately HTTP-checked by the rendered revenue audit. Selective sitemap membership was preserved; sitemap omission alone is not an indexing diagnosis.

`rendered-revenue-audit.ts` passed against localhost: all five existing primary money pages, relevant decision/comparison links, sitemap, robots and `/recommend` returned expected responses. It did not follow any affiliate destination or write analytics. Product/affiliate data and the five-page cohort did not change.

The new graph contains 78,252 eligible edges (the broader static checker counts 83,456 links because its scope includes other anchors). Exact before/after assertions: eight unique new source/target paths, zero removed edges, no changed direct link footprint for the 42 protected/reserved URLs. All 354 software pages are discoverable; nine near-orphans have two source pages each. All 1,736 commercial pages are at home depth 1–3 (86 / 1,301 / 349). No depth decrease is claimed for the four strengthened software targets.

## Browser verification

Used the required agent-browser gut-check followed by the committed browser harness. Final browser capture: `2026-09-26T10:51:13.823Z`, against the final build above. All four modified guides and eight target navigations passed at **1440, 390 and 320 px**: 12 source-page viewport runs, 24 native internal link clicks, correct URL/canonical, HTTP 200, one H1, visible labels, >=44px link targets, no horizontal overflow, no framework overlay or browser errors. Desktop and 390/320 screenshots were visually inspected.

Initial QA detected a duplicate source-to-email-guide path and ambiguous reuse of a navigation aria-label; both were corrected before the final pass. Final output: `browser/browser-qa.json` and 12 screenshots. The harness intercepts `/api/**`: zero analytics writes, zero merchant navigation, no real affiliate clicks. No browser login or credentials were used.

React/Next.js skill review kept this as a Server Component with static data and native links, stable keys, explicit accessible navigation and focus styles; no effects, client state, network waterfall or new client dependency.

## Observation durability

Repeated report execution retained exactly 31 observations. Before/after history SHA-256:
`88a939fd958136b96f0babf5835260101304d9ec4ff76fc727c119b2904fffe1`.
No newly observed indexation transition. The two repeated buyer-caution warning groups are retained for editorial review, not automatically rewritten or counted as quality failures.

## Production boundary

No deployment/promotion, push, request indexing, Google state write, Vercel Blob write, social action or merchant navigation. Production behavior and Google improvement are not asserted from local QA. Consolidated integration must rerun these gates on the final combined source.
