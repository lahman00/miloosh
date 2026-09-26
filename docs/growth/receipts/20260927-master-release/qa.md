# QA receipt

## Scope and identity

All final results below apply to code commit 2c179759ec37728661f271be70f713fc44147b29 and build WPOOUATi6uiUzB6g-vY6b. Application code did not change after these checks; subsequent changes are receipt documentation only.

Final `npm run growth:release-google`: **13/13 gates passed**, 2026-09-26T21:32:53Z through 21:36:36Z.

| Gate | Result |
| --- | --- |
| Typecheck | PASS |
| Lint | PASS |
| Full tests | PASS — 256 files, 2,312 tests |
| Python static-gate tests | PASS — 11 tests |
| validate:data | PASS — 354 software, 27 categories, 1,348 comparisons |
| affiliate:audit | PASS |
| Production build, MILOOSH_QA_BUILD=1 | PASS |
| Static release audit | PASS |
| Query-store import | PASS |
| growth:google-war | PASS |
| Strict command center / authority integration | PASS |
| Browser smoke / research journeys | PASS |
| git diff --check | PASS |

Earlier development test runs exposed test-fixture typing/scope and sitemap inventory expectation errors; these were corrected before this complete passing run. No failed build was deployed.

## Complete rendered crawl

Command: `npm run growth:full-rendered-crawl -- http://127.0.0.1:65490`

Completed at 2026-09-26T21:45:30.016Z:

- Expected 1,784 public HTML routes; inspected 1,784; complete=true.
- Every route HTTP 200, exactly one canonical, exactly one H1, and matching metadata.
- No page overflow; no unexpected noindex; zero failures; no retry required.
- 3,557 external/write requests blocked; zero writes and zero merchant navigations.
- Static gate also checks broken internal paths, metadata collisions, canonical parity, redirects and sitemap consistency.
- 986 sitemap URLs; 86,562 raw internal anchors checked. The graph's 81,351 edges use a different deduplication/scope over 1,784 nodes; these totals are not interchangeable.
- /recommend is dynamic and not in the emitted HTML count. It was separately fetched/rendered at 320px: HTTP 200, exact canonical, one H1 (“Find your software”), no document overflow; no form submitted.

## Tracking / browser proof

Two research assets × widths 1440, 390, 320 = six complete local journeys. Old asset links into /software/algolia; new support asset into /software/freshdesk. Evidence includes:

1. Existing research page_view.
2. Domain-only external-source event.
3. Internal research decision click.
4. Software page_view.
5. CTA impression before CTA click.
6. Exactly one intercepted /api/outbound-click handoff with the same eventId/sessionId, correct software and bounded CTA location.

All traffic is marked QA/test. Outbound ingress is intentionally mocked in browser proof: it proves client handoff identity, not production persistence, merchant arrival or conversion. Full tests independently cover server persistence, deduplication, first-touch and QA quarantine. No production analytics events, merchant requests or conversion claims were generated.

4,137 rendered marked link surfaces were audited with zero findings. This inventory includes editorial TrackedVendorLink markers, not only commercial affiliate CTAs. The command center reports 22 active partners without changing affiliate relationship state.

## Research render and data

- Hub and both assets: HTTP 200 locally, exact canonical, one H1, indexable, linked in sitemap and discovery graph.
- New benchmark JSON: HTTP 200 application/json; 16 rows/sampleSize 16.
- CSV: HTTP 200 text/csv; header plus 16 rows; attachment filename customer-support-pricing-benchmark-2026.csv.
- Dataset JSON-LD: canonical dataset URL, creator Miloosh, CC BY 4.0, two DataDownload routes.
- Fifteen source anchors; HappyFox base record's source/date remain unknown. No private fields or affiliate credentials leak into exports.
- Source facts preserved from Claude's dated evidence. This integration did not freshly reverify all 16 vendors.
- Desktop and mobile table screenshots were visually inspected at 1440, 390 and 320.
- Desktop table/container width 1,086px; mobile containers 356px and 286px. Wide tables stay inside overflow-x:auto containers (table widths about 491/473/745px); document width remains bounded.
- Research hub has 1,783 inbound rendered pages via footer; old asset 1,783; new asset one hub link.

Local screenshots: var/growth/google-command/browser/support-table-1440.png, support-table-390.png, support-table-320.png, recommend-320.png, plus the browser runner's screenshots. Research table/desktop header images were visually inspected; /recommend was verified through browser DOM/geometry.

## Additional commands / advisories

- npm audit --audit-level=high: zero vulnerabilities.
- npm run maintenance:seo: zero issues; 1,778 title records, 1,736 meta descriptions, 986 sitemap URLs. This script's inventory is narrower than the full HTML audit.
- npm run report:links: 354 products, average 10.3 inbound crosslinks. Nine structurally weak (not true orphan) nodes: birdeye, chili-piper, consensus, dbt-cloud, dropbox, floqast, hibob, knowbe4, veeam-data-platform.
- npm run growth:indexation-readiness: 164 PASS, 55 WARN, 5 FAIL, 130 PROTECTED. Existing FACTUAL_DEPTH_D failures: apigee, datadog, read-the-docs, stripe, supabase.
- growth:authority-report and growth:morning-google: PASS.
- growth:ranking-delta is not defined in package.json. Existing command-center 7/14/28 checkpoints were inspected instead; WAIT_DEPLOYMENT is preserved. No nonexistent command is claimed to have passed.
- Cohort registry/membership hashes unchanged; the inherited Re:amaze CONTROL change has an explicit suppression test.
- Browser sessions and this task's port-65490 QA server were stopped after verification.

## Durable evidence hashes

Raw QA files remain in this worktree's ignored var directory; hashes below bind this committed receipt to those exact local outputs.

| File | SHA-256 |
| --- | --- |
| var/growth/google-command/crawl/latest.json | 96f1a802bd1ffa0bbe3b1533a8759feabf568330c99c251029680bf44686adb9 |
| var/growth/google-command/release/gates.json | 6ca7706dd6745099f097f7d2f460d6636a5a762595f0ca1df2094a6bf54fac9a |
| var/growth/google-command/browser/latest.json | bfb401f28cf1b82fe3d405cba4f073f852e5b6eea12ca1020032ed6287f58759 |
| var/growth/google-command/browser/authority-events.json | fee75136d7d20ab064255e8d0c2cc721a9a942be4141f5525dfb12da4ef343aa |

Static artifact SHA-256: 427f6ef845f3b8b2ca2f18092887174f1d3c7dceead327c2a9086ac6fdcb0390.

## Reproduction

From the release worktree, run `npm run growth:release-google`. For the full rendered crawl start the QA build with `MILOOSH_QA_BUILD=1 NEXT_TELEMETRY_DISABLED=1 npm run start -- --hostname 127.0.0.1 --port 65490`, then run the crawl command above. Stop only that server afterward. Generated reports must not be described as production results.
