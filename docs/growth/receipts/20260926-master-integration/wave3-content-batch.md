# Master Google War -- Wave 3 content batch (2026-09-26)

This addendum covers the content-treatment phase that followed the master
integration/reconciliation phase documented in `executive-summary.md` and
`reconciliation-matrix.md` in this same directory. It is scoped deliberately
smaller than Wave 2 (20 treatment + 10 control, vs. Wave 2's 30 + 12) because
this session already spent significant scope on the integration phase itself.

## What this batch is

- **Selection**: 20 URLs pulled from the merged `growth:google-war` system's
  `CONTENT_DEPTH_GAP` classification (real GSC demand + factual-depth grade
  C/D), cross-validated against the independently-built `remediation-queue.ts`
  so the pick wasn't reliant on a single tool.
- **Treatment**: each of the 20 `data/software/{slug}.json` files got a real,
  live-vendor-sourced `pricing` block and 3 real `cons`, dated
  `"last_verified": "2026-09-26"`. Verified via `scoreFactualDepth()`: all 20
  moved from grade C/D to grade A (85-96). See `wave3-treatment-cohort.json`
  for the per-slug scores.
- **Decision guides**: 20 new `AlternativeDecisionGuide` entries were added to
  `data/seo/alternative-guides.ts`, each with 3 decisions grounded in this
  session's actual research (e.g. Wiz's AWS-Marketplace-only tiered pricing,
  Tailscale's April-2026 MAU-to-seat billing switch, Duo's 10/25-seat
  purchase-increment complaint, Weebly's regional Square wind-down). Every
  `comparisonSlug` was verified against `isPublishedComparison()` before
  writing -- no new comparison page was created.
- **Control**: 10 slugs (keeper-security, figma, mkdocs, reamaze, archbee,
  kong, shopware, craft, runway, zeroheight) were deliberately left untouched
  as a before/after baseline.
- **Cohort registry**: both cohorts were added to `data/growth/frozen-cohorts.ts`
  as wave `master-google-war-wave3-20260926`, which both
  `indexation-readiness.ts` and `lib/google-war/protection.ts` already
  consume automatically (that sharing was the point of this session's earlier
  reconciliation work) -- no separate registration step was needed.

## What this batch deliberately did NOT do

Per Mission 5's own Parts 23-30, the following were evaluated and consciously
deferred rather than attempted shallowly:

- A separate Wave 3 **comparison-page** treatment batch (Part 25) -- the
  scope already covered in the alternative-guides is a lighter-weight way to
  reach the same "crawled, not indexed" comparison-adjacent intent without a
  second full research-and-write pass this session.
- A dedicated guide-page indexation factory, sitewide 354-page click-depth/
  crawl audit, category-level indexation analysis, indexed-vs-non-indexed
  statistical comparator, the high-impression ranking-war lane, and the
  Semrush/Intercom/Freshdesk/ElevenLabs ecosystem re-evaluations.

These are real backlog, not silently dropped scope -- see the top-level
wrap-up message for the full list handed back to the user.

## Gate results (all run against this batch before commit)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx vitest run tests/seo-factory/alternative-guides.test.ts` | 3/3 passed, including the anti-templating similarity check at the existing <0.08 threshold (not lowered) |
| `npx vitest run` (full suite) | 245 files / 2126 tests passed |
| `npm run lint` | Clean |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems |
| `npm run maintenance:seo` | 1778 titles / 1736 descriptions / 984 sitemap entries checked, 0 issues |
| `npm run affiliate:audit` | Exit 0; pre-existing staleness/backlog warnings only (none introduced by this batch) |
| `npm run build` | Production build succeeds, all `/software/*` and `/compare/*` routes prerender |
| `npm run growth:google-war` | 1782 nodes, 79034 edges, 0 true orphans, 0 quality regressions, 0 intent conflicts |
| `npm run growth:indexation-readiness` | 162 PASS / 71 WARN / 6 FAIL / 115 PROTECTED -- the 6 FAIL slugs (ahrefs, apigee, datadog, read-the-docs, stripe, supabase) are pre-existing and unrelated to this batch |

## Commits

- `e8ea156` -- pricing/cons content for the 20 treatment slugs
- `81045e5` -- Wave 3 cohort registered in `data/growth/frozen-cohorts.ts`
- `cabd9fc` -- 20 alternative decision guides + updated exact-cohort-list test

## Indexing requests

Prepared, not submitted -- see `wave3-indexing-request-queue.json`. Today's
(2026-09-26) daily quota was already confirmed exhausted by a real attempt
earlier this session (Wave 2's `directus` request); no further live attempt
was made this session, consistent with the standing "never spam/retry
same-day" rule.
