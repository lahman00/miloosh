# Issue #79: price-period wording, 2026-10-17

Production at the time: `dpl_BojystVMop5C6UDwDRzqusUHp5oM`, source `912378b` (verified with `vercel inspect` and `growth:director --check-production`).

## Cause
`billing_period: annual` is the billing cadence. For 56 of the 69 annual entry prices the amount is the monthly-equivalent rate of a plan billed annually; for 6 it is a real yearly total (Volza, TickTick, Microsoft OneNote, Secureframe, SentinelOne, Veeam); for 7 the record does not say (Hubstaff, TeamViewer, Zoho Campaigns, CRM, Desk, Flow, Projects). `components/PricingSection.tsx` printed the cadence as the unit ("USD 14 / annual / seat"), and `lib/revenue/first-revenue-price.ts` printed "USD 14/year per seat" on the money-page price lines.

## Fix
`lib/pricing-display.ts` words a price from what the record's own sourced strings say about the amount (starting price, tier notes, the tier unit). Monthly: "USD 29 / month". Annual billing of a monthly rate: "USD 14 / month / seat · billed annually". Yearly total: "USD 49.99 / year". One time: "USD 279 one time". Unknown cadence: "USD 20 · billing period unstated". When the strings are silent: "USD 69 / seat · billed annually (price unit not stated)". No amount, link, CTA or disclosure changes.

Official pages checked on 2026-10-17: Pipedrive (US$14, "Per seat per month, billed annually", US$168 per seat/year), Front ("$25/seat/mo", billed annually), TickTick ("US$49.99 /Year").

## Protection — owner follow-up (2026-10-17)
Claude's initial draft preserved 141 profiles and left the published Pipedrive, Front and TickTick mislabelled. The owner subsequently authorized exactly these three factual corrections, without changing their amounts or links. The reviewed follow-up therefore preserves **138 held profiles**. The three approved slugs and official evidence are recorded in `data/seo/price-label-factual-releases.ts`. The held list does **not** automatically expire on November 4; a fresh protection review is still required.

## Release evidence — owner follow-up (2026-10-17)
- 1,786 complete static HTML pages compared with production commit `912378b`; **84 profiles differed** (the initial 81 editable pages plus Pipedrive, Front and TickTick). All 138 remaining held software profiles were unchanged, and zero other pages (including the protected comparisons) differed.
- Source-only change: amount values, URL destinations, affiliate disclosures, CTA attributes and SEO headers remain unchanged in every modified profile. The separate source/renderer audit is tied to the exact base and candidate Git commits.
- The prior `PROTECTED_PAGES_AFFECTED` warning was not waived. The Guardian now accepts this specific price-renderer change **only** when an independent, complete, SHA-pinned HTML audit proves that no held page changed and no unrelated source file was modified. Missing or failing evidence retains the block.
- On the owner-reviewed candidate, six release gates passed (including 2,617 tests), the pricing render proof passed, and the Guardian returned `RELEASE_ALLOWED`. Changes after that test require a new six-gate run on the final commit.
- Pipedrive: USD 14 / month / seat · billed annually. Front: USD 25 / month / seat · billed annually. TickTick: USD 49.99 / year. No actual amount was changed.
- The old 141-profile figures and blocked Guardian result referred to the first draft, not to the reviewed follow-up.
- No merge or live deployment is authorized merely by this audit.

## Not done
No price amount changed. The 7 annual entries with no stated unit keep a neutral label; they need an official-source check before a unit is stated. `components/DecisionMoneyPanel.tsx` has the same wording but is not used by any page. PR #75 and noindex changes are not touched.
