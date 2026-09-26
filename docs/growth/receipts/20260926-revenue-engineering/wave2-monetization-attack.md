# Wave-2 monetization pass: Pipedrive, Wrike and WhatConverts

Date: 2026-09-26. Branch `claude/wave2-attack-20260926`. Starting SHA `ba57785`.
Local commits only. **Not pushed, not merged, not deployed.** None of this is live.

Scope: three existing software pages. No new URL. No title or SERP override. The five-page first-revenue cohort is unchanged (Airtable, Todoist, Close, Setmore, ElevenLabs), and a test asserts that. Analytics, revenue engine, outbound routes, sitemap, social, email and affiliate applications were not touched.

## Affiliate truth (read, not changed)

| Product | Canonical state | Issued URL (registry = ledger) | Payout rail |
|---|---|---|---|
| Pipedrive | ACTIVE (decision 2026-08-19) | `https://aff.trypipedrive.com/ajtcgyu06e7i` | `partnerstack-hello`: UNVERIFIED (PayPal connected; tax/withdrawal readiness not confirmed) |
| Wrike | ACTIVE (PartnerStack welcome 2026-08-25). Commission rate **not disclosed** | `https://get.wrike.com/wdgn8ok7i5ij` | `partnerstack-personal`: OWNER_ACTION_REQUIRED (no payment provider; tax location missing) |
| WhatConverts | ACTIVE (decision 2026-08-19) | `https://partners.whatconverts.com/bmckzlf0vnl8` | `partnerstack-personal`: OWNER_ACTION_REQUIRED |

No stale "pending" source contradicted these. Demand evidence is the stored GSC figures in `WAVE2_REVENUE_CANDIDATES_2026-09-26.md` and `wave2-research.md`. No new GSC read was made. No commission, conversion or volume is claimed.

## Key findings and changes

The software page template does not render `pros`/`cons` for non-cohort pages. Only the cohort panel and compare-page money panels use them. The record-owned lever that is rendered is the `faq` field, which shows as visible text and as FAQPage JSON-LD. Each record now has a decision FAQ. Its first question answers "<brand> alternatives" and names every listed alternative.

### Pipedrive (`03606ab`, `47f09f8`)
- **Pricing unit bug.** Entry and tiers stored `billing_period: "annual"` with amount 14/39/59/79. The pricing card rendered "USD 14 / annual / seat", which reads as $14 a year, and the pricing index showed "annual billing recorded". These are now monthly per-seat rates with `annual_billing_required: true`. This is the same correction made for Wrike on 2026-09-10. Amounts and `last_verified` (2026-08-22) are unchanged.
- **Cons added** (there were none before):
  - no permanent free plan; 14-day trial
  - Lite lacks full email sync and automations, which start at Growth
  - the annual per-seat commitment
  - sales-only scope
- **`best_for`** now describes the pipeline-led fit instead of vendor positioning.
- **Feature list** labels email sync and automation as "from Growth".
- **Alternatives:** existing order kept. Added Freshsales (non-partner; already in the alternative guide) and Close (sales-first with built-in calling). Both have published comparisons.
- **FAQ** covers: alternatives by reason for leaving, free plan, the Growth gate, five-seat list-price arithmetic (US$840 or US$2,340 per year, "not a quote"), and stay vs. switch.
- No obsolete Essential/Advanced/Professional labels. A test locks this.

### Wrike (`0a56fb1` fix, `1b983fb` FAQ)
- **Contradiction fixed.** The 2026-08-23 con said "annual billing required from Business tier upward". The 2026-09-10 verified Team entry plan is annual-billed.
- **Cons added**, from the buyer checklist's official sources verified 2026-09-10:
  - seat bundles
  - external users are paid; contributors are paid limited-access
  - the Pinnacle capacity-planning gate
  - downgrades take effect at renewal
- The resource-management feature line now names its Pinnacle gate. Official URLs were added to `sources`.
- **FAQ** covers: alternatives by operating model, free plan vs. trial (Zoho Projects is named as a free option only because its record verifies one), Team 2–15 vs. Business 5–200, the capacity-planning gate, and stay vs. switch.
- **Experiment conflict:** `/software/wrike` is in the MEASURING experiment `work-revenue-20260910-wrike`, whose 28-day window closes **2026-10-08**. `1b983fb` is a separate commit so it can be held until the readout. `0a56fb1` also changes visible text: one feature line, which is a correctness fix. The buyer checklist that the experiment tests was not touched.

### WhatConverts (`4a8a3c1`)
- **`best_for`** now separates single-account plans from the Agency plan.
- **Feature lines** name their plan gates: Plus for forms, chat and transactions; Pro for the report builder; Elite for multi-click attribution.
- **Cons added:**
  - the US$30 entry plan tracks calls only
  - journey and attribution features are Elite-only
  - trial only, no free plan
  - revenue reporting depends on recorded outcomes
- **Pro added:** separate Quote and Sales Value fields.
- **FAQ** covers: CallRail, Ruler Analytics and HubSpot positioning plus a stay path; free plan; which plan tracks forms and chat; agency multi-account (Agency plan listed from US$500/month when catalogued in August 2026); usage charges.
- **Overage rates are unknown.** No per-item rate is stored anywhere, so the page says so. A test forbids invented per-minute or per-number rates.
- No CallRail price is quoted: `callrail.json`'s plan names conflict with the newer guide naming.

## Evidence used
- `data/software/{pipedrive,wrike,whatconverts,close,freshsales,zoho-projects,ruler-analytics,callrail}.json`
- `data/seo/buyer-checklists.ts` (Wrike, 2026-09-10)
- `data/seo/alternative-guides.ts`
- `data/guides/buyer-pain-guides.ts`, `buyer-pain-wave2-guides.ts`, `buyer-decision-briefs.ts`, `buyer-pain-briefs.ts`, `buyer-pain-wave2-briefs.ts`
- `docs/work-revenue-execution-2026-09-10.md`
- `docs/work-revenue-experiment-receipt-2026-09-10.json`
- `data/affiliate/{active-partners,canonical-ledger,current-affiliate-truth,payout-rails}.ts`

No vendor or affiliate page was visited. No `last_verified` or `accessed_at` date was advanced.

## Validation
- `tests/catalog/wave2-monetization-records.test.ts`: 31 tests covering affiliate URL, rel and disclosure; cohort boundary; published comparison for every alternative; FAQ/JSON-LD parity; FAQ dates matching `last_verified`; cadence; cons and limits; no stale Pipedrive labels; no Wrike commission; WhatConverts account and usage caveats.
- Full suite: 236 files / 2,070 tests pass. `tsc --noEmit` clean. ESLint clean on the touched test. `validate:data` reports 354 pages and 0 problems. `npm run build` passes. `test:static-gate` passes (11 tests). `verify:static` reports 0 failures.
- **Rendered QA** (`next start`, headless Chromium, 1366px and 375px):
  - All three pages return 200, have one H1, a self-canonical, and no robots meta.
  - Merchant CTAs carry the exact issued URL with `rel="sponsored noopener noreferrer"`, and the disclosure is present.
  - FAQ JSON-LD equals the visible text. No duplicate H2, zero horizontal overflow, no page errors.
  - Every non-localhost request was blocked; none was attempted. Nothing was clicked.
- **Supporting paths:** these eight comparisons return 200, each with a sponsored merchant link:
  - whatconverts-vs-callrail
  - whatconverts-vs-ruler-analytics
  - whatconverts-vs-hubspot
  - pipedrive-vs-close
  - pipedrive-vs-freshsales
  - hubspot-vs-pipedrive
  - monday-vs-wrike
  - smartsheet-vs-wrike

## Remaining blockers and out-of-scope findings (not changed)
1. Payout: the Wrike and WhatConverts rail needs a payment provider and tax location. Pipedrive's rail is unverified. Owner action.
2. Hold decision for `1b983fb` until after the 2026-10-08 Wrike readout.
3. Prices are dated catalog snapshots (Pipedrive 2026-08-22, Wrike 2026-09-10, WhatConverts 2026-08-24). Re-verify before promoting a release.
4. `data/guides/registry.ts` has unsupported Pipedrive claims ("fraction of the cost", "widely favored by real estate teams"). It is a giant shared registry, so it was left alone.
5. `callrail.json` has an unsourced "Flawless" pro and a plan-name conflict with the guides. That record is outside this scope.
6. CTA treatment copy renders "Visit WhatConverts's Official Site". That comes from the shared experiment helper, not this scope.
7. `data/social/AFFILIATE_EDITORIAL_MATRIX.md` says no WhatConverts comparison exists, which is stale. Social is out of scope.
8. The software `Sources` card shows one `accessed_at` date for all listed URLs. Pricing and help URLs carry their own verification dates in pricing and checklist data.
