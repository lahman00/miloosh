# Controlled integration plan — 2026-09-26

Inspected before integration: command-center HEAD `61e051d6a9be33ba52604962fe6d28bebb97f831`; Claude master HEAD `15b3d2d`; common ancestor `d336e7d`. Both inspected worktrees clean. Claude adds Organization JSON-LD and Phase V receipts; no overlap with Codex's existing command-center implementation. Antigravity artifacts in the shared `site` checkout are uncommitted and will only be read, never staged or merged.

1. Merge the exact inspected Claude commit into the isolated command-center branch, preserving both parents; no reset/rebase or checkout changes elsewhere.
2. Correct only the still-present reversed SERP lookup keys; preserve Claude's copy and add regression coverage.
3. Introduce a versioned external-evidence registry and measurements, with observed/reported/unknown provenance, time windows and immutable observations. Reconcile GSC's complete links table, not approximate narrative counts. Independently inspect Reddit target comments, not surrounding thread state.
4. Reuse first-party telemetry with a bounded research-event contract; no new tracker, outreach, merchant QA requests or production analytics writes. Existing research route remains content-owned by Claude.
5. Run all 13 gates, authority tests, research desktop/mobile QA and all-public-route local crawl. Prepare explicit integration/deployment/rollback identities. No automatic indexing or production promotion based solely on local QA.

Existing research asset discovered: `/research/saas-pricing-pressure-index-2026`. A newer Claude research asset, if added concurrently, will be inspected explicitly before inclusion; no uncommitted content is copied blindly.
