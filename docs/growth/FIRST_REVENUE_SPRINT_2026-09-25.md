# First Revenue Sprint — 2026-09-25

Scope is restricted to the five canonical primary software money pages backed by measured GSC demand. Supporting guides may route qualified readers into this cohort but are not primary conversion targets.

## Canonical funnel

Measure each stage separately:
1. captured GSC impressions / clicks
2. recorded software-page visits
3. primary CTA impressions
4. primary CTA clicks
5. server-recorded affiliate merchant handoffs
6. verified downstream conversion / commission / payout

A merchant handoff does not prove merchant-page load, signup, sale, approved commission, or paid revenue. Downstream conversion remains NOT VERIFIED until network evidence exists.

## Five primary pages and 20 queries

### Airtable — priority 1
Page: `/software/airtable`
Baseline: 329 impressions, 1 click, avg position 78.4

- airtable pricing
- airtable alternatives
- airtable vs notion
- airtable vs monday

### Todoist — priority 2
Page: `/software/todoist`
Baseline: 167 impressions, 0 clicks, avg position 69.9

- todoist alternative [measured GSC]
- todoist pricing
- todoist vs ticktick
- todoist vs microsoft to do

### Close — priority 3
Page: `/software/close`
Baseline: 93 impressions, 0 clicks, avg position 68.3

- close crm pricing
- close crm alternatives
- close vs pipedrive
- close vs hubspot

### Setmore — priority 4
Page: `/software/setmore`
Baseline: 80 impressions, 0 clicks, avg position 70.0

- setmore alternatives [measured GSC]
- acuity scheduling vs setmore [measured GSC]
- setmore pricing
- setmore vs calendly

### ElevenLabs — priority 5
Page: `/software/elevenlabs`
Baseline: 67 impressions, 0 clicks, avg position 73.2

- elevenlabs alternatives [measured GSC]
- elevenlabs pricing
- elevenlabs vs murf ai
- elevenlabs vs descript

Captured GSC window: 2026-08-07 to 2026-09-21.

## Money-page requirements

Each canonical software page has a first-revenue decision panel with:
- current pricing context
- buyer fit
- explicit not-for / walk-away reason
- alternatives
- a primary tracked CTA

Supporting guides are discovery routes only and should point qualified readers toward these primary software pages.

## Tracking

The canonical dashboard is `/internal/first-revenue`.
It reports the captured GSC baseline separately from first-party funnel events recorded from `FIRST_REVENUE_CAPTURED_AT` onward.

Tracked stages:
- `page_view`
- `cta_impression`
- `cta_click`
- server-recorded affiliate-link merchant handoff
- downstream conversion: NOT VERIFIED until network evidence exists

Synthetic/test events remain excluded from buyer totals.

## Supporting discovery guides

These are support-only:
- Airtable → `/best-no-code-database-for-operations`
- Todoist → `/best-task-management-for-individuals`
- Close → `/best-crm-for-startups`
- Setmore → `/best-scheduling-software-for-small-business`
- ElevenLabs → `/best-voice-ai-for-creators`

Do not report these supporting guides as the primary first-revenue cohort.

## Distribution correction

An earlier guide-cohort distribution plan was superseded when the remote canonical cohort was aligned to measured GSC demand.

Four pending X posts aimed at the old guide cohort were deleted before publication:
- CRM guide
- agency project-management guide
- ecommerce-email guide
- agency lead-tracking guide

One earlier ecommerce-guide X post had already published before the canonical cohort change. Do not repeat or expand that guide campaign.

## Reddit/community gate

The currently authenticated Reddit account is `Academic_Annual_8088`, not a verified Miloosh identity. Autonomous writing is disabled and the worker reports a CAPTCHA shutdown reason. Under Miloosh identity rules, do not publish from that account.

Reddit remains valid for buyer-question research until a verified Miloosh identity is available.

## Production and validation rule

Before deploying canonical-cohort changes:
- full tests
- data validation
- lint
- TypeScript
- production build
- dependency audit

Do not force-push over concurrent remote work. Rebase and reconcile first.

## Integrity reconciliation — 2026-09-25

The five primary `/software/` targets above remain the only acquisition campaign. The comparison-only `decision-money-pages.ts` set was a competing cohort, not additional measured GSC demand. Its extra money panel is retired while all existing comparison URLs, standard content, canonicals and sitemap inclusion remain intact. Do not run both campaigns.

Current authenticated URL Inspection reads (see `private Mac receipt: ~/MilooshReceipts/20260925-first-revenue-integrity/gsc-inspections.json`) show all five primary pages crawled, currently not indexed. These are current inspection observations, not a rewrite of the earlier performance baseline. At capture, production returns 200/self-canonical for all five, and all five are linked from home and included in the valid sitemap.

Price corrections distinguish the monthly price unit from annual billing. Airtable and Close were incorrectly rendered as dollars per year; Setmore omitted per-user/annual terms. ElevenLabs Creator's first-month discount was incorrectly described as its renewal price. Exact first-party source claims are recorded in the integrity receipt; unchanged catalog source-verification dates are not advanced wholesale.

The funnel now scopes all same-product commercial CTA impressions/clicks and recorded affiliate handoffs to the exact software page, including its existing hero, pricing and buyer-decision CTAs. The buyer-decision location has a separate primary-click diagnostic, not a restriction that hides valid hero clicks. Synthetic and unclassified events are excluded; unclassified counts remain visible. Independent store failures do not discard the other store's evidence. Source/campaign attribution uses same-page, same-visitor, same-session first-party events; it is not a proof of merchant load or sale.

The earlier 20-query plan contained four measured labels and sixteen hypotheses. The fresh authenticated GSC capture now supplies 20 observed decision-query rows, with actual clicks/impressions, in `private Mac receipt: ~/MilooshReceipts/20260925-first-revenue-integrity/measured-decision-queries.json`. These are property-wide query observations, not estimated search volume or verified query-to-primary-page mappings. The executable cohort now uses those measured terms; variants share a page. Page-level figures were rechecked through 2026-09-23 and are unchanged.

Browser QA also found the buyer panel was rendered twice: once in the software page and again in its layout. The layout duplicate is removed. The retained sticky CTA has its own bounded `money-page-sticky-cta` tracking label, visible annual billing terms and an affiliate disclosure. All commercial CTA locations on the same primary page remain included in the funnel.
