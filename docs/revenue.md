# Revenue intelligence (Sprint 8) — architecture, not a live feature

> Historical Sprint 8 design, **not current operational truth**. The “nothing
> live” statement and catalog-field activation instructions below are obsolete.
> Current relationship/link authority is `data/affiliate/active-partners.ts`
> plus `data/affiliate/canonical-ledger.ts`, resolved through `lib/affiliate.ts`.
> A catalog `affiliateUrl` alone cannot activate a relationship. Current funnel
> semantics: [revenue measurement contract](revenue-measurement-contract.md).
> Current five-page cohort: `data/revenue/first-revenue-cohort.ts`. Historical
> scoring is not measured GSC demand, verified approval, or a second cohort.

Sprint 8 asked for the research and scoring behind Miloosh's future
revenue strategy, plus the architecture a real implementation would sit on.
**Nothing here is live.** No tracking is enabled, no affiliate link is
active, and the dashboard that surfaces all of this is deliberately kept
out of navigation, the sitemap, and search indexing. This mirrors how
`/compare` was built two sprints before it was routed, and how
`lib/affiliate.ts`/`lib/monetization.ts` were built in Sprint 6 with no
entry actually using them.

## Business model

Miloosh's revenue model, in priority order (see `lib/revenue/opportunities.ts`
for the full ranked list with rationale):

1. **Affiliate links** — commission on the existing "visit official site"
   CTA, for vendors with a confirmed program. Lowest effort: the mechanics
   already exist (`lib/affiliate.ts`, the `affiliate_url` schema field),
   and Phase 1 below tells us which vendors are actually worth pursuing.
2. **Premium placement** — a vendor pays for visibility (featured listing,
   category highlight), clearly labeled "Sponsored." The `sponsored`/
   `featured` schema fields and `ListingBadges` component already exist.
3. **Sponsored comparisons** — a vendor sponsors placement on a specific
   `/compare` page, without ever changing the facts shown.
4. **Lead generation**, **market reports**, **API access**, and
   **enterprise/white-label** — all real future paths, all lower priority
   because each needs infrastructure (consent capture, a distribution
   channel, external demand, a sales motion) this project doesn't have yet.

The unifying constraint across all six: **the comparison content itself
never changes for money.** A sponsored listing can be labeled and
positioned; it cannot alter a feature list, add a rating, or hide a
competitor. That's the same rule that's held since Sprint 1 — commercial
pressure doesn't get a carve-out from the no-fabrication policy.

## Phase 1 — affiliate program research

Every one of the 34 products in `data/software/*.json` was checked against
its own official pages (or, where named, the official partner-network
page — PartnerStack, Impact, Awin) as of 2026-07-31. Results live in
`data/revenue/affiliate-programs.ts`, one entry per software slug:

- `programExists`: `"yes"` / `"no"` / `"unknown"` — `"unknown"` means a
  real search was done and no definitive official answer was found, not
  that nobody checked.
- `type`, `networkName`, `countryRestrictions`, `commissionModel`,
  `recurrence` — every value here is either lifted from an official page
  or `null`/`"unknown"`. Nothing is estimated or inferred.
- `notes` — what was actually found, including when a claim is
  lower-confidence (e.g. a page returned 403 and the detail comes from a
  search-result snippet instead of a direct fetch — Canva and Coda are the
  two entries flagged this way).
- `sourceUrls` — the actual pages checked.

Results at a glance: 15 confirmed programs, 13 confirmed no program, 6
unresolved (Evernote, GitBook, Guru, Microsoft Teams, Zapier, Zoom).
Canva is recorded as a confirmed "yes" but flagged low-confidence — the
official Help Center pages returned 403 on every fetch attempt, so the
network name and terms come from third-party sources, not a directly
verified Canva page. Atlassian's Jira, Confluence, and Trello all point to
the same Atlassian-wide partner program (Solution/Marketplace/Global
Alliance/Platform Partner tiers) — a B2B reseller/solution-partner
arrangement with no disclosed consumer commission structure, so all three
are recorded consistently as "no" rather than a consumer affiliate
program. Salesforce and Discord are the same story: real partner
programs, just not consumer affiliate ones.

`lib/revenue/affiliate-manager.ts` is the read layer over this dataset —
`getAffiliateProgram(slug)`, `getConfirmedAffiliatePrograms()`,
`getUnresolvedAffiliatePrograms()`, `countAffiliateProgramsByStatus()`.

## Phase 2 — revenue scoring

`lib/revenue/scoring.ts` computes a 0-100 `totalScore` per software from
four 0-10 components, each either a real stored value or a documented
editorial weight — never a fabricated commission number:

| Component | Weight | Source |
|---|---|---|
| Affiliate availability | 3.5 | Phase 1 data: confirmed=10, unresolved=5, confirmed-none=0 |
| Commercial intent | 2.5 | The software's own stored `pricing.model` (paid=10, freemium=7, unknown=5, free=3, open_source=2) |
| Category value | 2.0 | Editorial per-category weight, `lib/revenue/category-value.ts` |
| Buying intent | 2.0 | How many curated `/compare` pages this product appears in (`data/comparisons.ts`), scaled `min(10, count × 2.5)` |

**Category value table** (documented judgment, not measured): CRM = 9,
Automation = 8, Project Management = 8, Productivity = 6, Communication =
6, Design = 6, Knowledge Base = 5, Scheduling = 5. Reasoning: CRM and
automation tools tend to have the clearest B2B purchase decision and the
richest affiliate/partner economics (see how many of Pipedrive/HubSpot/
Make/n8n's programs pay recurring revenue share vs. flat one-time fees);
knowledge-base and scheduling tools skew toward smaller deals and
prosumer usage.

**A known limitation, stated plainly**: most software entries don't yet
have a stored `pricing.model` (it's an optional field, honestly left
unpopulated where Sprint 4's research didn't confirm one), so commercial
intent currently defaults to a neutral 5/10 for most of the dataset. That
makes the score lean more heavily on affiliate availability and buying
intent than the four-component design ideally would. The fix is more
`pricing.model` research, not a scoring workaround — recorded here instead
of quietly working around it.

## Phase 3 — commercial priority tiers

`lib/revenue/tiers.ts` splits the 0-100 score range into three tiers:

- **Tier A** (score ≥ 70) — 6 products: ClickUp, Asana, Notion, Monday.com,
  HubSpot, Pipedrive. All have confirmed affiliate programs, sit in
  high-value categories, and (except HubSpot/Pipedrive) appear in several
  published comparisons.
- **Tier B** (40-69) — 16 products: Make, Todoist, Airtable, Miro,
  Lucidchart, n8n, Canva, Doodle, Cal.com, Microsoft Teams, Zapier,
  Evernote, Zoom, Trello, GitBook, Guru. Mostly confirmed programs in
  moderate-value categories, or unresolved programs that would move to
  Tier A with a follow-up.
- **Tier C** (< 40) — 12 products: Jira, Slack, Linear, Salesforce, Coda,
  Discord, Confluence, Obsidian, Mattermost, Figma, Sketch, Calendly. All
  have a confirmed **absence** of a consumer affiliate program — the
  lowest-effort revenue path just isn't available for these, regardless of
  category value. Jira lands here alongside Confluence and Trello despite
  its high-value category, since all three share the same Atlassian
  partner program with no consumer commission structure.

`explainTier(breakdown)` generates the specific rationale sentence per
product from its own score breakdown (see the Revenue Dashboard).
Thresholds (70 / 40) are a simple three-way split, not derived from any
external benchmark — easy to revisit once real conversion data exists.

## Phase 4 — architecture

Everything below is real, functioning code. Nothing is called from a live
page, and no tracking fires — enabling any of it requires an explicit,
documented step (see "Turning this on for real").

- **Affiliate Manager** (`lib/revenue/affiliate-manager.ts`) — read API
  over the Phase 1 dataset. Distinct from `lib/affiliate.ts` (Sprint 6),
  which builds the actual CTA URL/rel/tracking-params for a software
  entry's `affiliate_url` field; the Affiliate Manager only answers "what
  do we know about this vendor's program."
- **Outbound Event abstraction** (`lib/revenue/events.ts`) — an
  `OutboundEvent` type (`official_site_click` / `affiliate_link_click` /
  `vendor_link_click`, with the software slug, destination, and URL) and
  `recordOutboundEvent()`, the single choke point any tracking would go
  through. Gated behind `NEXT_PUBLIC_REVENUE_TRACKING_ENABLED` (unset —
  off), following the same env-var-gate convention as
  `lib/analytics.ts`. Even when enabled, there's no destination/sink
  configured yet — no analytics provider or warehouse has been chosen for
  revenue events specifically, so wiring one in would be fabricated
  architecture.
- **Click Tracker** (`lib/revenue/click-tracker.ts`) — the capture layer:
  `trackSoftwareCtaClick(software, resolvedUrl)` and
  `trackVendorLinkClick(software, url)` build the right `OutboundEvent`
  and hand it to `recordOutboundEvent`. Not called from any component —
  wiring an `onClick` into the CTA button is the step that turns this from
  architecture into a live feature, and that step hasn't been taken.
- **Revenue Dashboard** (`app/internal/revenue/page.tsx`) — an internal
  page listing every software entry with its tier, score breakdown, and
  affiliate program status, plus the ranked Phase 5 opportunity list.
  `robots: { index: false, follow: false }` in its own metadata, and
  `/internal/` is disallowed in `app/robots.ts` as defense in depth. Not
  linked from the navbar, footer, homepage, or sitemap.

## Turning this on for real

1. **Affiliate links**: for a Tier A/B product with a confirmed program
   (`programExists: "yes"` in `data/revenue/affiliate-programs.ts`), get
   the actual affiliate account/link, then set `affiliate_url` on that
   product's `data/software/*.json` file. `lib/affiliate.ts` already
   handles the rest — CTA URL, `rel="sponsored"`, tracking params,
   disclosure note.
2. **Outbound tracking**: pick a real destination (analytics provider,
   warehouse, spreadsheet — anything), implement it inside
   `recordOutboundEvent()`, set `NEXT_PUBLIC_REVENUE_TRACKING_ENABLED=true`,
   and wire `trackSoftwareCtaClick`/`trackVendorLinkClick` into the actual
   CTA `onClick` handlers.
3. **The dashboard**: once any of the above is real, decide whether it
   should stay internal-only (recommended — it exposes commercial
   strategy) or move behind real authentication if it needs to be
   reachable by a non-technical teammate.

## Risks

- **Trust erosion**: this project's entire premise is that comparisons are
  honest and non-fabricated. Any monetization that changes what's shown
  (not just what's linked/labeled) breaks that premise and the SEO/trust
  moat it depends on. The Phase 4 architecture is built so content and
  commerce stay structurally separate — but that only holds if future
  changes respect it.
- **Stale affiliate data**: Phase 1 research is a snapshot at 2026-07-31.
  Programs open, close (Coda's already has; Figma's already has; Doodle's
  is closing April 2026), and change terms. `data/revenue/affiliate-programs.ts`
  needs periodic re-verification, not a one-time check.
- **Unresolved entries are not "no"**: 6 products are marked `"unknown"`
  rather than `"no"` because official pages didn't resolve (JS-rendered
  apps, 403s, no fetchable content). Treating "unknown" as "no affiliate
  opportunity" would silently drop real revenue potential — they're scored
  at a middle value (5/10) specifically so they don't get buried.
- **No live legal/compliance review**: none of this has been reviewed
  against FTC affiliate-disclosure requirements, GDPR/CCPA for any future
  click-tracking, or each individual affiliate program's specific terms
  (several explicitly prohibit certain promotional methods). Required
  before any of Phase 4 is switched on, not covered by this sprint.
- **Category-value table is a judgment call**: it's transparent and
  documented, but it's still an internal estimate, not a market study —
  worth revisiting once real conversion or commission data exists per
  category.

## Future roadmap

Roughly in the order it makes sense to pursue, following the Phase 5
ranking in `lib/revenue/opportunities.ts`:

1. Re-verify the 6 unresolved affiliate programs and the 2 low-confidence
   entries (Canva, Coda) with a direct account-manager contact where
   automated fetching failed.
2. Get real affiliate accounts for the 6 Tier A products with confirmed
   programs; populate `affiliate_url` one at a time, verifying each link
   actually works before publishing it live.
3. Choose a real analytics/event destination and implement
   `recordOutboundEvent()` for real, so click data exists before making
   any placement decisions on gut feel.
4. Only after affiliate revenue is live and measured: evaluate premium
   placement and sponsored-comparison deals, using real click/conversion
   data instead of the Phase 2 estimate to decide which vendors to pitch.
5. Lead generation, market reports, API access, and enterprise/white-label
   stay explicitly out of scope until there's evidence (inbound interest,
   real usage volume) that justifies the infrastructure investment each
   one needs.
