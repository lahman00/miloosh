# Changes -- Google War Phase II

## Commits (this phase)

- `df1dc79` -- `feat(growth): add sub-intent buying guide to analytics and security category hubs`
- `c5cd07c` -- `seo(content): deepen 15 products behind real-demand crawled-not-indexed comparisons`

## Files changed

### Content
- `data/software/{teamwork,render,jira,workato,posthog,doodle,microsoft-bookings,microsoft-teams,slack,circleci,gitlab,motion,mailchimp,ahrefs,chatgpt}.json`
  -- real pricing block + 3 real cons each, `last_verified: 2026-09-26`.

### New feature
- `data/seo/category-buying-guides.ts` -- new, tested, sub-intent buying-guide
  registry for `analytics` and `security` categories.
- `app/category/[slug]/page.tsx` -- renders the buying guide as an optional
  section when one exists for the category; no change for the other 25
  categories.
- `tests/category/category-buying-guides.test.ts` -- exact-coverage test
  (every real category member appears exactly once, no cross-category leaks).

### Evidence / receipts (not code, not shipped to the site)
- `var/growth/google-war-phase2/*.json` -- working evidence files (fresh GSC
  snapshot, comparator, category map, click-depth map, high-impression
  classification, comparison-quality-cohort delta, offsite-handoff
  classification).
- `docs/growth/receipts/20260926-google-war-phase2/*` -- the formal receipt
  package mirrored from the working evidence files, plus this document set.

## What did NOT change

- `data/experiments/comparison-quality-cohort.ts` -- both TREATMENT_COHORT
  and CONTROL_COHORT (20 pages each) untouched, per the delta-check finding.
- `data/growth/frozen-cohorts.ts` -- no new wave added this session (Group 1's
  15 products are a software-data-quality fix, not a new measured cohort in
  the same before/after sense as Waves 1-3, since the selection criterion was
  "drags down a real-demand comparison," not "individually confirmed
  CRAWLED_NOT_INDEXED as a standalone software page").
- No guide pages, no high-impression/ranking-war pages, no ElevenLabs
  ecosystem pages -- see executive-summary.md for why.
- No off-site action of any kind (no emails sent, no directories submitted,
  no accounts created).
