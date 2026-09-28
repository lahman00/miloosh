# Morning measurement and release-readiness sprint

Authorized 2026-09-28: reconcile measurement for the existing five first-revenue pages, refresh authenticated Google inspection evidence, independently review overnight changes, and fix only demonstrated issues. Conditional release only if needed and all gates pass. No social actions or edits to protected pages.

Reader: a buyer deciding whether Airtable, Todoist, Close, Setmore or ElevenLabs fits their workflow. Goal: reliable evidence of page/CTA/handoff stages without manufacturing merchant visits or affiliate conversions.

## Initial scope and preservation

- Starting HEAD: `b1d45ebbfe378400cb93c6dddc424c90dbf1d932`.
- Independently verified live alias: `dpl_3puWCBTyyznpgBzkNmqdg9npdKKY`, source `e23a126b9b4169226bd1c84ffdb94b48daf44f05`, READY, HTTP 200.
- 16 pre-existing modified files and three untracked files are fingerprinted in `concurrent-baseline.json`. Do not stage or deploy that mixed worktree.
- Fresh protection fingerprint: `506fbd4a6d555add1a02711b9ef30584afbebad889f790418fba62c551bd4dd1`; no cohort release or experiment reset.
- Production writes, indexing requests, merchant navigation and social actions are excluded. Browser click tests use intercepted requests or isolated local storage.

## Implemented, private-only changes

1. `lib/authority/deployment-observation.ts` and `scripts/growth/capture-operations-deployment.ts`: a read-only adapter to the existing Vercel deployment guard, requiring READY Production, exact source SHA, independently resolved canonical alias, HTTP 200, and unchanged identity before/after the check. Only non-secret local evidence is written. No environment pull or deployment. Missing, invalid, future or older-than-24h evidence becomes UNKNOWN; report regeneration does not refresh observation time.
2. `scripts/growth/operations-report.ts`: no longer presents a handpicked historical CMS release as current production. Historical receipts remain separately labeled. The research report now consumes the canonical inspection store as well as its existing seed/private inputs, selecting the newest actual observation.
3. `lib/google-war/evidence.ts`: the broad Hebrew `נסרק.*` pattern falsely classified the observed translation of Discovered as Crawled. Ambiguous translated text now remains UNKNOWN; exact English evidence distinguishes discovery from crawling. Three regression tests cover both states and the ambiguous label.
4. `tests/analytics/first-revenue-journey.test.ts`: 20 exact-page/placement cases run page_view → cta_impression → cta_click → outbound_click through real handlers and isolated local stores. Both outbound representations retain identity, source path, acquisition fields, canonical affiliate destination and CTA location. Concurrent replay yields one handoff in each store. No network or production write is needed.
5. The local operations dashboard browser assertion includes the new Production identity section. No public route, affiliate asset, cohort, consent policy or social behavior was changed.

## Authenticated Google evidence

See `google-inspections.json` and the nine append-only entries in `data/growth/google-war/inspections.json`. Original observations were not rewritten.

| Exact URL suffix | Stored Google result observed September 28 | Last crawl displayed |
| --- | --- | --- |
| `/software/airtable` | Crawled — currently not indexed | September 25, 16:35:23 |
| `/software/todoist` | Crawled — currently not indexed | September 25, 16:37:52 |
| `/software/close` | Crawled — currently not indexed | September 25, 16:47:48 |
| `/software/setmore` | Crawled — currently not indexed | September 25, 16:48:31 |
| `/software/elevenlabs` | Crawled — currently not indexed | September 25, 16:47:46 |
| `/research/customer-support-pricing-2026` | Discovered — currently not indexed | Unavailable |
| `/research/crm-plan-gates-2026` | Crawled — currently not indexed | September 27, 01:57:49 |
| `/research/cms-buying-decision-2026` | URL unknown to Google | Unavailable |
| `/research/saas-pricing-pressure-index-2026` | URL unknown to Google | Unavailable |

All dates above are 2026, displayed without a proven timezone. Raw Hebrew crawl text is preserved in JSON. None is proof of a post-release crawl or indexing success. The five money pages and CRM report successful fetching, crawl/indexing allowed, and matching declared/Google canonical. Support discovery is a genuine new observation relative to its previous unknown result, not a new crawl. No new performance/impression dataset, indexing request, live inspection test or quota probe was made.

Google's temporary sitemap-processing warning on Airtable/ElevenLabs is not treated as proof of a current missing URL: all nine exact URLs are in the live sitemap. Historical `flowtemplate-delta.vercel.app` referrers on Close were recorded, not visited or changed.

## Measurement evidence and limits

- Existing read-only first-party wrapper completed at `2026-09-28T04:47:45.696Z`: **2,599 stored records**, complete pagination, zero failed/partial reads. Latest stored event: `2026-09-28T04:44:49.786Z`.
- Legacy ledger read completed at `2026-09-28T04:54:50.976Z`: **21 stored records**, zero failed reads. Lifetime: 10 explicit test, 10 explicit non-test, one unknown. Latest legacy record: `2026-09-24T22:00:32.381Z`.
- Only the already-authorized canonical-project Blob credential was loaded into a child process's memory. Raw exports remain private, ignored and mode 0600. No token/environment values are in this receipt.
- Shared post-deployment review window: `[2026-09-27T19:05:42.199Z, 2026-09-28T04:47:45.696Z)`. Across the site: 26 raw first-party records. Within the exact five money pages: no matching recorded page, CTA or outbound events in that window. Legacy outbound records in the window: zero.
- The existing morning wrapper's broader reporting window starts `2026-09-26T22:50:25.901Z` and contains 39 raw records. It is explicitly **not** substituted for the newer deployment window above.
- Empty matching rows are not proof of zero visitors or clicks. `isTest:false` is not independently verified humanity. Independent stores are not additive. No merchant arrival, conversion, commission or revenue was established.
- The Production legacy tracking variable exists, but its current runtime value was not revealed. The existing internal dashboard was unavailable with the locally available credential path. Therefore a current live legacy write is **UNVERIFIED**, not inferred from a green unit test or historical records. No credentials were pulled/decrypted and no synthetic production write was performed to fill this gap.

## Browser and production proof

Local production build, existing `scripts/growth/first-revenue-browser-qa.mjs`:

- Five pages × 1440/390/320px = 15 page/viewport cases.
- **66 native pointer activations**: four main placements per product plus Todoist's pricing/free-trial links. One cta_click and one outbound request per activation, matching event/session/visitor/acquisition fields, exact source page and test marker.
- Sticky CTA visibility, canonical, indexability, disclosure, comparison links, alternatives jump and no horizontal overflow passed.
- Engagement visibility probe: zero events during 11 simulated hidden seconds; one after at least ten foreground seconds. This is a local simulation, not real human engagement.
- Requests were intercepted; merchant navigations and persisted analytics writes: **0**.

Bounded live read-only browser check completed `2026-09-28T05:09:20.894Z`:

- **27 checks**: the five money pages and four research assets at 1440/390/320px, HTTP 200, self-canonical, title/description/single H1, no noindex and no horizontal overflow.
- All five money pages have live homepage links and sitemap entries. Their 22 own-product commercial placements match the canonical issued assets and sponsored/noopener/noreferrer attributes. No partner link was opened.
- Six public export checks passed: support 16 rows, CRM seven rows, CMS eight rows; JSON and CSV HTTP 200 with correct content types. CMS still states 7/8 have input/output, not equivalent turnkey migration.
- Screenshot inspection confirmed the live consent banner takes substantial mobile vertical space, while the sticky commercial CTA remains visible. No protected layout or consent change was made.
- Every browser non-GET, API/internal request and third-party request was blocked. Zero browser errors; merchant requests and analytics writes **0**.
- Optional HTML deployment markers are not guaranteed on static pages; authoritative identity comes from the independent Vercel alias check, not a missing DOM attribute.
- SaaS Pricing Pressure Index does not have a corresponding `/api/research/saas-pricing-pressure-index-2026` route. An exploratory GET returned 404; it is not counted among the three existing export pairs and was not labeled a broken advertised export.

Private local artifacts: `var/growth/morning-measurement/browser/browser-qa.json`, `production/qa.json`, their screenshots, `revenue-evidence.json`; refreshed dashboards at `var/growth/operations/index.html` and `var/growth/google-command/index.html`.

## Concurrent-work reconciliation

All 19 pre-existing file fingerprints still match the initial snapshot. They remain unstaged and are not part of this task's commits or deployment.

- Independently reviewed private authority-alert, GSC cohort-protection and factual-freshness changes; their existing targeted regression tests passed.
- Independently checked the support benchmark correction against [Re:amaze's official pricing](https://www.reamaze.com/pricing): 5/10/20 included monthly AI resolutions per user by Basic/Pro/Plus, with $0.85 additional resolutions. The removal of the unsupported Intercom-only arithmetic claim is supported. These three concurrent public/research files remain owned by the other lane and were **not** staged or deployed here.
- Social files were neither edited nor included in a release. Passing tests against a mixed checkout is not authorization to deploy its social changes.

## QA and release decision

- Focused analytics/concurrent-review batch: 34 files, 362 tests passed.
- New deployment capture/resolution and translation regressions: 22 tests passed.
- Exact five-page journey cases: 20 passed.
- Latest full suite: **269 files, 2,422 tests passed**.
- Full release gate rerun: **14/14 passed**, completed `2026-09-28T05:12:17.045Z`: protection, typecheck, lint, full tests, Python static-gate tests, data validation, affiliate audit, production build, emitted-static verification, query store, Google-war report, strict command center, desktop/mobile browser smoke, and diff check. See `qa-receipt.json`. These working-tree checks include concurrent changes and do not authorize deploying them.
- Data validation: 354 products, 27 categories, 1,348 comparisons, zero problems. The affiliate audit exited successfully but retains **99 findings** (including 84 stale-research warnings); this is not a claim of zero research debt. The strict command-center CTA audit checked 4,139 rendered placements with zero findings and zero merchant requests.
- Earlier harness issues were corrected: the private dashboard intentionally gained a section; the new test needed a literal tuple annotation. Live read-QA was corrected to treat an absent optional deployment DOM marker as unknown and compare raw `href` rather than the browser's Setmore slash normalization. None was a production application fix.
- **No production deploy**: all owned application changes are private reporting/evidence/tests. Current live deployment independently rechecked `2026-09-28T05:10:15.235Z`, unchanged READY source `e23a126b9b4169226bd1c84ffdb94b48daf44f05`, ID `dpl_3puWCBTyyznpgBzkNmqdg9npdKKY`, canonical HTTP 200.
- No push, messages, indexing requests, social actions, merchant navigation, public/Blob writes, protected-page edits, environment pulls or credential changes.

## Reproduction / next bounded action

Run `npx tsx scripts/growth/capture-operations-deployment.ts --read-only` with existing Vercel CLI access before `npm run growth:morning-google`; absent/stale identity remains UNKNOWN. Raw event refresh continues only through the existing authorized read-only capture wrapper. A report refresh alone never refreshes source evidence.

Next SEO action: compare the protected five-page cohort's next authenticated Google observations and matured matching performance windows against these exact baselines. Do not rewrite, resubmit or claim uplift while Google processing and the experiment window remain unresolved.
