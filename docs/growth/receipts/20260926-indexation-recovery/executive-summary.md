# Indexation Recovery Attack — Executive Summary — 2026-09-26

Branch `claude/indexation-recovery-20260926`, isolated worktree, built on
top of `claude/gsc-demand-20260926` (this same day's prior mission, whose
receipt this mission required reading first — done in full). Local
commits only. **Nothing pushed, merged, or deployed.**

## What this mission found and did

**OBSERVED**: 14 real, evidence-backed candidates (10 from
`scripts/growth/remediation-queue.ts`'s real demand × factual-depth
intersection, plus a 4-product AI-tool cluster) were individually
confirmed via live Google Search Console URL Inspection to be **"Crawled
- currently not indexed."** Of those 14, **12 had zero pricing data
recorded at all** — a bigger, previously-undiagnosed gap than the
also-real "every one has an empty cons[] array" finding.

**CHANGED**: All 14 got real, live-vendor-sourced pricing (or an honest
`contact_sales` status where no public price exists) and 3 real, sourced
cons each, taking their factual-depth score from 39–75 [C/B/D] to 80–95
[A] for every one — verified by `scripts/growth/factual-depth-audit.ts`,
not estimated. Each also got a genuine, differentiated
`AlternativeDecisionGuide` entry; the existing anti-templating test caught
two pairs (vercel/netlify, jasper/copy-ai) written too similarly on first
draft, both rewritten with real distinct framing rather than loosening the
test (see `similarity-before-after.json`). A real, sitewide finding —
**176 of 354 catalog products have sourced cons[] data that never
rendered anywhere on their own page** — led to one template-level fix
benefiting all of them, not just this session's 14.

**VERIFIED**: 4 of 5 attempted new indexing requests confirmed received
before Google's own daily quota stopped the 5th — a real, observed limit,
not a self-imposed one. A 10-page control cohort, 4 of which were also
live-verified as crawled-not-indexed, was deliberately left untouched as a
comparison baseline for a future session.

## Numbers
- 4 commits, 237 test files / 2,074 tests passing (up from 236/2,071).
- 14 treatment pages, 10 control pages, all with recorded baseline
  evidence in `baseline.json`.
- 6 total indexing requests today (2 from the earlier Pipedrive/Wrike
  mission + 4 from this one), then Google's quota stopped further
  requests.
- `data validate`, `tsc`, `build`: clean throughout.

## What was deliberately not done
- No mass rewrite of the 1,645 non-indexed pages — 14 real candidates,
  evidence-backed one at a time.
- No indexing request beyond what the quota allowed, and no retry.
- No content or link change to any of the 9 pages under an active
  MEASURING experiment.
- No new comparison pages, no invented alternative relationships, no
  fabricated pricing, reviews, or testing experience anywhere.

## Confirmed per the mission's own success metrics (Section 23)
- Treatment cohort selected from real evidence: yes (`baseline.json`).
- Materially differentiated content: yes, and independently verified by
  an existing anti-templating test, not self-assessed.
- Stronger factual depth: yes, verified by the project's own scoring
  script (39–75 → 80–95 for all 14).
- Better crawl paths where actually weak: the one architecture fix
  (cons rendering) benefits ~160 pages, not just the 14 treated directly;
  no blind internal-linking additions were made.
- No experiment contamination: verified directly against every
  `work-revenue-experiment-receipt-*.json` file before any edit.
- Clean build/tests: yes, every commit.
- Selected URLs eligible for recrawl: yes, 4 confirmed requested.
- Exact baseline recorded: yes, `baseline.json`.
- **No claim of ranking or indexation success today** — outcomes require
  time and are explicitly left for `next-wave.md` to check later.
