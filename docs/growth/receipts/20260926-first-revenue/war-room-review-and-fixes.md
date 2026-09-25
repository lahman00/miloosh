# First-Revenue War Room — review and fixes — 2026-09-26

Branch `claude/first-revenue-20260926` (isolated worktree), started at `71568d5`
(the tip of `claude/first-revenue-20260925`, which was live in another worktree
with an active process attached — not touched). Scope: only the canonical five
`/software/` pages and the code that directly serves them. No new URL, cohort,
social, GSC/indexing request, Automattic/ActiveCampaign link, or affiliate-
destination visit. Local commits only; **nothing pushed, merged, or deployed.**

## What this round was

The prior sprint (`claude/first-revenue-20260925`, 6 commits) had already done
real, well-tested work: billing-cadence disclosure, a switching check per page,
a mobile sticky-CTA fix, query-aligned titles, comparison-to-money-page
routing, and split decision-card/sticky-bar impressions. Rather than redo that
audit, this round (1) hand-verified a sample of it directly against the code
and real pricing data, (2) ran a six-persona adversarial-audit workflow
(skeptical buyer, Google crawler, affiliate-program manager, analytics
engineer, mobile user, competing SEO reviewer) against the actual repository,
and (3) implemented and tested the findings that survived verification.

## Findings and fixes, by workstream

### CRO / pricing honesty
- **Close's price panel never disclosed its trial-only status.** Close has no
  permanent free plan (`free_plan`/`has_free_tier` both `false`), only a
  14-day trial. `firstRevenuePriceLine()` only ever checked
  `freePlan`/`hasFreeTier`, so a buyer saw "Start Close's free trial" next to
  a price line with zero free-related qualifier. Fixed: the price line now
  says "14-day free trial, no permanent free plan." when there's a trial but
  no permanent plan.
- **The panel hid a con that mattered.** `watchouts` truncated to
  `cons.slice(0, 2)`, dropping ElevenLabs' third con verbatim — that its free
  plan requires attribution and restricts commercial use — right next to a
  "Try ElevenLabs free" CTA. No cohort product has more than 3 cons; removed
  the cap.
- **Close's "not the best fit" line asserted a cost mechanism the catalog
  never documents.** It said to skip Close "if usage-based communications
  costs are a poor fit" — nothing in `close.json` (tiers, cons, features,
  sources) mentions metered/usage-based billing. Replaced with the two
  limitations the catalog actually documents: per-seat pricing and the
  Growth/Scale gate on automated workflows.

### Analytics integrity
- **Merchant handoffs — the metric closest to real revenue — couldn't be
  quarantined from proven-QA sessions.** Every other funnel metric
  (pageViews, ctaClicks, engagedViews) is retroactively excluded once a
  session is later proven QA, via a `qaSessions` set keyed by `sessionId`.
  The legacy outbound-click pipeline (`lib/revenue/events.ts`) never carried
  a `sessionId`/`visitorId` at all, so a handoff structurally could not be
  cross-referenced — a session proven QA (even minutes later, on a different
  page) would still have its earlier real-looking handoff permanently counted
  as genuine revenue evidence. `TrackedCtaLink` already sends both values and
  the route already validates them for the first-party pipeline; they just
  weren't threaded into the legacy sink. Fixed end to end: type, click
  tracker, route, read-side validator, and the funnel's own quarantine check.
  Older stored events with no `sessionId` keep their current, unretouched
  behavior — this is additive protection going forward, not a reinterpretation
  of history.
- **The funnel's own contamination filter was narrower than the rest of the
  analytics stack.** It only checked `isTest === true`, missing the
  synthetic-ID-prefix convention and the `LEGACY_CONTAMINATED_SESSIONS`
  registry that `lib/analytics/human-classification.ts` already applies
  elsewhere. Brought into line (duplicated the small check locally, matching
  the codebase's own established `lib/` doesn't-import-`scripts/` convention,
  rather than inventing a new shared module).

### Technical SEO
- **Software pages had no Twitter Card of their own and an incomplete Open
  Graph object.** Next.js resolves metadata per-key across route segments
  without merging into the parent's resolved object, and only backfills
  `twitter` from `openGraph` when the parent hasn't already set one — the
  root layout has. Every `/software/[slug]` page (all five money pages
  included) rendered the literal sitewide homepage title/description on
  Twitter Card previews and lost `og:site_name`/`type`/`locale`. Fixed by
  mirroring the pattern `app/[guide]/page.tsx` already uses. Scoped to
  `app/software/[slug]/page.tsx` only; `app/compare/[comparison]/page.tsx`
  has the identical gap but is outside this cohort's scope.
- **Comparison-to-money-page anchor text was one template repeated
  verbatim** across roughly 61 referring URLs (9-17 per cohort product),
  varying only by product name. Now names the actual comparison partner too
  ("Airtable pricing, alternatives and fit — beyond Coda"), so each
  occurrence is specific to the page it's actually on.

### Mobile
- **Sticky-bar disclosure was smaller than everything around it and not
  reliably its own line.** `text-[10px]` vs. `text-xs` for the price text
  beside it and the decision-card's own disclosure, and only became
  block-level at `sm:` — below that it ran on inline after the price
  sentence. Now `text-xs` and always block. Verified with a real screenshot
  at 320px.
- **Long alternative names broke mid-word on narrow phones.** The
  alternatives table's `table-fixed` + `w-1/3` name column left ~68px at
  320px, wrapping "Acuity Scheduling" as "Acuity / Schedulin-g". Switched to
  `table-auto sm:table-fixed` so the column sizes to content below `sm:`.
  Verified with before/after screenshots — clean two-line wrap at the word
  boundary, no more mid-word break, no horizontal overflow introduced.

## Checked, found not to be a problem (no change made)
- **The three-CTA-locations-per-page pattern** (decision-card, sticky bar,
  the generic `software-page-cta` card further down, plus a fourth in the
  full pricing section) resolves to the *same* destination URL for all five
  cohort products (none has a distinct `pricingAffiliateUrl`), so there's no
  destination fragmentation. The generic card's CTA is part of a pre-existing,
  deliberately-scoped, already-running A/B copy experiment
  (`software-cta-copy-v1`) — not touched, to avoid invalidating live
  experiment data over a cosmetic wording difference.
- **The decision panel and `AlternativeDecisionGuide` look similar at first
  read** (both discuss the same 2-3 alternatives), but this matches the
  house editorial structure explicitly documented in
  `docs/growth/MILOOSH_GROWTH_OS_2026.md` §4 ("the useful answer and
  shortlist early, then evidence, tradeoffs and deeper details") — not an
  accidental duplicate.
- **Structured data, sitemap `lastmod`, pricing-data freshness (17-40 days
  across all five), and the affiliate-link resolution chain** were all
  read and are correct: no invented ratings/reviews, all five sitemap
  entries use `FIRST_REVENUE_CONTENT_UPDATED_AT`, and no Automattic or
  ActiveCampaign reference resolves to a live, un-gated affiliate link
  anywhere reachable from this cohort (neither is in `active-partners.ts`,
  and `CURRENT_AFFILIATE_LEDGER` marks ActiveCampaign's status as declined).

## Flagged, not fixed — genuine open items
- **`/api/outbound-click` has no Origin/Referer/rate-limit enforcement**
  beyond a User-Agent bot filter, and accepts a client-supplied `sourcePage`
  fallback when Referer is absent. A forged POST with a normal-looking UA
  could inflate the exact metric this whole effort cares about
  (`merchantHandoffs`). A blocking fix (signed short-lived tokens, or a hard
  Referer/Origin requirement) is a real architecture decision with a real
  risk of silently dropping legitimate conversions from browsers that strip
  Referer — not something to change unilaterally without dedicated testing
  against real-world referrer-stripping scenarios. Needs an explicit decision
  from Eyal, not a unilateral fix.
- **Two measured queries have no home**: "airtable vs zoho creator" (Zoho
  Creator isn't in the catalog at all) and "airtable vs trello" (Trello is
  catalogued, but no head-to-head page exists yet). Both require new
  editorial content, which is out of scope for an engineering pass and was
  correctly deferred by the prior sprint too.

## Validation
- Targeted tests after each commit: all passed (12, 29, 42, 26 respectively
  across the affected files).
- Full suite: 215 files / 1909 tests passed (up from 1897 at the start of
  this round).
- `validate:data`: 354 software pages, 27 categories, 1348 comparisons, 0
  problems — unchanged.
- `tsc --noEmit`: pass, both per-commit and at the end.
- ESLint: pass on every changed file, and a full-project sweep at the end
  (after removing a stray `.next-miloosh-qa` isolated-build directory that
  had briefly made the sweep pick up compiled JS bundles — a methodology
  artifact, not a real repository issue).
- Real local production build (`VERCEL=0 MILOOSH_QA_BUILD=1
  BLOB_READ_WRITE_TOKEN=''`) three times across this round, each followed by
  `scripts/growth/first-revenue-browser-qa.mjs` against the running server:
  15/15 viewport runs (1440/390/320px × 5 pages) passed every time — native
  clicks, correct identity on every event, correct destination URL, no
  horizontal overflow.
- Real browser verification (not curl, which returns React's streaming RSC
  payload for this route rather than final HTML) of the comparison-page
  anchor-text fix on `/compare/coda-vs-airtable`.
- Two before/after screenshots at 320px confirming the mobile fixes visually.

## Remaining blockers
- Nothing here is live until reviewed and released through the normal
  deploy path — no push, no merge, no deploy happened.
- Merchant page load, signup, conversion and commission remain NOT VERIFIED.
- The `/api/outbound-click` hardening question above needs an owner decision.
