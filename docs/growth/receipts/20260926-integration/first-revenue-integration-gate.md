# First-Revenue Integration Gate — 2026-09-26

Integrated locally, without push/merge/deploy:
- claude/first-revenue-20260926
- codex/revenue-integrity-20260926
- claude/revenue-mining-20260926
- codex/release-gate-20260926 (reviewed and converted from uncommitted work into three scoped commits)

## Manual reconciliation
The overlapping revenue-handoff work was reconciled by preserving both:
- Claude's synthetic/legacy QA quarantine and sticky/decision-card separation.
- Codex's event IDs, dedupe, independent sink outcomes, bounded acquisition context, cross-site validation, cancelled-activation exclusion, and visitor+session identity quarantine.

Explicit QA identities are matched by visitor+session together to avoid visitor bleed. Synthetic IDs and known legacy-contaminated sessions remain quarantined.

A duplicate visitorId/sessionId declaration introduced by combining the two branches was removed without changing the event contract.

## Final validation
- Focused revenue integration: 8 files / 79 tests passed.
- Focused release-gate tests: 6 files / 49 tests passed.
- Python static-gate adversarial fixtures: 11/11 passed.
- Full suite after all four workstreams: 235 files / 2,039 tests passed.
- TypeScript: passed with incremental disabled.
- Lint: passed.
- Dependency audit: 0 vulnerabilities.
- Data validation: 354 software pages, 27 categories, 1,348 comparisons, 0 problems.
- QA production build: passed; 3,532 generated static entries.
- Static artifact gate: 984 sitemap URLs, 1,782 public HTML pages, 83,434 internal anchors checked, 0 failures.
- Rendered revenue audit: 1,785 rendered routes; all 117 checked internal targets returned HTTP 200.
- Canonical five are depth 1 from home, have one self-canonical, no noindex, valid schema and no broken fragments.
- Browser QA: 15/15 page×viewport cases passed (1440/390/320), 36 native activations, 0 browser errors, 0 affiliate navigations, 0 analytics writes.
- Runtime: /recommend HTTP 200; /internal HTTP 401 with X-Robots-Tag noindex,nofollow; www host variant 301s to apex while preserving query parameters.

## Release-gate additions
- Production canonical origin is pinned to https://miloosh.com.
- Public non-canonical host redirects construct path/query on a fixed apex destination.
- /internal root and descendants fail closed and are noindex,nofollow.
- Relevant first-revenue support-guide sitemap lastmod reflects the documented handoff-panel update only.
- /guides has one SSR H1 while ordinary SectionHeading remains H2 by default.
- Guide FAQ/breadcrumb structured data uses shared builders.
- Inter is vendored locally with license so builds do not depend on Google Fonts network availability.
- QA build output is excluded from lint.
- Static release verification and adversarial fixtures are available as release gates.

## State
No push, merge into the shared branch, deployment, GSC submission, merchant visit, or synthetic production event was performed.
