# Google intelligence + revenue command center

Engineering lane, September 26, 2026. Built on Claude's integrated `d336e7d` in branch `codex/google-command-center-20260926`. No treatment copy, ranking order, titles, affiliate assets, social code, production environment, deployment, indexing request or outreach action was changed by this task. The only application-rendering change is three nonvisual `data-*` attributes on each of the existing CTA wrappers. They add no event listener, tracking request, navigation interception, dependency or hydration state.

## Run

From the command-center worktree:

```sh
npm run growth:release-google
```

This executes 13 fail-closed local gates: TypeScript, ESLint, full Vitest suite, Python static-gate tests, catalog validation, affiliate audit, isolated production build, complete static artifact audit, query import, existing Google War engine, command center/CTA audit, desktop/mobile browser smoke, and `git diff --check`. It does not deploy. Google/API credentials are not needed to reproduce the committed-evidence run. `agent-browser`, local Chrome, Python and Node must be available for the browser gate. Browser QA creates its own loopback servers, blocks `/api/**`, does not click merchants, and closes only its own processes/session.

Outputs (gitignored):

- `var/growth/google-command/index.html`: private local control-room view; no public application route.
- `var/growth/google-command/latest.json`: full queues, evidence, cohort checkpoints, ownership, CTA audit, graph and attribution.
- `var/growth/google-command/site-change-manifest.json`: URLs, intervention/receipt commit identity, reason, primary intervention, experiment, local verification and separate deployment evidence.
- `var/growth/google-command/query-page.json`: replay-safe query×page observation history.
- `var/growth/google-command/release/gates.json` and per-gate logs.
- `var/growth/google-command/browser/`: three viewport screenshots and nine page/viewport inspection results.

Open the HTML locally or serve **only that directory** on loopback, never the repository/environment files. The view intentionally exposes unknowns rather than fabricated conversion rates or populated sample results.

## Mission coverage

| Requirement | Implementation / evidence contract |
|---|---|
| 1. Freshness precedence | `lib/google-war/resolver.ts`: authoritative individual inspection, committed Pages evidence, historical performance, then unverified report. Newest observation wins within inspection tier, live wins timestamp ties. A cached live label cannot outrank a newer actual inspection. Contradictions/future checks hold ranking. |
| 2. Stale ranking | New non-indexed evidence routes to index selection; export time and performance window are distinct. Report-only exclusions remain UNKNOWN and are blocked conservatively. |
| 3. Query×page store | `query-store.ts` plus `growth:query-page`: 85 observations from 17 exact page-filtered captures. Missing clicks, CTR and position remain null. Day precision retained; no invented exact capture time. Replays add zero rows, conflicting immutable records throw, append uses a lock and atomic rename. |
| 4. Query ownership | Existing exact product/comparison owner only; CORRECT_OWNER / LIKELY_WRONG_OWNER / AMBIGUOUS / NO_DATA. No creation or consolidation recommendation from semantics alone. |
| 5. Cannibalization | Same exact query + property/type/device/country/window, multiple pages with positive observed impressions. Re-exported rows not summed. Observation of split is not proof of harm. |
| 6. Ranking delta | `measurement.ts`: 7/14/28 equal inclusive Pacific-date windows around the first full post-deployment day, excluding deployment day. Incompatible dimensions/windows rejected. Zero baseline never becomes a percent gain. |
| 7. Cohort registry | `cohorts.ts` is the canonical derived read model: Waves 1/2/3, comparison quality, Umbraco metadata and comparison factual-depth cohort. Membership is imported from existing registries/receipts rather than forked lists. Canonicalizes reversed comparison aliases and preserves overlap warnings. |
| 8. Treatment/control | Assigned, measured and missing page sample sizes; descriptive difference in mean observed change only. Natural controls explicitly are not held-out/randomized controls. No causal or significance claim. |
| 9. Recrawl | NOT_RECRAWLED / RECRAWLED_EXCLUDED / INDEXED / UNKNOWN. Exact crawl timezone and evidenced deployment required. Localized unknown-timezone crawl strings are not parsed by guessing. Treatment result waits for recrawl; commit time cannot start the deployment clock. |
| 10–12. Permanent queues | Striking distance 8–20 and >=100 observed impressions, safe and commercially relevant. CTR review only at positions 1–10 with >=100 impressions and <1% observed CTR. Thresholds are operator policy, not Google benchmarks. Lost-indexation URLs never enter either queue. |
| 13. Internal authority | Existing emitted-HTML graph reused: inbound links, unique sources, source types, content/anchor context, home/hub click depth. This is a local artifact graph, not PageRank or production crawl proof. |
| 14. External evidence | `offsite.ts` and `data/growth/google-war/offsite.json`: VERIFIED_LIVE / REPORTED_UNVERIFIED / PENDING. Public directory link, email sent, article submitted and removed comment are different facts. No imported DR or ranking-causation claim. |
| 15. Outreach attribution | Controlled Miloosh landing UTMs only. Classified referral sessions reported separately. No merchant URL is rewritten; no Google-to-person or referral-to-ranking causal join. |
| 16. Organic funnel | Existing first-party event/classification system, not a new tracker. Organic visit → >=10s engagement → exposure → matching CTA click → recorded handoff. Same visitor/session/page/product/location; whole-history QA exclusion. Independent observed stage counts preserve actual handoffs when earlier telemetry is missing. Handoff is not proven merchant arrival/conversion. |
| 17. Money queue | Exact measured landing demand, position, observed vs structural buyer intent, verified active partners and actual recorded handoff sessions when available. Unknown indexation/protected pages are visibly observation-only or require inspection. No revenue forecast. |
| 18. HubSpot | Existing canonical ledger already REJECTED, vendor display DECLINED, reason “Low reach (traffic, followers)”. Regression test and command-center gate ensure no active asset/sponsored activation. Historical ledgers not rewritten. |
| 19. CTA audit | 4,135 marked commercial/editorial-vendor links checked against current resolver and location allowlist. Affiliate sponsored/disclosure checks; nonactive sponsored and wrong destinations block release. Bare source URLs containing “buy”/“try” are not mistaken for CTAs. No merchant URL requests. |
| 20. Release integrity | `growth:release-google`; any command failure stops later gates. Successful run means local candidate verified, not deployed. |
| 21. Full crawl machinery | `growth:full-rendered-crawl` walks every emitted public HTML route via an isolated browser, sequentially. Cross-origin requests, non-GETs, APIs and internal routes blocked. Actual full production crawl intentionally deferred until integration. Static artifact coverage is already complete. |
| 22. Change manifest | `change-manifest.ts`: receipt route and canonical route, expected vs actual rendered title, commit meaning, experiment, deployment/verification kept separate. Missing expected title blocks experiment measurement, not hidden as “shipped.” |
| 23. Off-site ingestion | `growth:offsite-ingest -- /absolute/path/to/verified-live.json`: existing action-ledger schema normalized against independent evidence. EXECUTED_LIVE is not enough to self-certify visibility; conflicting reports remain quarantined. It never sends or republishes anything. |

## Evidence reconciliation: 136 is not 136 individual URL inspections

The current historical lost-indexation pool has 136 URLs. The command center reproduces that exact set: **121 with authenticated GSC-derived evidence and 15 with report-only evidence**. The latter retain state UNKNOWN and require inspection. All 136 are excluded from ranking queues.

The bulk Pages record was captured September 26 but states a **September 21 processing date**. Performance covers August 7–September 23 and was exported September 25. Overlapping periods cannot prove the exact last date a URL ranked or when it left the index. The control room preserves this lag conflict and blocks unsafe ranking recommendations. An HTTP 200, sitemap entry or report commit timestamp is never proof of index inclusion or recrawl.

Current striking-distance and CTR queues are empty under these guardrails. That is not a site-wide absence of opportunity; it is absence of **currently safe, sufficiently evidenced** recommendations in the supplied corpus.

The old `gsc-opportunity-miner.ts` is also wired to this resolver and canonical dated snapshot. It no longer reads an unversioned first-click baseline as current indexation truth, recommends “high volume” without query data, or recommends CTR changes at position 90. `commercial-priority-engine.ts` uses the same 100-impression action threshold. Protected comparisons and comparisons involving protected products are held.

## Important handoff: two recorded treatments did not render

Do not edit Claude's treatment content from this lane. In base commit `5514726033cf05cdd9e13707677f9f449aa3bf79`:

| Receipt / override key | Actual emitted canonical route | Observed local title | Result |
|---|---|---|---|
| `/compare/umbraco-vs-wordpress` | Same | `Umbraco vs WordPress (2026): .NET CMS vs PHP Publishing \| Miloosh` | Expected title renders; production still unverified here |
| `/compare/umbraco-vs-joomla` | `/compare/joomla-vs-umbraco` | `Joomla vs Umbraco \| Miloosh` | Expected title does not render |
| `/compare/umbraco-vs-drupal` | `/compare/drupal-vs-umbraco` | `Drupal vs Umbraco \| Miloosh` | Expected title does not render |

`data/seo/serp-overrides.ts` uses an exact-key lookup; `app/compare/[comparison]/page.tsx` passes the emitted route key. The two reversed keys therefore miss. Claude should reconcile keys and receipts in his content lane. The control room canonicalizes protection/ownership, preserves the original reported route in verification, and marks these results `WAIT_INTERVENTION_VERIFICATION`. It does not silently activate the content.

## Important handoff: off-site report conflicts

The concurrent authority-expansion ledger says two CRM comments are EXECUTED_LIVE based on a worker opening the surrounding thread. Independent signed-out public fetches on September 26 show “Comment removed by moderator” at both target permalinks:

- https://www.reddit.com/r/CRMSoftware/comments/1wqtnwo/comment/pc7sr55/
- https://www.reddit.com/r/CRMSoftware/comments/1uyrghz/comment/pc81v6w/

Both remain REPORTED_UNVERIFIED/removed in the canonical evidence ingester. No cause of moderation is inferred. No follow-up/repost was attempted. The source team's files were not changed. The three previously verified directory placements remain distinguishable from pending editorial/email activity; no new placement is claimed in this engineering task.

## Supplying subsequent evidence

```sh
# Replay committed page-filtered query observations (safe default).
npm run growth:query-page

# Import a normalized array conforming to queryObservationSchema.
npm run growth:query-page -- --input /absolute/path/to/query-page.json

# Optional authenticated READ-ONLY API capture; env must already be configured.
# Uses query + page dimensions, final web data, explicit dates and bounded pages.
npm run growth:query-page -- --capture-api --start YYYY-MM-DD --end YYYY-MM-DD

# Complete, locally exported first-party event history only; no production writes.
npm run growth:google-command -- --events /absolute/path/to/complete-events.json

# Matching finalized page-period observations, validated by periodSchema.
npm run growth:google-command -- --periods /absolute/path/to/page-periods.json

# Entire emitted public surface AFTER integration, against a running local build.
npm run growth:full-rendered-crawl -- http://localhost:3246

# Explicit optional production read-only run AFTER integration/promotion.
npm run growth:full-rendered-crawl -- https://miloosh.com --production-read-only
```

The analytics input envelope is `{coverage:"COMPLETE", fullHistory:true, start:<ISO instant>, end:<exclusive ISO instant>, events:[...existing FirstPartyEvent objects...]}`. Do not falsely assert completeness for a partial Blob export or retained local tail. Without a complete event source, organic/referral sessions and handoffs remain **UNAVAILABLE**, not zero. Network conversions and commissions remain UNKNOWN regardless of observed clicks.

API queries return available/top rows, not an exhaustive query universe. The committed 85 observations are a sparse page-filtered sample; zero observed multi-page query splits in that sample does **not** rule out cannibalization. No anonymous GSC query was reconstructed. Official API contracts checked September 26:

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect

Production deployment timestamps, post-intervention crawl timestamps and matching future windows were not present in the supplied evidence. Consequently no day-7/14/28 result, winner, revenue lift, indexing gain or live release is asserted.
