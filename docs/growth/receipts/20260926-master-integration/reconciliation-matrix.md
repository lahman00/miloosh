# Reconciliation Matrix — Master Google Domination Integration — 2026-09-26

Branch `claude/miloosh-master-google-war-20260926`, isolated worktree, built on
`claude/indexation-factory-wave2-20260926` at `096b740` (which itself is the
most-advanced point of the Claude lineage: includes Wave 1, Wave 2, and — via
the `codex/search-opportunity-20260926` / `integration/first-revenue-20260926`
ancestry (tip `ba57785`) — a prior, already-converged reconciliation of the
revenue-integrity work). Local commits and merges only. **Nothing pushed.**

## Branch inventory and ancestry (verified, not assumed)

`growth/buyer-acquisition-20260917` (tip `92d084b`) is the shared fork point
for every lane below — confirmed by `git merge-base` returning exactly
`92d084b` against each one. It is **not** a live integration branch; it has
absorbed none of this day's work and its own checkout is currently dirty
(uncommitted Antigravity off-site-authority artifacts, live IDE attached —
treated as strictly read-only this session, never written to).

| Lane | Tip | Commits since `92d084b` | Already in this branch's ancestry before today? |
|---|---|---|---|
| `claude/wave2-attack-20260926` | `f1e147d` | 45 | Yes (ancestor of `096b740`) |
| `codex/search-opportunity-20260926` = `integration/first-revenue-20260926` | `ba57785` | — | Yes (ancestor of `096b740`) |
| `claude/gsc-demand-20260926` → `claude/indexation-recovery-20260926` → `claude/indexation-factory-wave2-20260926` | `096b740` | 57 | This branch's own base |
| `codex/google-visibility-war-20260926` | `f530cd5` | 52 | No — **merged this session** |
| `codex/funnel-final-verification-20260926` | `4043749` | 42 | No — **merged this session** (itself a prior 4-way reconciliation) |
| `codex/revenue-integrity-20260926` | `2aa2705` | 21 | Content confirmed byte-identical to what's already present — **not merged, verified redundant** |
| `codex/release-gate-20260926` | `ddec851` | 3 | Confirmed strict subset of `codex/funnel-final-verification-20260926` — **not merged, verified redundant** |
| `claude/first-revenue-20260926`, `claude/revenue-mining-20260926` | `f6dd304`, `eaa223a` | — | Folded into `codex/funnel-final-verification-20260926` by another agent before today; not independently merged here |

## Feature/change reconciliation

| Feature | Claude implementation | Codex implementation | Conflict? | Resolution | Reason | Tests protecting it |
|---|---|---|---|---|---|---|
| Portfolio-level Google visibility engine | none (didn't exist) | `lib/google-war/*` + `scripts/growth/google-war*.ts` (evidence provenance, rendered-HTML authority graph, intent-conflict detection, deployment-proof gate, indexing-request state machine) | No | **Merge Codex's system as-is** | Genuinely new, non-duplicative, more sophisticated than anything on the Claude side | `tests/growth/google-war.test.ts` (504 lines), `decision-paths.test.ts`, `google-war-quality-baseline.test.ts`, `google-war-import.test.ts` |
| URL-level readiness diagnostic | `scripts/growth/indexation-readiness.ts` (PASS/WARN/FAIL/PROTECTED) | none at this granularity | No | **Keep Claude's tool** as the simpler companion, per the mission's own stated ideal model (google-war = portfolio engine, indexation-readiness = URL diagnostic) | Different abstraction layer, not competing | `tests/growth/indexation-readiness.test.ts`, `tests/growth/quality-floor.test.ts` |
| Wave-cohort protection registry | `data/growth/frozen-cohorts.ts` (Wave 1 + Wave 2) | `lib/google-war/protection.ts`'s hardcoded `CONCURRENT_TREATMENT`/`CONCURRENT_CONTROL` (Wave 1 only, missing Wave 2 entirely — a real protection gap) | **Yes — real duplication + gap** | **Unified**: `protection.ts` now derives its constants from `frozen-cohorts.ts` and `reservedProtection()` iterates every wave, not just one hardcoded snapshot | One canonical source; a future wave edits one file and both systems see it | `tests/growth/google-war.test.ts`'s protection test (asserts specific known-protected slugs remain protected, not an exact count — verified safe to extend) |
| Legacy protected-cohort list (9 slugs) | `scripts/growth/gsc-opportunity-miner.ts`'s old hardcoded `LEGACY_PROTECTED_COHORT` | `lib/google-war/protection.ts`'s `LEGACY_RESERVED` | Already resolved **before this session** | Codex's own branch had already refactored `readProtectedExperimentSlugs()` to delegate to `loadProtection()` — this merge picked up that fix automatically | N/A (pre-resolved) | Covered transitively by every test importing `readProtectedExperimentSlugs` |
| Internal-link / inbound-authority counting | `indexation-readiness.ts`'s static `alternatives[]` + `PUBLISHED_COMPARISONS` + guide-decision counter (crude, static-data-only) | `lib/google-war/graph.ts`'s real rendered-HTML authority graph (relevance-weighted, BFS depth, real anchors) | **Yes — real duplication, and Claude's version was measurably less accurate** | **Unified**: `indexation-readiness.ts` now reads `var/growth/google-war/authority-graph.json` when present, falling back to the static count only when no build has run | Rendered HTML is authoritative per the mission's own repeated lesson (Pipedrive, the 9 reversed orphans) | Concretely fixed: birdeye/chili-piper/consensus/dbt-cloud/dropbox/floqast/hibob/knowbe4/veeam-data-platform all moved off `growth:indexation-readiness`'s FAIL list once the real graph was used (25 → 16 real FAILs) |
| Experiment-receipt parsing (`docs/work-revenue-experiment-receipt-*.json`) | `readProtectedExperimentSlugs()` (via `gsc-opportunity-miner.ts`, now delegating to `loadProtection`) | `lib/google-war/protection.ts`'s `loadProtection()` (regex `/experiment.*\.json$/`, fail-closed on malformed files) | No (same underlying files, one already delegates to the other) | No further action needed | Already a single source | `tests/growth/google-war.test.ts` |
| Factual-depth scoring | `scripts/growth/factual-depth-audit.ts` (structured 0-100 score, A/B/C/D buckets) | none at this granularity (google-war consumes it indirectly via priority signals) | No | **Keep as-is** — google-war's `priority.ts` groups reference quality dimensions conceptually but don't duplicate this exact scorer | Different layer | `tests/seo-factory/*` |
| Revenue-measurement integrity (attribution, dedup, QA quarantine, null-vs-zero, ingest hardening, CTA-exposure) | Already present via Mission 1 + the `ba57785` ancestry (verified byte-identical function signatures: `isCrossOriginEvent`, `sha256`+`allowOverwrite:false` dedup, `totalOutboundEventsSitewide: number \| null`, `IntersectionObserver`-based `cta-exposure.ts`, dual-route `sanitizeAcquisition`) | `codex/revenue-integrity-20260926`'s 21 commits (same fixes, different SHAs — rebased) | No (content converged, not textually) | **Do not merge the branch** — would be a redundant, conflict-risk-only operation on revenue-critical code | Verified via direct code inspection before deciding, not assumed | `tests/analytics/*`, `tests/lib/*` (pre-existing, unchanged) |
| Hidden-tab engagement exclusion | none (didn't exist) | `lib/analytics/engaged-view.ts` (via `codex/funnel-final-verification-20260926`) | No | **Merged** | Genuinely new, real measurement-quality improvement | `tests/analytics/engaged-view.test.ts` |
| Release-gate hardening (canonical/redirect, vendored Inter font, crawl-schema contracts) | none | `codex/release-gate-20260926`'s 3 commits | N/A | **Not merged directly** — confirmed identical in tree content to 3 of `codex/funnel-final-verification-20260926`'s commits, which was merged | Avoids merging the same content twice through two different branches | Covered by `tests/seo/crawl-contract.test.ts` et al. (arrived via the funnel-verification merge) |
| Sourced `cons[]` rendering on the software page template | Fixed in Wave 1 (`e5586c5`) | N/A | No | Already in this branch's own history | — | `tests/software-page-cons.test.ts` |
| Sourced `pros[]` rendering on the software page template | Fixed in Wave 2 (`3a4af7a`) | N/A | No | Already in this branch's own history | — | `tests/software-page-pros.test.ts` |
| HubSpot affiliate status | Already `REJECTED` since 2026-08-19 in `data/affiliate/canonical-ledger.ts` | N/A | No | Enriched (not re-classified) with the owner's fresh, specific, directly-observed decline reason | Status was already correct; only the evidence was incomplete | `npm run affiliate:audit` (no new problems) |
| "9 orphans" reversal | N/A (Claude's Wave 1/2 never claimed this) | `google-war-receipt.ts` re-checks static "orphans" against the real rendered-HTML build | No | Adopted directly (see internal-link-counting row above) — this is the same finding, now load-bearing in the merged `indexation-readiness.ts` | Rendered HTML evidence wins | See above |

## Not reconciled this session (explicitly deferred, not silently skipped)

- **Antigravity off-site authority work** (`docs/growth/MILOOSH_OFFSITE_ATTACK_20260926.md`, `MILOOSH_OUTREACH_HANDOFF_20260926.json` in the dirty `growth/buyer-acquisition-20260917` checkout): read in place, not committed, not acted on. One real Reddit reply is logged `EXECUTED_LIVE` (do not duplicate it). Two cold-outreach emails are drafted and `READY_FOR_GMAIL_SEND` — **sending them requires the user's own explicit go-ahead**, which was not sought or given this session; this agent also has no email-sending tool available. Three directory submissions are `READY_FOR_BROWSER_SUBMISSION`, one of which (AlternativeTo) requires creating an account — account creation is outside what this agent will do. None of this was executed, duplicated, or claimed as done.
- **Factual-depth scoring unification**: google-war's `priority.ts` groups reference content-depth conceptually but were not rewired to consume `factual-depth-audit.ts`'s exact scorer — a real possible future unification, left alone this session since the two are not actively contradicting each other today.
- **`gsc-opportunity-miner.ts` vs. `lib/google-war/evidence.ts`'s GSC-parsing/indexation-state normalization**: both exist, at different abstraction levels (`priority-snapshot.json`'s flat impressions/position rows vs. `evidence.ts`'s typed `IndexState` enum with provenance). Not unified this session — a bigger, riskier refactor than the two done above, and not blocking anything.

## Gate results after full integration

- `tsc --noEmit`: clean.
- `npx vitest run`: **245 test files / 2,126 tests passing** (up from this branch's own pre-merge 240/2,082).
- `npm run validate:data`: 354 software pages, 27 categories, 1,348 comparisons, 0 problems.
- `npm run build` (`VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN=''`): clean.
- `npm run maintenance:seo`: 1,778 titles / 1,736 descriptions / 984 sitemap entries checked, 0 issues.
- `npm run affiliate:audit`: runs clean (pre-existing staleness warnings unrelated to this session's changes).
- `npx tsx scripts/growth/factual-depth-audit.ts`: A=232 B=8 C=86 D=28 (354 total).
- `npm run growth:google-war`: 1,782 nodes, 79,034 edges, 0 true software orphans, 0 quality regressions, 0 intent conflicts.
- `npm run growth:indexation-readiness`: PASS=162 WARN=91 FAIL=16 PROTECTED=85 (FAIL count dropped from 25 to 16 after the rendered-HTML-graph reconciliation — the 9 removed were exactly the false-orphan class the mission itself flagged).
- `npm run report:links`: runs clean (pre-existing, unchanged tool, kept alongside google-war's graph per its own doc-comment).

No test was weakened or skipped to make any merge succeed.
