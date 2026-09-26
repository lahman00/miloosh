# Authority measurement contract

## Evidence, not inferred impact

The canonical seed is `data/growth/authority/registry.json`. Operator imports append immutable observations to ignored `var/growth/authority/registry.json`. Placement identity is external URL + exact target URL (null for a brand mention without a hyperlink). Reimports are idempotent; conflicting historical observations/identity changes fail closed. Local atomic writes are locked; there are no Blob writes.

Only exact public-placement observations may establish VERIFIED_LIVE or REMOVED. Thread-open success, submission success, email SENT and authenticated-only visibility do not establish public visibility. Conflicting audience observations stay UNVERIFIED. PENDING and REJECTED remain distinct. The fourteen-day freshness threshold is an operator policy, not a statement that an older link disappeared. An absent rel restriction is recorded as DOFOLLOW, not an endorsement or ranking guarantee. Repeated anchors to the same target on one external page count once.

GSC Links and this registry are separate datasets. The current GSC display has 100 homepage links / 0 deep links; direct public verification has three homepage placement-target pairs / two research pairs. Do not add these counts. The 93 vercel.app links are infrastructure candidates, not individually audited spam. Seven other GSC links are not automatically seven editorial endorsements.

## Reproducible read-only commands

```sh
npm run growth:authority-ingest
npm run growth:authority-ingest -- --input /absolute/path/validated-observations.json
npm run growth:brand-demand
npm run growth:authority-report
npm run growth:morning-google
```

Outputs: `var/growth/authority/{latest.json,index.html,weekly.md,morning.md,history/}`. The existing Google command-center exports link to this private local dashboard. Nothing creates a public analytics/admin route, schedules a new cron or performs outreach. The morning/weekly names describe rerunnable reports, not an installed wakeup. Local reports require the current `.next-miloosh-qa` release artifact.

To capture a fresh branded-search aggregate with existing read-only GSC credentials:

```sh
npm run growth:brand-demand -- --capture-api --start YYYY-MM-DD --end YYYY-MM-DD
```

The client requires the exact `sc-domain:miloosh.com` property and uses a successful aggregate Search Analytics response filtered by query contains `miloosh`, web, finalized data, no dimensions. This is not a sum of top visible query rows. Credentials/errors are not logged. No API capture was run in this task. A successful empty filtered aggregate means zero observable filtered metrics, not zero anonymous/unreported brand demand. Missing credentials/errors retain previous history, never create a zero. The current independent UI baseline has unknown finality and is therefore not used for finalized-period growth. Zero-impression CTR is null, not a meaningful 0% or infinite growth.

For comparison reports, the prior local latest report is used automatically; override with `--previous-report <prior-latest.json>`. First run without a prior report stays UNKNOWN. A new observation is not a newly earned link or its publication date. Brand movement requires equal-length, nonoverlapping finalized windows and equal property/type/device/country/timezone/filter. Domain category medians include n and exact member URLs; comparisons also require stable membership and explicit matching finalized scopes through `--search-scope` and `--previous-search-scope`, plus `--previous-search`. Current page-export finality/scope is not invented. Claude's historical medians are retained as a reported aggregate, not silently converted into a reproducible matched-window baseline.

## Referral and revenue observations

`--events` and optional `--previous-events` accept a local JSON envelope with `coverage: COMPLETE`, `fullHistory: true`, ISO start/end and events. The end is exclusive. Full session history is classified before date slicing so prior QA markers cannot become clean traffic. Only CONFIRMED_CLEAN, STRONG_HUMAN_EVIDENCE and PROBABLE_HUMAN buckets enter the classified estimates. Event IDs/fingerprints deduplicate replays. Raw identifiers are never exported in the authority report.

Dimensions: observed source, landing page and campaign. Counts are sessions with engagement >=10 seconds, CTA exposure, CTA click and observed outbound handoff. Referral/social sessions and all research visitors are separate views. No export means UNKNOWN, not zero. Referrer host does not identify an individual external article. No attempt joins aggregate GSC queries to a person.

A complete research handoff requires, in order, the same session's research page_view, a research-to-decision/comparison click, that destination's page_view, a CTA click, and an outbound event matching destination, software and CTA location. Raw handoffs are separately counted. Merchant arrival, purchases, commissions and causality remain unknown. Navigation and analytics failures retain existing best-effort semantics.

## Research instrumentation and Claude handoff

Existing route: `/research/saas-pricing-pressure-index-2026`. Four bounded events reuse the existing sender, endpoint, acquisition snapshot, anonymous session, event ID, QA exclusion and persistence. The server accepts only registered research paths. Source events contain hostname only; internal destinations contain bounded path only. Arbitrary URL/query/credentials are not persisted. The delegated listener does not intercept navigation and excludes commercial wrappers, avoiding duplicate CTA ownership.

Events: research_page_view, research_source_click, research_to_decision_click, research_to_comparison_click. The existing asset has decision/source links; comparison-click capability is unit-tested but no comparison link is invented in Claude's copy.

Claude's in-progress `/research/customer-support-pricing-2026` was observed in his dirty worktree, not copied. After he commits it, review its diff, add its exact path to RESEARCH_PATHS, merge non-destructively and rerun all gates. This is deliberately not a wildcard that instruments arbitrary research routes. No Claude research text, pricing source or software record was changed here.

## Observatory, alerts and indexing

Temporal sequence: first verified observation (not publication) → later known crawl → latest index evidence → explicitly dated GSC measurements. Newer exclusion evidence overrides older impression-based eligibility. Unknown crawl times stay unknown. Reports never say a link caused movement.

Alerts cover exact removed placements, visibility conflict, nonexistent target, research noindex, comparable first observed positive brand signal, and matched-window referral spikes (prior >=10, current >=50 and >=3× prior). Thresholds are operational, not statistical significance.

Indexing is an eligibility report only. `--indexing-proof` accepts an array validated by lib/authority/inputs.ts: exact URL/canonical, named production deployment, deployment/verification timestamps, HTTP 200, indexable, sitemap inclusion, fresh quota check, and explicit complete prior-request history. Missing proof/history/quota blocks eligibility; already-requested URLs cannot repeat. Verification/quota evidence expires after 24 hours. No code submits indexing requests; requestsMade is always 0.

Mass publishing remains off, autonomy remains Level 0, and the six protected experimental cohorts are unchanged. Support queues authorize neither edits nor outreach.
