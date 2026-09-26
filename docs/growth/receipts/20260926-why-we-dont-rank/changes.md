# Changes — Why We Don't Rank War Phase V

## Commit

- `075d3ec` — `feat(trust): enrich sitewide Organization schema with real entity facts`

## Files changed

- `lib/structured-data.ts` — `getOrganizationJsonLd()` now includes `logo`, `description`, and
  `contactPoint`, all sourced from already-existing real constants (`public/logo-icon.png`,
  `SITE_DESCRIPTION`, `SITE_EMAIL`). Rendered sitewide via `app/layout.tsx`. No `sameAs` added
  (no real social profiles exist to cite).

## What did NOT change

- No per-page content, title, or snippet changes this session (Phase IV's Umbraco change from
  the prior session was preserved untouched, as instructed).
- No new pages, no new comparisons, no new calculators/tools.
- No sitemap, internal-linking, or schema changes beyond the Organization enrichment above.
- No off-site action of any kind.

## Why this session's execution is smaller than the mission's own 10-15-page ask

See `treatments.json`'s `whyNoLargeTreatmentCohortThisSession` field: this session's own
evidence (a narrow, consistent ~45-79 median-position band across 19 unrelated categories;
zero branded search demand; ~6 real external links total, all pointing to the homepage, none to
any content page) converged on a domain-level explanation for most of the deep-ranking
cohort. Phase IV already showed 13 of 15 researched pages have no fixable page-level issue.
Editing another 10-15 pages on the same already-diagnosed-as-fine dimension would not be
evidence-backed execution -- it would be the "SEO theater" this mission's own success
criteria explicitly define as failure. The one real, defensible, sitewide fix this session's
evidence pointed to (entity/structured-data trust signals) was executed instead.
