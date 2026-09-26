# Changes — Citable Research Asset Factory (2026-09-26)

## New files

- `lib/support-pricing-benchmark/data.ts` — hand-verified AI-usage-pricing classification
  overlay for all 16 customer-support catalog products (manual judgment per vendor, not a
  keyword scanner; see `methodology.md`).
- `lib/support-pricing-benchmark/build.ts` — builds the full benchmark dataset from the
  catalog plus the overlay: per-vendor rows, headline stats, and the Intercom crossing
  scenario. Follows the same inclusion/exclusion-rule discipline as the existing
  `lib/pricing-index/build.ts`.
- `app/research/customer-support-pricing-2026/page.tsx` — the public research page: headline
  findings, AI-usage-pricing table, crossing scenario, full 16-row dataset table, methodology,
  buyer implications, citation block, dataset downloads, and contextual related-reading links.
- `app/research/page.tsx` — new `/research` hub, listing this asset alongside the pre-existing
  SaaS Pricing Pressure Index (built now that two real assets exist; see the mission's own
  "not for a single lonely page" conditional).
- `app/api/research/customer-support-pricing-2026/route.ts` — public JSON dataset export.
- `app/api/research/customer-support-pricing-2026/csv/route.ts` — public CSV dataset export.
- `tests/lib/support-pricing-benchmark.test.ts` — 11 tests against the real catalog (sample
  correctness, AI-usage-classification internal consistency, crossing-scenario arithmetic).

## Modified files

- `data/software/liveagent.json` — added a real `pricing` block (was previously empty
  `pricing: {}`), verified live against liveagent.com/pricing/ on 2026-09-26.
- `data/software/reamaze.json` — added a real `pricing` block (was previously empty
  `pricing: {}`), verified live against reamaze.com/pricing on 2026-09-26, including a
  genuine fourth disclosed per-resolution AI overage example ($0.85).
- `lib/structured-data.ts` — added `getDatasetJsonLd()`, following the file's existing style
  (`getOrganizationJsonLd`, `getFaqJsonLd`, etc.). Used only by the new research page; no
  existing export was changed.

## What did NOT change

- No changes to any comparison-page generator, category-page template, or software-page
  template — none of them expose a safe insertion point for hand-authored body content
  without a broader, riskier template change (see `next-research.md` for this as a real,
  scoped backlog item covering the mission's Part 15 ask).
- No changes to the pre-existing `/research/saas-pricing-pressure-index-2026` page or its
  `lib/pricing-index/` module.
- No changes inside the parallel `codex-google-command-center-20260926` worktree or the
  shared `site` checkout at `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/site` — both
  were read-only references.
- No off-site action of any kind (no submissions, no outreach).
- The Phase V Organization-schema fix (`lib/structured-data.ts`'s `getOrganizationJsonLd`)
  was verified intact and unmodified.

## Commit

See git log for the commit hash covering this receipt (`docs(growth): ship the customer
support pricing benchmark research asset`, or similar — created after this receipt was
written, per the mission's own gate-then-receipt-then-commit order).
