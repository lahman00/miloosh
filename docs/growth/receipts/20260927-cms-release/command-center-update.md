# CMS release — control-room update

- Live CMS URL: https://miloosh.com/research/cms-buying-decision-2026. Exact production identity is in `deployment.json`; full QA is in `production-qa.json`.
- `/research` now exposes four research assets. CMS is included in the bounded research analytics vocabulary, research technical QA, indexation watch, private research/deep-link queue and referral-funnel classification. No extra comparison/alternatives page or product content was created.
- The existing `growth:morning-google` entrypoint composes the current deployment receipt and CMS request receipt while preserving the older support/CRM request timestamps. Five research paths include the hub; missing Google/traffic observations remain UNKNOWN.
- Existing automation `miloosh-google-operations-watch` includes CMS plus support and CRM. It retains its daily 10:00 local schedule and read-only policy: no re-indexing, outreach, social, merchant navigation, public writes, push or deploy; no full-site crawl on an unchanged heartbeat.
- Canonical CMS inspection observed at 2026-09-27T17:58:24Z: URL unknown to Google, no recorded crawl or Google canonical. This is normal newly deployed evidence, not a failed production route. An accepted request, if recorded in `indexing-request.json`, is not proof of indexation.
- Wrong-owner evidence remains intact: 188 query×page observations, including 27 likely wrong-owner rows; Freshservice→Freshdesk and Umbraco-vs-WordPress→Umbraco profile are observation-only. No product fixes were made.
- Five existing external placements were reverified at 2026-09-27T17:54:12.600Z. None was lost. This is refreshed evidence, not five newly earned links or any new CMS backlink. Registry totals remain 13 placements / 5 verified / 2 verified deep-link pairs.
- Brand evidence remains the authenticated 2026-08-07–2026-09-24 window; no post-release movement is proven. First-party data remains the complete 2,562-record capture ending 2026-09-27T07:06:13.014Z, which predates the CMS deployment. Do not relabel that snapshot as post-CMS traffic, or invent conversions/merchant arrivals.
- The Antigravity handoff in `../20260927-winnable-serp-day-war/authority-handoff.json` contains the exact live URL, deployment identity, corrected seven-of-eight finding, scope limitations, and explicit prohibitions against repeating the original WordPress-only/no-export claims. This is a local handoff, not sent outreach.

## HIGH protection discrepancy — excluded, not overwritten

Current release protection: 196 distinct URLs, six cohorts; direct incoming/outgoing edge changes on protected URLs: zero. Missing/stale fingerprints fail closed and generate `STALE_PROTECTION_SNAPSHOT` at HIGH severity.

Claude's concurrent `2ca40202b781ff750c1745631161ec95067fd244` classifies Webex, Confluence and Basecamp as SAFE_TO_EDIT and changes their product records. All three are RESERVED in this release branch through `docs/growth/receipts/20260926-ranking-war/changes.json`. The separate checkout/commit is preserved and excluded. Reconcile current canonical registry inputs before any future integration; successful tests are not a protection override. The CLI boundary is not an OS lock preventing another editor from writing files.

## Evidence boundaries

Browser event proof covers 18 production journeys at 1440/390/320px, including three CMS→WordPress→CTA journeys. API requests were mocked and merchant navigation blocked: zero analytics writes, zero merchant requests, zero observed browser runtime errors. This proves client instrumentation, not durable production event storage, merchant arrival, or revenue.
