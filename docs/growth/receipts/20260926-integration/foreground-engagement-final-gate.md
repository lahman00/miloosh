# Five-page integration delta — 2026-09-26

## State and scope

Local gate: PASS. Not deployed. No revenue/conversion is established by this receipt.

- Starting integration SHA: `ba57785336c14687ae8b83e4410459b8fc764409`. The four-agent reconciliation and CRO changes already existed; they were not repeated.
- Isolated branch: `codex/funnel-final-verification-20260926`.
- Worktree: `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/codex-funnel-final-verification-20260926`.
- Code commit: `57372028a5375ce73a882d8bb97027dacaeb7a12`.
- The canonical cohort remains Airtable, Todoist, Close, Setmore, ElevenLabs. No Wave 2 execution, new page, vendor fact, affiliate asset or application changed.
- Shared checkout remains `92d084bff726f034632fc24ea37ab0b3e6da39e3`. Its existing LinkedIn banner edit and untracked PNG were preserved byte-for-byte.

## Defect reproduced and fixed

`FirstPartyAnalytics` previously reported `engaged_view` after ten wall-clock seconds even if the page was hidden the entire time. Two new lifecycle regressions failed against that implementation, then passed after the fix.

`observeEngagedView` now accumulates ten foreground seconds using a monotonic clock, pauses while hidden, emits once, and cancels timers/listeners on page-effect cleanup. Unknown visibility produces no invented engagement. An uncertain hidden timer callback discards that open interval. Existing page-view/StrictMode behavior remains covered.

Visibility is not proof of attention or humanity. Historical engagement records cannot be reclassified retrospectively. The reporting/API schema is unchanged; its explanatory comment and measurement contract now describe the corrected metric.

## Verification observed

| Gate | Command / observed result |
|---|---|
| Regression proof | Old implementation: 2 new lifecycle tests failed, 2 existing passed. Fixed focused observer/lifecycle: 13/13 passed. |
| Full suite | `npm test`: **236 files / 2,050 tests passed**, exit 0. |
| Types | `npx tsc --noEmit --incremental false`: passed, including rerun after build. |
| Lint | `npm run lint`: passed, including expanded browser QA script. |
| Catalog | `npm run validate:data`: 354 products, 27 categories, 1,348 comparisons, 0 problems. |
| Dependency audit | `npm audit --audit-level=high`: 0 vulnerabilities. |
| Static gate fixtures | `npm run test:static-gate`: 11/11 passed. |
| Build | `MILOOSH_QA_BUILD=1 npm run build`: passed, 3,532 generated static entries. Build ID `eYAVm0G18l9e8vcJhSi1R`. |
| Built artifact | `python3 -B scripts/deployment/verify-static-release.py --dist .next-miloosh-qa`: 984 sitemap URLs, 1,782 public HTML pages, 83,434 internal anchors, **0 failures**. |
| SEO maintenance | `npm run maintenance:seo`: 1,778 titles, 1,736 descriptions, 984 sitemap entries, **0 issues**. |
| Rendered graph | `npx tsx scripts/growth/rendered-revenue-audit.ts http://127.0.0.1:3237`: 1,785 rendered routes, **117/117 checked internal targets HTTP 200**. |
| Browser | Expanded `scripts/growth/first-revenue-browser-qa.mjs`: **15/15 page × viewport cases**, widths 1440/390/320, **66 trusted native activations**, 0 browser errors, 0 overflow. Run twice with expanded CTA coverage; final run adds the foreground probe. |
| Browser metric probe | Built client with explicitly **simulated visibility API**: 11 seconds hidden → 0 engaged events; resumed foreground → 1 event, `durationSeconds: 10`, `isTest: true`. This is not a real-user attention test. |
| Comparison gate | `npm run growth:one-sided-audit`: all **165** one-sided pairs pass; **16** dual-active pairs enumerated separately. |
| Affiliate audit | 22 active partners, 99 existing findings: 84 stale research, 1 catalog/research gap, 9 orphaned research records, 5 overdue follow-ups. The isolated runtime pipeline contains zero entries; this is **not** a clean vendor-freshness audit or a production pipeline read. |
| Diff | `git diff --check`: passed. |

Browser coverage now includes each cohort product's existing `software-page-cta`, `pricing-section-cta`, decision card and sticky CTA, plus Todoist's two existing affiliate vendor-link placements. Each activation emits exactly one CTA click and one handoff request with matching event/visitor/session IDs and acquisition context. Outbound navigation is cancelled only after React's handler; event endpoints are intercepted, not persisted. The pricing selector is marked only in the QA DOM, not in public markup.

All five are self-canonical, indexable, in the sitemap, reachable at depth one from the home HTML, and render decision content initially. Distinct rendered inbound pages: Airtable 18, Todoist 27, Close 19, Setmore 20, ElevenLabs 23. The separate catalog cross-link report still lists nine weak non-cohort pages; none were expanded in this task.

## Evidence and handoff

Private evidence: `/Users/eyalhaimovich/MilooshReceipts/20260926-funnel-final-verification/` — `tests.log`, `build.log`, `lint.log`, `typecheck.log`, `dependencies.log`, `static-gate.json`, `rendered-audit.json`, `seo.log`, `links.log`, `affiliate.log`, `one-sided.log`, `browser-final.log`, `browser-final/browser-qa.json`, screenshots. Desktop and narrow-phone screenshots were visually inspected.

No push, merge into another branch, deploy, indexing request, social post, email, merchant visit, credential change or production analytics/Blob write occurred. Public production behavior is unchanged. The running local QA server/browser sessions are stopped after verification.

Next authorized integration action: carry this isolated commit delta into the supervising release candidate, preserving the existing four-agent reconciliation. Production promotion remains outside this sprint's authorization. A recorded handoff still does not establish a merchant visit, conversion, commission or payout.
