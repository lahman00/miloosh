# Five-page buyer-funnel delta — 2026-09-25

## Scope and reconciliation

Canonical repository: `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/site`.
Branch: `growth/buyer-acquisition-20260917`. Start: `f5ed1b2`.
Fetched the current remote branch before changes: ahead/behind **0/0**.
No rebase/pull was necessary; no reset, stash, force-push or worktree replacement.
Deduplicated the existing `80456e8` pricing/panel/funnel reconciliation and its
preceding first-revenue commits. This is a delta, not another cohort or redesign.
The unrelated LinkedIn banner edit and untracked `Miloosh SEO Sprint.png` remain
outside these commits, byte-for-byte unchanged.

Implementation commits:

- `bb665be1089a085381a95fd41007ad2913bdc717` — landing/source attribution,
  QA-session quarantine and pricing-intent write-path parity.
- `f17c5f0b9506c9093ce8aa9d09c8155fbfccf75e` — five-page decision/discovery
  improvements, Todoist trial correction and two commercial referral-leak fixes.
- This receipt and the reproducible browser harness are in a separate QA/docs
  commit; the completion message provides its hash and remote-push result.

## Exact cohort and intent

These are the only primary money pages. Query observations are property-wide
authenticated GSC evidence, **not** query-to-page attribution, keyword search
volume, or new traffic/conversion results. Full 20-query grouping remains in
`data/revenue/first-revenue-cohort.ts`.

| Existing URL | Main decision query | Decision help now surfaced | Exact existing affiliate asset |
|---|---|---|---|
| https://miloosh.com/software/airtable | airtable alternatives | Database vs docs/project/board workflow; editor-seat and limit check; Notion, ClickUp, Monday comparisons | https://airtable.partnerlinks.io/b0dz88v48tek |
| https://miloosh.com/software/todoist | todoist alternatives | Personal tasks vs broader workspace; TickTick, Any.do, Things comparisons; Pro vs Business trial distinction | https://get.todoist.io/dobo71f2y038 |
| https://miloosh.com/software/close | close alternatives | Calling-led CRM vs pipeline/suite choices; Solo is not a team quote; Pipedrive, HubSpot, Freshsales comparisons | https://refer.close.com/0alqdg4so8rm |
| https://miloosh.com/software/setmore | setmore alternatives | Appointment booking vs meetings/group coordination; staff calendars, sync and SMS; Calendly, Acuity, Doodle comparisons | https://www.setmore.com?ref=nge2zwi |
| https://miloosh.com/software/elevenlabs | elevenlabs alternatives | Voice generation vs editing/video workflow; licensing, credits and renewal terms; Murf, Descript, Synthesia comparisons | https://try.elevenlabs.io/gkp73pehjgtl |

All five are active in the canonical verified registry. None has a separate
verified pricing affiliate asset: pricing-intent buttons correctly fall back to
the issued general referral asset. These are **not claimed as pricing deep links**.
No URL was rewritten, no tracking parameter/sub-ID was invented, and no affiliate
redirect was visited during QA. Merchant final-page load and network conversion
attribution remain externally unverified. Automattic remains IN REVIEW; no
Automattic/WordPress/WooCommerce affiliate activation was added.

## Audit and changes

Common audit for all five:

- Existing search titles describe pricing and alternatives; H1s remain `Best
  [product] alternatives`. Meta descriptions already cover fit, drawbacks and
  named alternatives. Preserve the recent metadata intervention, rather than
  make another speculative rewrite.
- Live baseline: HTTP 200, exact self-canonical, no meta/X-Robots noindex,
  `/robots.txt` permits software pages, included in sitemap and linked from home.
- Existing best-fit, not-for, buying check and disadvantages retained. No
  affiliate-dependent ranking changes. The three existing alternative chips
  are now a readable two-column decision table using existing catalog fit copy.
- Fifteen links now reach the **existing published** head-to-head comparisons,
  preserving canonical pair order (including `pipedrive-vs-close`, not an
  invented reverse URL). No new URL or competing alternatives page.
- Jump links reach the price/billing check and alternative decision table.
  Existing decision-card CTA stays after these decision-critical sections;
  existing sticky CTA remains visible at the initial viewport.
- Price check now exposes the actual catalog verification date alongside its
  official source. No blanket freshening of old product facts.
- All five supporting-guide links now name “pricing and alternatives” and target
  `#buying-decision`, avoiding an extra hunt through the product introduction.
  Existing homepage/category/comparison discovery remains intact. No claim that
  these pages have measured SEO authority.
- Public affiliate disclosure and `sponsored noopener noreferrer` remain intact.
  Editorial source links stay direct and non-sponsored.
- Closed two genuine commercial direct-link leaks in Todoist's “More from” block:
  Pricing and Free trial now use its exact issued referral URL, with disclosure
  and normal CTA tracking. No pricing deep link is invented. This resolver change
  is limited to the five-page cohort; resources/docs and other products retain
  their prior behavior. The component is server-rendered, so affiliate resolution
  does not add registry logic to the browser bundle.

### Current pricing evidence

Read official sources on 2026-09-25. This spot-check confirms the purchase-critical
prices below; it is not a full recertification of every catalog feature/limit.

| Product | Purchase-critical check | First-party source |
|---|---|---|
| Airtable | Team $20/user/month and Business $45/user/month on annual billing; billable editor seats | https://airtable.com/pricing |
| Todoist | Pro $7 monthly or $60 annually; Business $10/user monthly or $96/user annually. **Pro trial 7 days; Business 14 days** | https://www.todoist.com/help/account-and-billing/plans/todoist-plans-pricing-and-billing-faq-Vq2z0HWL6 |
| Close | Solo $9/user/month annually, one user and 10k leads; workflows excluded from Solo/Essentials | https://close.com/pricing |
| Setmore | Free up to four users; Pro $5/user/month annually, $12 monthly; SMS and two-way sync on Pro | https://www.setmore.com/pricing |
| ElevenLabs | Starter $6/month; Creator $22 renewal, $11 first month, 121k credits; taxes extra | https://elevenlabs.io/pricing |

Only the newly proven Todoist discrepancy required a catalog change: remove the
unqualified 14-day trial, put 7/14-day terms on their respective tiers, add the
official FAQ source, and advance the **pricing** check date. General product
`accessed_at` was not advanced. No invented review/testing experience.

## Measurement

Commit `bb665be`: retain landing attribution through money-page journeys.

1. GSC impressions/clicks remain their independent historical baseline window.
2. `FirstPartyAnalytics` stores landing-page source, referrer and UTM fields once
   per session. `page_view` measures the site side, not a Google click.
3. Real pointer activation emits `cta_click` through `/api/analytics/event` with
   page, product, finite CTA location and anonymous visitor/session identity.
4. `/api/outbound-click` recomputes the affiliate destination from server records
   and writes first-party `outbound_click` plus the legacy affiliate ledger.
   Pricing, decision-card and sticky placements now use the same pricing-intent
   resolver as the rendered link, including future verified deep links.
5. The report now joins to the **earliest preceding landing view in the same
   visitor/session anywhere on Miloosh**, including an entry before the reporting
   window. Supporting-guide arrivals retain source/campaign/content. Other
   sessions, visitors, anonymous IDs and future touches cannot supply attribution.
6. A later QA marker excludes the session's earlier first-party events too.
   Report counts are explicitly recorded non-test events, not proven humans.
   The identity-less legacy ledger cannot inherit session classification and
   remains separate; never add the two overlapping stores together.
7. Handoff means a recorded request, **not merchant page loaded, conversion,
   approved commission or payout**. No conversion was created or fabricated.
   No network-specific sub-ID support has been newly verified.

Storage durability is the existing immutable-per-event Blob path. Real route
tests exercise both sinks against isolated local test stores. Browser QA captures
payloads only and does not write production analytics or navigate affiliate URLs.

## QA and release boundary

Commands and final results are recorded in the private receipt directory:
`/Users/eyalhaimovich/MilooshReceipts/20260925-buyer-funnel-delta/`.

- Targeted tests: 43 passed across funnel, route, pricing, rendered panels and
  commercial vendor-resource gating.
- Final full suite: **214 files / 1,876 tests passed**. Final isolated production
  build passed (3,532 generated pages). Source lint, typecheck and
  `git diff --check` passed.
- `validate:data`: 354 software pages, 27 categories, 1,348 comparisons; no errors.
- `affiliate:audit`: exit 0, 22 active partners; 108 pre-existing warnings/findings
  (including stale research and pipeline-vs-registry conflicts). Not a clean
  catalog-wide business-state audit; this sprint did not overwrite those records.
- Source lint uses `npm run lint -- --ignore-pattern '.next-miloosh-qa/**'`.
  Plain lint incorrectly scans the isolated generated build; no source rule is
  disabled. Typecheck: `npx tsc --noEmit --incremental false`.
- Build isolation: `VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN='' npm run build`.
- Reproducible local-only browser QA:
  `node scripts/growth/first-revenue-browser-qa.mjs http://localhost:3217 <receipt-directory>`.
  Five pages × 1440/390/320px; native pointer clicks on decision and sticky CTAs;
  one CTA event and one handoff request per activation, same identities, QA=true;
  no overflow/errors, exact canonical, sponsored rel, visible sticky CTA and
  working in-page anchor. Smooth scrolling is disabled **only in the QA browser**
  for deterministic pointer positioning. Thirty-six captured clicks (including
  Todoist's two resource CTAs), zero merchant
  navigations, zero production analytics writes. Both desktop/mobile screenshots
  inspected. Synthetic DOM `.click()` is not used.
- Final route/discovery checks: all five money pages and 15 linked comparisons
  return 200; all five self-canonicals, sitemap/home discovery and supporting-guide
  decision anchors pass. Todoist's two commercial resource buttons render the
  exact referral URL and sponsored rel; generic 14-day trial text is absent.
- Final browser evidence: `final/browser-qa.json` contains all 15 passing viewport
  runs and 36 trusted native clicks. All intercepted destinations match the
  rendered primary referral link. Artifacts from earlier harness failures are
  retained privately; the final rerun passes after awaiting beacon payloads and
  centering controls clear of the sticky bar. No production-code workaround was
  introduced for the browser harness.

This task authorizes branch commit/push; it does not request a direct production
deployment. No deployment/promotion or Vercel state write was performed. Live
baseline still showed the pre-delta panels when checked. Passing a local build is
not evidence that these changes are already live.

## Indexing and blockers

Only the five exact `/software/` URLs in the cohort above merit a post-release
inspection. Reuse those URLs, not new alternatives/pricing duplicates. Their
existing sitemap entries/canonicals/indexability are correct; no sitemap mass
edit or indexing request was made. Earlier authenticated inspection recorded
“crawled, currently not indexed”; a successful HTTP check does not prove indexing.

Remaining: production release of this delta; Google indexing/ranking remains
external; merchant loads, conversions and commissions require actual vendor/
network evidence. The sprint improves the decision and measurement path but does
not claim the objective of a first attributable conversion has already occurred.
