# Wave-2 revenue candidates — 2026-09-26

Evidence-only shortlist of **existing** Miloosh URLs for a possible second revenue wave. No new URLs. This does not replace or extend the five-page first-revenue cohort (Airtable, Todoist, Close, Setmore, ElevenLabs), which remains the only active acquisition campaign (`docs/growth/FIRST_REVENUE_SPRINT_2026-09-25.md`). Nothing here is a mandate to create or re-rank content.

## Evidence rules

- Page metrics come from `data/seo/priority-snapshot.json`: an authenticated GSC Pages-table capture for `sc-domain:miloosh.com`, window **2026-08-07 → 2026-09-21**, 537 page rows, page-level only. Values are impressions / clicks / average position. Every row below was re-read from that file on 2026-09-26.
- Query labels are taken from `docs/work-revenue-queue-2026-09-10.csv` (window 2026-08-10 → 2026-09-06). Windows differ between sources and must not be summed.
- No search volume, CTR forecast, conversion rate, commission or payout is claimed. Every candidate currently has **0 clicks**.
- Affiliate state is taken from `data/affiliate/current-affiliate-truth.ts` and `data/affiliate/active-partners.ts` as corrected on 2026-09-26. **Pending is not approved**: ActiveCampaign (re-application) and Automattic/WooCommerce are `PENDING_REVIEW` with no link.
- "Partner route" means an active partner that already appears on the page through **existing editorial** alternatives/checklist content (`data/seo/alternative-guides.ts`, `data/seo/buyer-checklists.ts`). Rankings and alternative lists must not be changed for commission reasons.

## Ranked candidates

Ranking: observed impressions and position first, then intent (alternatives/pricing over brand), then whether the subject itself is an active partner, then cannibalisation risk. Subject = the product the URL is about.

| # | Existing URL | GSC (impr / clicks / pos) | Subject affiliate state | Partner route on page (editorial, unchanged) | Intent | Cannibalisation / note |
|---|---|---|---|---|---|---|
| 1 | `/software/pipedrive` | 351 / 0 / 78.0 | **ACTIVE** (subject monetized) | — | alternatives ("pipedrive alternatives" 163 / 0 / 77.57) | Same CRM decision space as cohort Close; distinct brand query. Low. |
| 2 | `/software/wrike` | 238 / 0 / 88.4 | **ACTIVE** (subject monetized) | monday | alternatives | Already an experiment (2026-09-10). Position is weak. |
| 3 | `/software/salesforce` | 466 / 0 / 75.6 | OWNER_ACTION_REQUIRED (not monetized) | pipedrive, close | alternatives | Routes into cohort Close; don't target Close queries here. |
| 4 | `/software/clickup` | 468 / 0 / 84.9 | REJECTED | monday | alternatives | Highest impressions; subject can never carry an affiliate link. |
| 5 | `/software/ecwid` | 408 / 0 / 74.3 | OWNER_ACTION_REQUIRED (Impact portfolio) | shopify, wix | alternatives | Existing experiment; `/compare/ecwid-vs-shopify` has zero visibility. |
| 6 | `/software/ringcentral` | 234 / 0 / 68.3 | OWNER_ACTION_REQUIRED | krispcall | alternatives | Best position among top-volume rows. |
| 7 | `/software/zoho-crm` | 265 / 0 / 81.0 | PENDING_REVIEW (Zoho) | close, pipedrive | alternatives | Routes into cohort Close. |
| 8 | `/software/smartsheet` | 259 / 0 / 80.8 | OWNER_ACTION_REQUIRED | airtable, monday, wrike | alternatives | Routes into cohort Airtable; overlaps #2. |
| 9 | `/software/activecampaign` | 251 / 0 / 78.2 | **PENDING_REVIEW** (re-application; no link) | getresponse | alternatives | Subject stays unmonetized until verified approval + issued URL. |
| 10 | `/software/calendly` | 204 / 0 / 82.1 | NO_REAL_PROGRAM_FOUND | setmore | alternatives | Routes into cohort Setmore; checklist lists Setmore only (see review item). |
| 11 | `/software/synthesia` | 170 / 0 / 73.8 | OWNER_ACTION_REQUIRED | elevenlabs (catalog alternatives) | alternatives | Routes into cohort ElevenLabs. |
| 12 | `/software/klaviyo` | 165 / 0 / 79.2 | OWNER_ACTION_REQUIRED (PartnerStack portfolio) | omnisend, mailerlite | alternatives | Existing experiment (re-registered 2026-09-12); checklist lists partners only (see review item). |
| 13 | `/software/doodle` | 152 / 0 / 83.7 | OWNER_ACTION_REQUIRED (collaboration portfolio) | setmore | alternatives | Routes into cohort Setmore; checklist lists Setmore only. |
| 14 | `/software/zoho-projects` | 105 / 0 / 72.2 | PENDING_REVIEW (Zoho) | wrike, monday | alternatives / vs | Shares "wrike vs zoho projects" with `/compare/wrike-vs-zoho-projects` (3 / 0 / 62.3). |
| 15 | `/software/woocommerce` | 104 / 0 / 83.0 | **PENDING_REVIEW** (Automattic; no link) | shopify | alternatives | Existing experiment; checklist lists Shopify only. |
| 16 | `/software/freshsales` | 57 / 0 / 74.6 | PENDING_REVIEW (Freshworks) | close | vs ("hubspot vs freshsales" 14 / 0 / 67.43) | Routes into cohort Close. |

### Excluded on evidence

- `/compare/acuity-scheduling-vs-setmore` (9 / 0 / 63.7): the query is a measured Setmore **cohort** query; a separate target would cannibalise `/software/setmore`.
- Active-partner software pages with no or negligible stored GSC evidence: monday, hubstaff, constant-contact, mailerlite, omnisend, krispcall, volza, jotform and surveymonkey have no row. freshbooks (2 / 0 / 27.0), moosend (2 / 0 / 19.0), whatconverts (3 / 0 / 53.0) and getresponse (2 / 0 / 87.0) have tiny rows. Monetization is ready but demand is unobserved.
- `/software/shopify` (24 / 0 / 130.0) and `/software/wix` (10 / 0 / 69.6): the subject is monetized, but the observed demand is small.

## Monetization readiness and leaks (2026-09-26 audit)

- All "Visit X" CTAs outside `app/software/[slug]/page.tsx` resolve through `lib/affiliate.ts`. No hard-coded tracking URL exists for any non-approved product. The three catalog `affiliate_url` values (hubstaff, shopify, wix) match the active registry.
- Fixed: Wix funnel URLs (domain/headless/ecommerce) are now gated on the same check that drives `rel=sponsored` and disclosure.
- Fixed: role-guide card CTAs now carry an adjacent affiliate note. Blanket "not affiliated" claims in the footer, About and Terms are now qualified with a link to the Affiliate Disclosure.
- Not changed, by design: links to official pricing pages that serve as sources or citations (PricingSection "Official pricing page", buyer-checklist sources, guide brief sources). They support verifiable claims. Rewriting them as affiliate links would compromise editorial independence.
- Handoff to the five-page owner: `components/VendorLinksBlock.tsx` routes Pricing/Trial through affiliate URLs only for the cohort. Jotform has a verified `pricingAffiliateUrl`, but its vendor Pricing link stays raw. The PricingSection CTA already uses the pricing asset, and Jotform has no stored search evidence, so this is low priority.

## Review items (not implemented)

1. **Editorial independence (checked, mitigated):** the buyer checklists for Klaviyo, Calendly, Doodle and WooCommerce list only active partners as options. The same software pages also render non-partner catalog alternatives: Klaviyo shows Mailchimp and ActiveCampaign, Calendly shows Doodle and Cal.com, Doodle shows Calendly and Cal.com, and WooCommerce shows PrestaShop. So non-partner paths remain visible. An editor may still add a non-partner or do-not-switch option to the checklist itself, based on fit rather than commission.
2. **Evidence gap:** Zapier and Canva are `REJECTED` in the ledger, citing a "vendor rejection log" that `docs/affiliate-applications.md` does not contain. The status is conservative (non-monetized), but the owner should confirm it.
3. **Before any Wave-2 action:** the five cohort pages are currently crawled but not indexed. Wave-2 work should wait for the cohort's 14/28-day review windows. It should use existing URLs only, one intent owner per query.
