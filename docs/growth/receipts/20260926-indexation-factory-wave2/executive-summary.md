# Google Indexation Factory — Wave 2 — Executive Summary — 2026-09-26

Branch `claude/indexation-factory-wave2-20260926`, isolated worktree, built on
top of `claude/indexation-recovery-20260926` (Wave 1) at commit `6464464` —
exact base SHA recorded before any edit. Local commits only. **Nothing
pushed, merged, or deployed.**

## What this wave found and did

**FROZE**: Wave 1's 14 treatment + 10 control pages were not touched again.
Reconnaissance covered every active worktree/branch, including the newly
discovered `codex/google-visibility-war-20260926` (large, unmerged
`lib/google-war/` system) and `codex/revenue-integrity-20260926` (a separate
agent's convergent fixes to Mission 1's own first-revenue cohort, on a
different base). Neither was merged — both are documented as reconciliation
items.

**OBSERVED**: A fresh `factual-depth-audit.ts` run found 202 A / 8 B / 113 C /
31 D across 354 pages (the mission's own quoted "121 C, 35 D" was stale).
Crossing the real C/D universe against cached GSC demand
(`remediation-queue.ts`, expanded to 80 candidates) and excluding all 14
Wave-1 treatment, all 10 Wave-1 control, and all 9 experiment-protected slugs
surfaced 72 real candidates. The top 30 by demand×deficiency were
individually or bulk-confirmed via live Google Search Console as **"Crawled -
currently not indexed"** — a 100% hit rate, no assumptions.

**CHANGED**: All 30 got real, live-vendor-sourced pricing (dispatched as 6
parallel research agents, one per 5-product batch, each independently
verifying against official vendor pages) — every one had zero pricing and
zero cons recorded, the exact same gap Wave 1 found. Factual-depth score rose
from 39-50 [C/D] to 85-96 [A] for all 30, verified by the project's own
scoring script, not estimated. Each also got a genuine, differentiated
`AlternativeDecisionGuide` entry (74 total in the registry now); the existing
anti-templating test caught two pairs written too similarly on first draft
(plausible/fathom-analytics, evernote/microsoft-onenote), both rewritten with
distinct real-fact framing rather than loosening the test.

**SECOND FRONT**: 12 comparison pages, each confirmed crawled-not-indexed and
involving at least one treatment product, got aligned SERP titles/descriptions
— their pricing/pros-cons content was already deepened as a side effect of
the software-page work, since comparison pages render directly from both
sides' `data/software/*.json`.

**SITEWIDE BUG HUNT** (explicitly modeled on Wave 1's 176/354 cons discovery):
checked every optional `Software` field against what the page template
actually renders. Found one more real instance of the same pattern — **152
of 354 products have sourced `pros[]` data that rendered nowhere on their own
page** — and fixed it with one shared template change, the same shape as
Wave 1's fix, benefiting all 152 products at once.

**PERMANENT TOOLING**: built `scripts/growth/indexation-readiness.ts`
(`npm run growth:indexation-readiness`), a permanent PASS/WARN/FAIL/PROTECTED
readiness check per page — explicitly a Miloosh-readiness measure, not a
Google-indexing prediction — built independently of and named differently
from the unmerged `codex` branch's overlapping system. It surfaces 25 real
FAIL-verdict candidates as a ready next-tier pool. Also added a
demand-gated quality-floor test (fails only for a genuinely high-demand
page at the worst factual-depth tier with no protection reason — currently
zero violations) and `data/growth/frozen-cohorts.ts`, a registry so future
waves extend one file instead of re-deriving frozen slugs from commit history.

**VERIFIED**: One live indexing-request attempt (the #1-ranked candidate,
directus) confirmed Google's daily quota is still exhausted from earlier
missions the same calendar day — the literal Hebrew quota-exceeded dialog
appeared again. No retry. A full 30-URL ranked queue is prepared for the
next available window.

## Numbers
- 6 commits, 240 test files / 2,082 tests passing (up from 237/2,074).
- 30 treatment software pages, 12 control software pages, 12 comparison
  pages, all with recorded baseline evidence in `baseline.json`.
- 1 indexing-request attempt today, blocked by quota; 0 requests sent.
- `data validate`, `tsc`, `build`: clean throughout, including the final state.

## What was deliberately not done
- No mass rewrite beyond the real, evidence-backed 30+12+12 cohort.
- No indexing request beyond the one quota-check attempt, and no retry.
- No content or link change to any of Wave 1's 24 frozen pages, this
  wave's own 12 control pages, or any of the 9 protected experiment pages.
- No merge of either unmerged parallel branch.
- No new comparison pages, no invented alternative relationships, no
  fabricated pricing, reviews, ratings, or offers anywhere (spot-checked
  directly in rendered JSON-LD).

## Confirmed per the mission's own success metrics
- Treatment cohort selected from real evidence: yes (`baseline.json`).
- Materially differentiated guide content: yes, independently verified by
  the existing anti-templating test, not self-assessed.
- Stronger factual depth: yes, verified by the project's own scoring
  script (39-50 → 85-96 for all 30).
- Systemic fix found and applied at scale: yes, the pros-rendering gap
  (152 products), the same shape and comparable scale to Wave 1's own
  discovery.
- Permanent tooling shipped: yes, `growth:indexation-readiness` plus a
  quality-floor gate, both with real tests.
- No experiment contamination: verified directly against every
  `work-revenue-experiment-receipt-*.json` file and Wave 1's frozen cohort
  before any edit; new `frozen-cohorts.ts` registry makes this checkable
  going forward without re-deriving it.
- Clean build/tests/lint/typecheck: yes, every commit.
- Ready next-wave queue: yes, both for content (`next-wave.md`) and for
  indexing requests (`indexing-request-queue.json`).
- **No claim of ranking or indexation success today** — outcomes require
  time and are explicitly left for a future session to check.
