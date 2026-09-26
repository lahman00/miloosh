# Methodology — Overnight Research + Trust Factory (2026-09-27)

This mission touched two research assets differently: a **re-verification and correction** of
the existing Customer Support Pricing Benchmark, and the **first build** of a new CRM Plan-Gate
Dataset. Both follow the same underlying standards; this file states them once.

## Shared standards across both assets

- **Sample defined before results.** The customer-support sample is Miloosh's own catalog
  category tag (`customer-support`, 16 products) -- not hand-picked. The CRM sample is the 7
  vendors named explicitly in the mission brief -- stated as such, not presented as exhaustive or
  representative of the whole CRM market.
- **Primary sources first.** Every price or gate fact traces to that vendor's own pricing page,
  falling back to that vendor's own help/knowledge-base documentation only when the pricing page
  itself didn't state the fact. Third-party aggregators were used exactly once, for one field
  (Zoho CRM's USD price, after its own pricing page geo-redirected to INR during this session's
  fetch) -- disclosed as such in that row's own data, not presented as a first-party figure.
- **UNKNOWN stays UNKNOWN.** Neither dataset ever fills a missing fact with an estimate, an
  inference from a similar vendor, or a third-party guess. Every unresolved field is named
  explicitly (HappyFox's pre-correction blank record; each CRM vendor's itemized
  `unknownFields`).
- **No fabricated claims.** No invented tested/used/expert-reviewed language, no fake ratings, no
  composite scores standing in for real measurement.

## Customer Support Pricing Benchmark -- re-verification methodology

All 16 rows were independently re-fetched live on 2026-09-27 and diffed against the prior
(2026-09-26) committed values, one fetch per vendor, run as a 16-way parallel workflow rather than
sequentially, so no vendor's re-check could bias or inform another's. See `dataset-audit.json`
for the full diff. The correction discipline: a discrepancy was only applied to the live dataset
after the new finding quoted specific page text as evidence (not "this seems different," an exact
quote). The revised headline stat (5 of 16 -> 9 of 16 disclosing separate AI-usage pricing) is
disclosed on the live page itself, with an explicit note that this was a correction to incomplete
original research, not vendors changing prices overnight -- see the page's own "Revised
2026-09-27" callout.

## CRM Plan-Gate Dataset -- new-build methodology

Sample: Pipedrive, Close, HubSpot (Sales Hub), Zoho CRM, Freshsales, Salesforce (Sales Cloud),
monday CRM -- exactly the 7 named in the mission brief. For each, ten fields were researched:
entry plan name/price, the minimum plan for two-way email sync, workflow automation, and sales
sequences, pipeline limits, minimum seats, contact/record scaling, annual-billing requirement,
free tier, and free trial. "Entry plan" is defined consistently as each vendor's own cheapest
*paid* plan (excluding a $0 free tier, where one exists), stated explicitly in the published
methodology so a reader can audit the definition rather than infer it.

**Derived booleans are a human judgment layer, not a parser.** Fields like
`emailSyncOnEntryPlan` or `sequencesOnEntryPlan` were manually derived by reading each agent's
full prose finding and translating it into a clean yes/no/unknown against the stated entry-plan
definition -- e.g. Close's finding ("Included... on all four plans, including Solo") becomes
`emailSyncOnEntryPlan: true`; Pipedrive's ("Lite includes no email sync at all... available on
Growth and higher") becomes `false`. This mirrors the same design principle already used for the
customer-support benchmark's AI-usage-pricing overlay: a hand-verified layer over raw research,
not a keyword scanner that could misclassify nuanced findings.

**No ranking, by design and by test.** The dataset computes counts ("N of 7 vendors do X") and
never a score, weight, or composite ranking. `tests/lib/crm-plan-gates.test.ts` asserts no row
ever exposes a `score`, `rank`, or `totalScore` property, so this constraint is enforced in code,
not just in prose.

## Why "benchmark" / "dataset," never "index," for either asset

Neither asset computes a single weighted composite score across vendors. Both report verified
per-vendor facts (and, for the customer-support asset, a small number of explicitly labeled
scenario calculations). "Index" would imply a defensible weighting formula that does not exist in
either case.
