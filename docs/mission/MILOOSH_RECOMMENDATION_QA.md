# BuyerDesk and `/recommend` quality check (2026-10-23)

Method: seven realistic buyer scenarios were run through `getRecommendations` (the same engine the wizard uses), reading the ranked products, confidence label and explanations. This tests the engine, not the wizard UI; no mobile or browser interaction test of `/recommend` was run in this session.

| Scenario | Top results | Confidence | Assessment |
|---|---|---|---|
| Small business CRM | HubSpot, Keap, Nutshell | high | Sound: in-domain; weaknesses disclosed as "undocumented", not invented |
| Solo CRM, free budget, needs Gmail and Slack | Salesforce, Nutshell, Copper | high | In-domain. Explanations state which required integration is not documented in stored data |
| Creator email marketing, low budget, simple | GetResponse, Brevo, Klaviyo | high | In-domain. **GetResponse's stored pricing is wrong (see the SEO audit)**, so the "low budget" fit rests on a record that cannot be corrected until 2026-11-04 |
| Founder project management, startup | Asana, Notion, ClickUp | high | In-domain |
| Automation with Google Sheets and Notion | IFTTT, Make, Zapier | high | In-domain |
| Limited-budget solo PM, free only | ClickUp, Notion, Trello | high | In-domain, free-plan gate applied |
| "Replace Miro" (no need selected, integration "Miro") | **Miro**, 1Password, 6sense | **high (defect)** | Miro is returned as its own replacement and two unrelated products follow, while their own explanations say "No strong positive signal" |
| Browse only, small team, free budget | **OpenCart, WooCommerce, Any.do** | **high (defect)** | Two store platforms and a to-do app, for a buyer who named no need |
| Whiteboard intent through another domain | none | none | Honest: "none of the products we cover fit" |

## Defect fixed (shipped to production as PR #88 on 2026-10-23, an equivalent fix)
**High confidence on a browse-only request.** `computeConfidence` judged confidence only by the top result's match percentage, so a request with no selected need could be labelled "high" while the other results admitted "No strong positive signal". Fix: when no need is selected the confidence is always `low` with the note "You didn't say what you need the tool for ... Pick a need to get a real shortlist." Regression test `tests/lib/recommend-no-need-confidence.test.ts` (browse-only answers across four constraint combinations never return high; a real CRM need still returns high). The 217 existing recommend tests pass with the change. No wizard UI, scoring, eligibility or affiliate logic was touched.

## Verified good behavior
- Hard domain eligibility holds (in-domain results for every real need tested).
- Explanations separate "matched" from "undocumented here" and never claim a weakness that is not in the data.
- Ties are broken alphabetically, not by affiliate status (documented in the engine and covered by existing neutrality tests).

## Gaps found, not fixed
1. **No whiteboard or visual-collaboration domain exists** among the 31 recommend domains, so a team replacing Miro cannot get a real shortlist; the honest "none" result is correct but unhelpful. Adding a domain needs verified product profiles (the Miro review branch's FigJam, Mural, Lucidspark data is the natural source once it is rebased).
2. **Abandonment is high on tiny volume:** 8 sessions started in 30 days, 1 completed. Steps drop after the first need selection (7 saw a step, 3 selected a need). Instrument-level step timing and a device dimension are missing, so the cause (mobile layout, question wording, or no real intent) is unknown.
3. **Mobile behavior of the wizard was not tested here.**
4. **Pricing used by recommendations inherits the stale-record problem** described in the SEO audit; the engine cannot be more accurate than its data.
5. **Legitimate conversion tracking** (`recommend_*` events and click events) works in the store, but only countable sessions were examined; the 10-23 volume is too small to validate funnel rates.
