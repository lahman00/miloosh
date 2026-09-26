# Release manifest

## Immutable identity

| Role | SHA / identifier |
| --- | --- |
| Live source / rollback source | f5ed1b23035cbda81c222fb8b8bd24d3962a7b71 |
| Claude research base | 4d34fd163ee3149e665ab0172f94b848ff6280bc |
| Codex inspected integration tip | 61437f3ce5c874177e7cbaf481e843eb56730eb6 |
| Integration merge | e4117a547d5801e159f0b890c533404b9be4bd3b |
| Tested application code | 2c179759ec37728661f271be70f713fc44147b29 |
| Preflight clean merge tree | d826512ad3db40b357839e5062fdc00013aca92f |
| Next build | WPOOUATi6uiUzB6g-vY6b |
| Static artifact SHA-256 | 427f6ef845f3b8b2ca2f18092887174f1d3c7dceead327c2a9086ac6fdcb0390 |
| Rollback deployment | dpl_3F95X1y4KARafdQ88oewqf8kYo23 |

This receipt is committed after the tested code. Its documentation-only commit is a descendant of 2c17975; find it with `git log -1 -- docs/growth/receipts/20260927-master-release`. No application changes are hidden behind that receipt commit.

## Integration and deduplication

The exact incoming commits not already in the Claude base are:

- 7b2e9361008475c802a15b60592831080d9dd3e0 — Google revenue command center.
- 61e051d6a9be33ba52604962fe6d28bebb97f831 — command-center QA receipt.
- 934775b9cded161d764855bbba7ecd35a8f1c5a2 — reviewed Claude Phase V merge.
- 651d04a6291b6906bd4ff3505dbd1a0452c22c51 — authority impact control room.
- 61437f3ce5c874177e7cbaf481e843eb56730eb6 — authority evidence/QA receipt.

The explicit merge added no conflicts. The integration-matrix.json inventories all 35 preexisting local branches and 20 worktree records (17 present, three stale/prunable records), including unique commits, patch equivalence, tests, changed paths, overlaps and disposition. The new release branch/worktree is additional. Historical equivalent work was not blindly merged again.

There are 78 changed files from the Claude base to tested code and 415 changed files from the live production source to tested code. The machine-readable integration matrix enumerates the former; the full live delta is reproducible with:

```sh
git diff --name-status f5ed1b23035cbda81c222fb8b8bd24d3962a7b71 2c179759ec37728661f271be70f713fc44147b29
```

## Research/public route delta

| Route | Role / behavior |
| --- | --- |
| /research | New public hub, exact canonical, two assets, footer discovery, sitemap |
| /research/customer-support-pricing-2026 | New public benchmark, 16-product dataset, dated source records, Dataset JSON-LD |
| /api/research/customer-support-pricing-2026 | Read-only JSON, 16 rows |
| /api/research/customer-support-pricing-2026/csv | Read-only CSV, header + 16 rows |
| /research/saas-pricing-pressure-index-2026 | Existing research preserved; lifecycle/decision tracking verified |
| /software/liveagent and /software/reamaze | Claude's committed factual pricing records preserved, not rewritten here |
| /compare/joomla-vs-umbraco and /compare/drupal-vs-umbraco | Correct canonical comparison keys protected by tests |
| /sitemap.xml | Adds only the real research hub and benchmark |
| Existing public pages | Shared footer discovery and tracked-link analytics contracts |

The built route graph, metadata and full source delta also include previously committed Google/master work inherited through Claude's lineage; this is not a claim that only the above URLs differ from September 25 production. Full source paths: integration-matrix.json and the reproducible live delta above. Full built page inventory: var/growth/google-command/crawl/latest.json.

No affiliate registry, social adapter or cron changes were introduced relative to the Claude base. Existing shared analytics event types/stores remain canonical.

## Own implementation

2c17975 changes 17 files: app/sitemap.ts; components/Footer.tsx; data/growth/authority/registry.json; data/growth/cohort-protocol-deviations.json; lib/analytics/research.ts; lib/authority/registry.ts; lib/google-war/measurement.ts; scripts/growth/authority-browser-proof.ts; scripts/growth/google-command-browser-qa.ts; scripts/growth/google-command-center.ts; and seven focused tests (research lifecycle/authority, authority registry, cohort deviation, master research, crawl contract, comparison-key regression).

## Frozen experiments and concurrent work

Frozen cohort source blobs are unchanged from the Claude base:

- data/growth/frozen-cohorts.ts: 411530e6cbef480ca67e9885a7ac4faebb0febec
- data/experiments/comparison-quality-cohort.ts: 05f223cc34ca0f9a0558834a571001435fe70355

Six cohorts contain 110 treatment slots and 68 control slots (not unique-URL totals). Re:amaze's factual edit inherited from 4d34fd1 is explicitly recorded as a control-protocol deviation. The corresponding treatment/control contrast is null pending review; raw descriptive evidence is not erased.

Claude's worktree remained at 4d34fd1 while additional research page/data/software edits and CRM JSON/CSV scaffolding were dirty. Those in-progress files are not integrated. Dirty shared-site social/banner/outreach work and the separate search-opportunity software-page changes were neither edited nor staged.

## Advisories / release boundaries

- Technical gates pass; production promotion is pending authorization.
- Public Reddit evidence does not support the two requested blanket CRM VERIFIED_LIVE labels.
- Five existing factual-depth readiness failures and nine weak internal-link product nodes remain content-owner follow-ups, not newly introduced broken routes.
- No source-data claim is refreshed merely because a build date changed; the research receipt exposes per-row source dates and unknowns.
- A new application/content commit requires a fresh release gate/build identity before promotion.
