# Google intelligence + revenue command center — engineering receipt

Date: 2026-09-26. Result: local implementation and all 13 release gates PASS; not a production release or a claim of SEO/revenue improvement.

## Identity and scope

- Branch: `codex/google-command-center-20260926`.
- Integration base: `d336e7d29f7c59dd4a7746cd5f10e69e195dd0d7`.
- Tested implementation commit: `7b2e9361008475c802a15b60592831080d9dd3e0`.
- Isolated local build ID: `CuJUBko06cBa2tYtBu9Yw`.
- Audited artifact SHA-256: `359d086da0a8d0f8861167d81736251317c1ecc24d0962da0f4ee0a18ab2e81f`.
- Full gate execution: 2026-09-26T19:23:40.721Z through 2026-09-26T19:26:12.985Z.
- Post-commit report regenerated at 2026-09-26T19:28:00.819Z against the same artifact.
- No push, deployment, public action, indexing submission, production analytics write, secret access, merchant navigation or affiliate asset change. Claude's treatment content and concurrent working-tree changes were preserved.

The implementation adds evidence resolution, query ownership/cannibalization, compatible-window experiment measurement, recrawl gates, cohort protection, money/referral funnel analysis, off-site ingestion, rendered CTA checks, release gates and full-crawl machinery. The only application-rendering edits add nonvisual audit attributes to existing link wrappers; event behavior is unchanged. See [runbook](../../GOOGLE_REVENUE_COMMAND_CENTER_20260926.md) for all 23 requirements and commands.

## Measured local coverage

| Item | Observed result |
|---|---|
| Emitted public HTML routes | 1,782; complete static artifact audit |
| Rendered internal graph edges | 79,475 |
| Software orphans / quality regressions / structural intent conflicts | 0 / 0 / 0 in the local graph audit |
| Audited commercial and editorial-vendor tracker anchors | 4,135; 0 blocking and 0 review findings |
| Active partner records | 22; HubSpot remains declined, not activated |
| Query×page observations | 85 across 17 pages; replay added 0 rows |
| Query provenance | Committed page-filtered captures, 2026-08-07 through 2026-09-23; captured 2026-09-26 with day precision |
| Missing query metrics | Clicks, CTR and position remain null where not supplied |
| Likely wrong-owner queries | 6, on Coda and Umbraco software pages with existing comparison owners |
| Observed multi-page exact-query groups | 0 in this partial sample; not proof of no site-wide cannibalization |
| Historical lost-indexation pool | Exact 136-URL set preserved; 121 authenticated GSC-derived, 15 report-only/UNKNOWN |
| Ranking exclusions | All 136 excluded from ranking queues; report-only cases require inspection |
| Safe striking-distance / CTR queue | 0 / 0 under current freshness, protection and impression thresholds |
| Cohorts | 6; 110 treatment assignments, 68 controls, 0 current cross-cohort URL overlaps |
| First-party production funnel | UNAVAILABLE; no complete event export supplied, not zero visits or handoffs |

The bulk Pages evidence was processed September 21 although captured September 26. That lag is retained separately from the performance window ending September 23. No exact index-loss date is inferred. No deployment or recrawl timestamps were fabricated to start day-7/14/28 clocks. No conversions or commissions are inferred from handoffs.

## QA observed

All 13 `npm run growth:release-google` gates exited 0:

1. TypeScript typecheck.
2. ESLint.
3. Full Vitest suite: **249 test files, 2,222 tests passed**; 84 new tests added in this implementation.
4. Python static-gate suite: **11 tests passed**.
5. `validate:data`.
6. `affiliate:audit` (pre-existing pending/overdue follow-up warnings remain informational).
7. Isolated production build.
8. Complete static artifact audit.
9. Replay-safe query import.
10. Google War graph/priority report.
11. Command-center strict CTA audit.
12. Browser smoke at **1440, 390 and 320 pixels**: control-room view plus Jotform, HubSpot and Pipedrive-vs-Close at each viewport. Canonicals and commercial attributes inspected, no page horizontal overflow; **0 merchant navigations, 0 analytics writes**.
13. `git diff --check`.

Reproducible logs and screenshots remain local under `var/growth/google-command/`. The private view is `var/growth/google-command/index.html`; the evidence report is `latest.json`. Actual full-production hydrated crawling is intentionally deferred until integration, per mission scope; its machinery is implemented. The 1,782-route check above is a complete local static-rendered audit, not a full production browser crawl.

## Concrete integration handoffs

1. **Two expected titles do not render.** In Claude's `5514726033cf05cdd9e13707677f9f449aa3bf79`, override keys `umbraco-vs-joomla` and `umbraco-vs-drupal` differ from emitted canonical keys `joomla-vs-umbraco` and `drupal-vs-umbraco`. Actual titles remain “Joomla vs Umbraco | Miloosh” and “Drupal vs Umbraco | Miloosh”. The WordPress title renders correctly. These two experiments are `WAIT_INTERVENTION_VERIFICATION`; content was not changed from this lane.
2. **Two off-site live claims conflict with public evidence.** The imported authority ledger calls two CRM comments `EXECUTED_LIVE`; signed-out public target permalinks displayed “Comment removed by moderator”. They remain `REPORTED_UNVERIFIED`, not live authority: [first permalink](https://www.reddit.com/r/CRMSoftware/comments/1wqtnwo/comment/pc7sr55/), [second permalink](https://www.reddit.com/r/CRMSoftware/comments/1uyrghz/comment/pc81v6w/). No cause is inferred and no repost was attempted. Imported ledger: 5 records, 2 conflicts; source-team files unchanged.
3. **Missing measurement inputs remain explicit.** Supply a genuinely complete first-party event export, evidenced production deployment/crawl timestamps and compatible finalized future windows before claiming funnel totals or experiment results. Engines and failure/unknown semantics are tested; missing evidence is not replaced with zero.

## Next engineering action

Integrate this isolated branch with Claude's current work, reconcile the two title-key mismatches in Claude's lane, then rerun `growth:release-google` on the combined candidate before any release/full production crawl. No owner credentials or external action were requested in this task.
