# Umbraco / WordPress Anomaly — Re-Check After Metadata Work (2026-09-27)

## Re-checked live tonight

`query=!umbraco+vs+wordpress&breakdown=page` against GSC, fresh (not cached from last night):
116 impressions, position 65.1, 0 clicks -- **still 100% attributed to `/software/umbraco`**, not
to the dedicated `/compare/umbraco-vs-wordpress` comparison page. Unchanged from last night's
identical check.

## Why, precisely (not repeated title guessing)

The comment already in `data/seo/serp-overrides.ts` (lines 202-211), written during "Ranking War
Phase IV (2026-09-26)," documents this exact phenomenon as already known *before* the metadata
fix was applied:

> "real GSC query evidence for /software/umbraco shows its single largest query ('umbraco vs
> wordpress', 116 impressions) is a head-to-head comparison intent that this already-published
> comparison page should own, but the page currently gets 0 recorded impressions of its own while
> the generic software page absorbs all of them. The internal link already exists (software page
> -> comparison page via `getComparisonsInvolving`); the real, specific angle these overrides add
> is Umbraco's actual distinguishing fact (a .NET-based CMS, unlike these PHP-based alternatives),
> not a generic 'vs' template."

Confirmed tonight, at the code level:

- The internal link mechanism is real and live: `app/software/[slug]/page.tsx` imports and calls
  `getComparisonsInvolving(software.slug)` (line 116), which is the same function
  `data/comparisons.ts` exports and that actually renders comparison links on the profile page.
  This is not a missing-link problem.
- The `umbraco-vs-wordpress` (and `umbraco-vs-joomla`, `umbraco-vs-drupal`) title/description
  overrides in `serp-overrides.ts` are dated **2026-09-26 -- one day before this check.**

## The honest conclusion: this is a time problem, not an unsolved problem

A title/meta change on a low-authority-ceiling domain (the same domain-trust ceiling documented
extensively in Phase V) realistically takes weeks to shift Google's own page-selection algorithm,
not 24-48 hours. Re-checking after one day and finding no change is the *expected* result, not
evidence the fix failed. The mission's own instruction -- "Do not repeatedly rewrite titles" -- is
exactly right here: rewriting the title again, or making any further edit to either page, would
not address a timing gap and would only reset whatever signal accumulation has already begun.

## What was inspected (and found unremarkable)

- **Page age / crawl date**: not independently re-pulled tonight beyond the query-attribution
  check above; the comparison page is not new (it predates Phase IV), so "too young to rank" is
  not the explanation -- the explanation is Google's page-selection preference, which the Phase IV
  comment already correctly diagnosed.
- **Comparison authority**: `/compare/umbraco-vs-wordpress` is one of 1,348 comparison pages on
  the domain; nothing about its own internal link count was found to be unusually weak relative to
  peer comparison pages in tonight's spot check, though a full authority-graph comparison was not
  run a second time given the `growth:google-war` engine was already re-run fresh tonight for the
  protection-registry check (see `qa.md`) and returned no `INTENT_FRAGMENTATION` or
  `qualityRegressions` flags for either URL.
- **Content differentiation**: the override copy already states Umbraco's real distinguishing fact
  (.NET-based CMS vs. WordPress's PHP base) rather than a generic template -- this was correct
  when written and remains correct; no further differentiation work is needed.

## Recommendation

**Monitor, do not re-edit.** Re-check the same exact-query GSC filter in 3-4 weeks. If page
attribution still hasn't shifted by then, the next real hypothesis to test (not yet evidenced) is
whether `/software/umbraco`'s own inbound-link count is simply outweighing the comparison page's
internal-link signal, which would call for adding links, not further title changes -- but that is
speculative until the timing window has actually elapsed.
