# Miloosh first-revenue engine, 2026-10-19

Branch `claude/first-revenue-engine-20261019`, from production `1d86765` (verified via `vercel inspect miloosh.com` on 2026-10-12 and the PR #80 merge lineage; re-run `growth:director --check-production` before release). Nothing was merged, deployed, published, indexed, spent or sent. No affiliate link, partner setting or protected page was touched.

Skills used: miloosh-project-manager, miloosh-growth-director, miloosh-comparison-opportunity-finder, miloosh-affiliate-revenue-agent facts (`loadPartnerFacts`), organic-content-qa, ben-adam (embedded, zero em dashes), miloosh-release-guardian.

## What the evidence says (facts)
- **Search demand on commercial comparison pages is close to nil.** In the GSC capture (2026-10-09 historical export) the highest impressions on any comparison with a payout-verified partner is 6, with 0 clicks. 19 of 134 such comparisons have any impression at all. Search volume, keyword difficulty, competing results and conversion rate are **NOT_MEASURED** (no source).
- **27 active partners, 16 payout-verified.** A comparison is only worth promoting if a payout-verified partner is on it. 134 of 1,348 comparisons qualify; 120 of those are editable; only 10 are editable **and** have product data not shared with a held page.
- **Stale stored prices and wrong billing bases were found on products we can edit** and corrected from official pages (read 2026-10-19, re-read with each billing toggle on 2026-10-20): CallRail (yearly view $50 / $95 / $150 / $195; monthly billing $55 / $105 / $165 / $215), Dialpad Connect ($15 / $25 annual; $27 / $35 monthly), KrispCall ($12 / $32 / $48 billed annually; $15 / $40 monthly for the first two), Nextiva ($15 / $25 annual term; $23 / $50 monthly; $75 either way), Ruler Analytics (£299 monthly view; £269 with the annual toggle). WhatConverts shows $30 / $60 / $100 / $160 a month with no annual toggle. Apollo.io pros/cons corrected. `last_verified` refreshed for 8 more products whose records matched their official pages.
- **Stale and not editable here:** GetResponse and Constant Contact stored data differ from their official pages (plan names, currency, trial length). Those pairs were not promoted. Constant Contact's site returns 403 to read-only tools and needs a manual read.

## Opportunity matrix (`opportunity-matrix.csv/.json`, `npm run growth:opportunity-matrix`)
Ranked: editable with editable data, then same category, then fresh verified pricing on both products, then historical impressions. Top 10 (all editable, data editable):
1 apollo-io-vs-linkedin-sales-navigator, 2 callrail-vs-ruler-analytics, 3 krispcall-vs-dialpad, 4 krispcall-vs-nextiva, 5 whatconverts-vs-callrail, 6 apollo-io-vs-cognism, 7 apollo-io-vs-outreach, 8 apollo-io-vs-salesloft (8 upgraded in this branch), 9 apollo-io-vs-zoominfo-sales (ZoomInfo pricing not re-verified, left alone), 10 krispcall-vs-zoom (not a close substitute pair, left alone).
Rows 11 to 27 have the best historical impressions (Todoist, Marketo, Constant Contact, Airtable) but their product data is shared with held pages (comparison-quality experiment, first-revenue cohort, Nov 4 hold) or is stale, so they are **blocked, not skipped**: revisit after 2026-11-04 / 2026-11-12. Impressions in this table are single digits and say nothing about future demand.

## Page upgrades (v2 template, 8 pages; not live until merged and deployed)
apollo-io-vs-cognism, apollo-io-vs-linkedin-sales-navigator, apollo-io-vs-outreach, apollo-io-vs-salesloft, callrail-vs-ruler-analytics, krispcall-vs-dialpad, krispcall-vs-nextiva, whatconverts-vs-callrail.
Each gets a quick verdict card (every number must appear in the stored product data, enforced by tests), a pricing table with billing units and verification date (contact-sales shown as "no public price", not a number), and sourced-only pros/cons. Affiliate `rel="sponsored"` links and disclosure are unchanged.

## Rendered proof against a production build of `1d86765`
(First-pass counts, before the billing-basis corrections. The final figures for the exact final commit come from the scoped Guardian audit and are in the PR description.)
1,786 prerendered pages in each build, 30 differ, 0 only in one build. All 30 are EDITABLE per the protection snapshot: the 8 wave pages, 11 product pages whose data was corrected, 7 other comparisons using those products, 3 `best-*` guides (CallRail/Ruler/phone-system prices corrected) and the research pricing index. The remaining 1,756 pages, including every protected, observed and held page, are identical after removing build noise.
**Pricing index (`/research/saas-pricing-pressure-index-2026`), verified 2026-10-20.** It changes mechanically because product records feed it; its methodology (`lib/pricing-index/*`, the page and its components) is byte-identical to production. After the second review the 10-seat median is unchanged at $132.50 over the same 34 records. What moved: the "sources checked through" date (2026-10-15 to 2026-10-19); records with a free-trial flag 135/171 to 134/170 (Nextiva no longer lists a free trial); explicitly per-seat records 69/96 to 70/97 (Nextiva's page prices per user); the monthly USD sample 104 to 100 (CallRail, Dialpad, KrispCall and Nextiva headline prices are annual-term prices and no longer counted as explicit monthly records, which the index rule requires); the marketing category median $15.29 to $15; the communication category (4 records) drops below the 3-record floor for a category median.
An earlier draft of this PR stored Nextiva's $15 as a monthly price, which would have added it to the modeled set and moved the median to $145. That was wrong: Nextiva's page shows $23 / $50 / $75 on its Monthly view and $15 / $25 / $75 on Annually (12-month term), and the index counts only explicit monthly USD records.

## Measurement (`npm run growth:first-party-funnel`)
New pure aggregator `lib/growth/funnel-by-landing.ts` (7 tests): landing page x channel, qualified vs probable vs excluded sessions, commercial page visits, CTA impressions and clicks, merchant hand-offs (affiliate/official), rates with explicit denominators, `null` when a denominator is zero, test-marked clicks ignored. Partner conversions and commissions are `NOT_MEASURED` unless a network figure is supplied; capture integrity stays `NOT_VERIFIED`. With no event source it reports NOT_MEASURED and exits 2; it was **not run against production data** (no credential used). A click is never reported as a conversion.

## Organic distribution
`DISTRIBUTION_PACK_DRAFT.md`: 4 posts (2 LinkedIn, 2 X) with claim sources, UTM destinations, disclosure, plus an outreach and community plan. **Draft only.** Needs owner approval, a deployed branch and an authenticated session.

## Validation (candidate `cf80a0d` code commit; re-recorded on the final commit, see PR)
audit, tests (2,633), validate-data, lint, typecheck, build: all PASS in a clean checkout; base `1d86765`: all PASS (2,618 tests). Release Guardian verdict is in the PR description.

## Executed / blocked / needs approval
- Executed: matrix, data refresh, 8-page upgrade, funnel report, distribution drafts, rendered proof.
- Blocked: Todoist/Marketo/Constant Contact/Airtable pairs (held until 2026-11-04 or Playcode/Lovable 2026-11-12); GetResponse/Constant Contact data stale; PR #75 untouched.
- Needs owner: review/merge/deploy; decision on the research index; any posting; partner payout actions (MailerLite, Impact, Tapfiliate rails; legacy PartnerStack verification); PSI/Core Web Vitals still unmeasured; GSC newest data is the 2026-10-09 capture.
- No revenue is promised. There are no verified commissions and no verified traffic yet.
