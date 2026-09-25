# Complementary first-revenue sprint — 2026-09-25

Branch `claude/first-revenue-20260925` (isolated worktree), started at `92d084b`.
Scope: only the canonical five `/software/` pages. No new URL, cohort, social,
GSC/indexing request, Automattic link, or affiliate-destination visit. Local
commits only; **nothing pushed or deployed**.

## Audit findings (before changes)

| Check | Finding |
|---|---|
| Price / cadence | Panel showed the entry rate and annual commitment, but not the month-to-month rate or plan limits already in the sourced catalog tier notes (e.g. Close Solo USD 19 monthly vs USD 9 annually). |
| Limitations, fit, non-fit, alternatives | Present (best fit, not-for, two cons, top-three alternatives table). |
| Switching friction | Missing on all five pages. |
| CTA clarity | Labels said "Check X pricing", but the receipt records that none of the five has a verified pricing deep link; the buttons open the general issued referral asset. |
| Mobile | At 320px the sticky bar's text column collapsed to about 50px and the bar grew to 115–195px (up to 26% of the viewport). |
| Titles vs measured queries | Every measured cohort query is alternatives-led, while the titles led with "Pricing". The Todoist title and description promised "Microsoft To Do", which has no catalog entry, comparison or mention anywhere on the site. |
| Internal links | Comparison pages linked the money page only through a low "Full X comparison page" link, or through a lower `#alternative-decision-heading` anchor. Close had no decision-guide link. |
| Instrumentation | page_view → cta_impression → cta_click → server handoff is intact. The sticky CTA is visible on load, so total "CTA seen" roughly tracks page views and says little about exposure to the decision card. |

## Changes

1. `f393679`: buyer panel completeness (`data/revenue/first-revenue-cohort.ts`,
   `lib/revenue/first-revenue-price.ts`, `components/FirstRevenueSoftwarePanel.tsx`,
   `app/software/[slug]/page.tsx`).
   - The entry tier's existing sourced notes now appear in the price check. A `#plans` jump link goes to the full pricing section.
   - Each page gets a **proposed** switching check. These are procedural buyer tests, not new vendor claims or a migration we ran.
   - Airtable surfaces the existing `coda-vs-airtable` page for the measured "coda vs airtable" query.
   - CTA labels changed to "Try X free", used only where a free plan or trial is on record. Microcopy says the link opens the vendor site in a new tab.
   - Rankings and alternative order are unchanged.
2. `d1a2e0d`: the sticky bar stacks on narrow phones. It is now about 101px at both 320px and 390px. Billing terms and the "Affiliate link" disclosure are still visible.
3. `eb8b2f0`: the five titles and descriptions lead with alternatives and name only products the page compares. The Todoist "Microsoft To Do" promise is removed. Descriptions are 155 characters or fewer. This is relevance alignment, not a CTR test: the pages sit around position 70 and were last inspected as not indexed.
4. `b097278`: comparison pages involving a cohort product link to `/software/X#buying-decision` with the anchor "X alternatives, pricing and fit". Non-cohort comparisons are unchanged.
5. `4cfc1fd`: the funnel and the `/internal/first-revenue` dashboard now report decision-card and sticky-bar impressions and clicks as subsets, plus engaged views. Existing totals are unchanged, and missing data is still shown as unavailable.

## Validation

- Targeted tests: 55 passed. These include real server renders of five cohort comparison pages and one non-cohort comparison page.
- Full suite: 215 files / 1,897 tests passed.
- `validate:data`: 354 software pages, 27 categories and 1,348 comparisons, with 0 problems.
- `tsc --noEmit`: pass. ESLint on the changed files: pass.
- Isolated build (`VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN=''`): pass.
- `scripts/growth/first-revenue-browser-qa.mjs` against the local production server: 15/15 viewport runs pass (1440/390/320px). Clicks are native and intercepted, and every destination matches the issued referral link. There were no merchant navigations and no production analytics writes.
- Local Playwright probes compared layout before and after. All API calls were stubbed and all non-localhost requests were blocked.

## Remaining blockers

- Nothing is live until the main agent reviews, merges and releases this.
- The measured "airtable vs trello" and "airtable vs zoho creator" queries have no published comparison page. Covering them would need a new URL, which was deliberately not created here.
- Indexing and ranking are external. The pages were last observed as crawled but not indexed.
- Merchant page load, signup, conversion and commission remain NOT VERIFIED.
- Monthly-billing rates for Airtable Team and ElevenLabs Starter are not recorded in the catalog, and were not invented.
- `next dev` rewrites the Next.js block in `AGENTS.md`. That change was restored and not committed.
