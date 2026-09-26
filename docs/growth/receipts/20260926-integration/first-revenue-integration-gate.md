# First-Revenue Integration Gate — 2026-09-26

Integrated locally, without push/merge/deploy:
- claude/first-revenue-20260926
- codex/revenue-integrity-20260926
- claude/revenue-mining-20260926

## Manual reconciliation
The overlapping revenue-handoff work was reconciled by preserving both:
- Claude's synthetic/legacy QA quarantine and sticky/decision-card separation.
- Codex's event IDs, dedupe, independent sink outcomes, bounded acquisition context, cross-site validation, cancelled-activation exclusion, and visitor+session identity quarantine.

Explicit QA identities are matched by visitor+session together to avoid visitor bleed. Synthetic IDs and known legacy-contaminated sessions remain quarantined.

A duplicate visitorId/sessionId declaration introduced by combining the two branches was removed without changing the event contract.

## Validation
- Focused integration tests: 8 files / 79 tests passed.
- Full suite: 232 files / 2,011 tests passed.
- TypeScript passed.
- Lint passed.
- Data validation: 354 software pages, 27 categories, 1,348 comparisons, 0 problems.
- QA build passed; 3,532 generated static entries.
- Rendered revenue audit: 1,785 rendered routes, 984 sitemap URLs, five canonical money pages valid, 117 internal link checks all HTTP 200.
- Browser QA: 15/15 page×viewport cases passed (1440/390/320), 36 native activations, 0 browser errors, 0 affiliate navigations, 0 analytics writes.

## State
No push, merge, deployment, GSC submission, merchant visit, or synthetic production event was performed.
