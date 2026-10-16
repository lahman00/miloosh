# Issue #79: price-period wording, 2026-10-17

Production at the time: `dpl_BojystVMop5C6UDwDRzqusUHp5oM`, source `912378b` (verified with `vercel inspect` and `growth:director --check-production`).

## Cause
`billing_period: annual` is the billing cadence. For 56 of the 69 annual entry prices the amount is the monthly-equivalent rate of a plan billed annually; for 6 it is a real yearly total (Volza, TickTick, Microsoft OneNote, Secureframe, SentinelOne, Veeam); for 7 the record does not say (Hubstaff, TeamViewer, Zoho Campaigns, CRM, Desk, Flow, Projects). `components/PricingSection.tsx` printed the cadence as the unit ("USD 14 / annual / seat"), and `lib/revenue/first-revenue-price.ts` printed "USD 14/year per seat" on the money-page price lines.

## Fix
`lib/pricing-display.ts` words a price from what the record's own sourced strings say about the amount (starting price, tier notes, the tier unit). Monthly: "USD 29 / month". Annual billing of a monthly rate: "USD 14 / month / seat · billed annually". Yearly total: "USD 49.99 / year". One time: "USD 279 one time". Unknown cadence: "USD 20 · billing period unstated". When the strings are silent: "USD 69 / seat · billed annually (price unit not stated)". No amount, link, CTA or disclosure changes.

Official pages checked on 2026-10-17: Pipedrive (US$14, "Per seat per month, billed annually", US$168 per seat/year), Front ("$25/seat/mo", billed annually), TickTick ("US$49.99 /Year").

## Protection
The corrected wording applies only to profiles outside `data/seo/price-label-hold.json` (141 profiles that are protected, in an observation window or in flight against `912378b`, written by `npm run seo:price-label-hold`). Held profiles keep the previous wording until 2026-11-04. **This includes Pipedrive, Front and TickTick, so the examples in the issue stay as they are on production until the hold ends or the owner releases those pages** (as was done for Coda and Segment on 2026-10-12).

## Evidence
- Rendered comparison of every page against a production build of `912378b`: 1,786 compared, 81 differ (editable software profiles, text only, price wording only), 0 only in either build. None of the 141 held profiles or the 48 held comparisons differs.
- Gates on a clean checkout of the final commit, against the base: audit, tests (2,612 vs 2,590), data validation, lint, typecheck, build all PASS, no regression.
- Release Guardian: `RELEASE_BLOCKED`, single reason `PROTECTED_PAGES_AFFECTED` with "0 affected page(s) are not editable": the Guardian flags any change to a shared component. Production lineage and identity PASS. The rendered comparison above is the evidence that no protected page changed. Not waived.
- Browser (desktop and 375px): Apollo.io, Secureframe and Fathom show the corrected wording with no overflow and unchanged canonical, robots and sponsored links; Pipedrive still shows the old wording.
- Tests: `tests/lib/pricing-display.test.ts` (monthly, annual billing of a monthly rate, genuine yearly total, one time, unknown, units that name a period, the whole catalog) and `tests/lib/price-period-labels.test.ts` (the real components, corrected and held).

## Not done
No price amount changed. The 7 annual entries with no stated unit keep a neutral label; they need an official-source check before a unit is stated. `components/DecisionMoneyPanel.tsx` has the same wording but is not used by any page. PR #75 and noindex changes are not touched.
