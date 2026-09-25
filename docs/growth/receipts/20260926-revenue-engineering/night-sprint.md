# Revenue engineering receipt — 2026-09-26

## State and scope

Started from `92d084bff726f034632fc24ea37ab0b3e6da39e3`, branch
`growth/buyer-acquisition-20260917`; read-only remote branch check matched that
SHA. Work is isolated on `codex/revenue-integrity-20260926` at
`/Users/eyalhaimovich/Desktop/Miloosh/01-Current/codex-revenue-integrity-20260926`.
No push, merge, rebase, deploy, indexing request, merchant-link visit, production
analytics/Blob write, email, social publish or affiliate application occurred.

Main checkout remains on the starting SHA with the original banner change and
untracked `Miloosh SEO Sprint.png`. End-of-work SHA256 checks matched the initial
banner `4da847a811a6b27a2bd75b1d96fa4d39e442d50a69ccee9020f1e3961e1fe08b`
and image `990497d74f4386cdbe7ed1471dad5e1e23930a168c43ce792d2c91b288476fc8`.

Claude's independent branch through `fac0fdba237aa0f8573885ec7aad312d7fc44c07`
was inspected, not merged. It owns CRO copy/billing, narrow-phone sticky layout,
incoming comparison links and decision-vs-sticky counters. Integrate both lanes
and rerun gates. Especially reconcile the small shared
`lib/revenue/first-revenue-funnel.ts` hunk; do not drop either implementation.

## Coherent local commits

| Commit | Purpose |
|---|---|
| `6f9acee` | Foreground/50%-visible CTA exposure; StrictMode page-view replay protection. |
| `0165ad7` | Identified exact-event replay dedupe; independent handoff-store results. |
| `0e01d38` | Bounded session first touch in both handoff stores; expiry/tab isolation. |
| `2826ba3` | Streaming body cap, cross-origin rejection, known product/location gates, local/preview QA. |
| `0d3ffbd` | Blob listing overlap/cursor defense; preserve corrupt local evidence. |
| `22321fe` | Cancelled activations are not handoffs; native/modifier/middle clicks remain intact. |
| `559d9eb` | Quarantine identified QA handoffs by visitor+session, not unrelated visitor IDs. |
| `fc934c1` | SEO gate honors existing sitemap suppression policy; genuine missing priority routes still fail. |
| `a8d6001` | Rendered HTML/graph/link audit, pending-program tests, local QA-build lint exclusion. |
| `bf7157e` | Canonical event contract; historical activation guidance visibly superseded. |
| `3b91aeb` | Missing/partial/retention-capped evidence excluded from legacy Money Map; unknown QA markers separate. |

## Five-page technical result

All five: local production build HTTP 200; exact apex self-canonical; one H1;
nonempty title/meta; no noindex; one server-rendered buyer panel; affiliate
disclosure and sponsored/noopener/noreferrer on exact merchant links; sitemap
membership; homepage discovery depth 1; no broken tested fragments. Initial
HTML already contains decision content and merchant anchors before hydration.

| Existing intent owner | Measured query cluster | Unique inbound HTML sources | Source mix: software / comparison / category / other | Own affiliate anchors |
|---|---|---:|---|---:|
| `/software/airtable` | Airtable alternatives, singular/plural, competitors | 18 | 2 / 12 / 1 / 3 | 4 |
| `/software/todoist` | Todoist alternative(s), best alternative(s) | 27 | 6 / 17 / 1 / 3 | 6 |
| `/software/close` | close alternatives | 19 | 4 / 9 / 1 / 5 | 4 |
| `/software/setmore` | Setmore alternative(s) | 20 | 5 / 10 / 1 / 4 | 4 |
| `/software/elevenlabs` | elevenlabs alternatives | 23 | 6 / 13 / 1 / 3 | 4 |

No cohort or metadata/copy changes. Initial-HTML title scan found these five,
and no other rendered titles, explicitly targeting their alternatives intents.
Named head-to-head queries remain distinct comparison intent:
`/compare/coda-vs-airtable` and `/compare/acuity-scheduling-vs-setmore` already
exist. Airtable-vs-Trello / Zoho Creator signals do not authorize new pages here.
This is route/metadata ownership evidence, not proof Google never overlaps pages.

## File manifest (implementation commits)

| File(s) | Reason |
|---|---|
| `app/api/analytics/event/route.ts` | Bounded/validated ingestion, event IDs, sanitized acquisition and QA. |
| `app/api/outbound-click/route.ts` | Same boundaries; independent persistence and attribution in both sinks. |
| `app/internal/money-map/page.tsx` | Show unavailable/unknown evidence explicitly. |
| `components/FirstPartyAnalytics.tsx` | Suppress effect replay; shared session acquisition sender. |
| `components/TrackedCtaLink.tsx` | Correct exposure, activation ID/context, cancelled-click defense. |
| `components/TrackedVendorLink.tsx` | Initialize context/identity; cancellation and event identity. |
| `lib/analytics/acquisition.ts`, `attribution.ts`, `browser-session.ts` | Bounded source schema, normalized sources and session lifetime. |
| `lib/analytics/cta-exposure.ts`, `cta-locations.ts` | Visibility guard and shared finite placement vocabulary. |
| `lib/analytics/event-id.ts`, `event-persistence.ts` | Opaque IDs, semantic fingerprint and immutable write confirmation. |
| `lib/analytics/events.ts`, `ingest.ts`, `track.ts` | Storage integrity, safe request boundary and client delivery. |
| `lib/revenue/click-tracker.ts`, `events.ts` | Carry identity/acquisition and report actual persistence result. |
| `lib/revenue/first-revenue-funnel.ts` | Embedded first touch and same-identity QA quarantine. |
| `lib/revenue/money-map.ts`, `outbound-read.ts` | Legacy/retention evidence completeness and unknown markers. |
| `lib/seo/rendered-html.ts` | Narrow parser for emitted HTML release evidence, not a sanitizer. |
| `scripts/growth/first-revenue-browser-qa.mjs` | Capture native activations after React, verify shared context/ID. |
| `scripts/growth/rendered-revenue-audit.ts` | Read-only initial HTML, graph, sitemap and local-link verification. |
| `scripts/maintenance/seo.ts` | Existing submission policy, correct checked counts, failure exit status. |
| `eslint.config.mjs` | Ignore generated isolated QA output, not source. |
| `docs/revenue.md`, `docs/revenue-measurement-contract.md` | Retire obsolete instructions; define current evidence semantics. |

Tests added/updated (behavior described in commit table and release logs):

- `tests/analytics/browser-acquisition.test.ts`
- `tests/analytics/complete-event-reader.test.ts`
- `tests/analytics/cta-exposure.test.ts`
- `tests/analytics/event-persistence.test.ts`
- `tests/analytics/first-handoff-forensics.test.ts`
- `tests/analytics/first-revenue-funnel.test.ts`
- `tests/analytics/ingest-boundary.test.ts`
- `tests/analytics/local-store-integrity.test.ts`
- `tests/analytics/money-map-read-failure.test.ts`
- `tests/analytics/outbound-click-route.test.ts`
- `tests/analytics/outbound-client-activation.test.ts`
- `tests/analytics/outbound-ledger-read.test.ts`
- `tests/analytics/outbound-write-failure.test.ts`
- `tests/analytics/page-view-lifecycle.test.ts`
- `tests/lib/analytics-client-primitives.test.ts`
- `tests/lib/click-tracker.test.ts`
- `tests/lib/money-map.test.ts`
- `tests/lib/pending-revenue-programs.test.ts`
- `tests/seo/rendered-revenue-audit.test.ts`
- `tests/seo/sitemap-audit-policy.test.ts`

Affiliate destinations unchanged:

- Airtable: `https://airtable.partnerlinks.io/b0dz88v48tek`
- Todoist: `https://get.todoist.io/dobo71f2y038`
- Close: `https://refer.close.com/0alqdg4so8rm`
- Setmore: `https://www.setmore.com?ref=nge2zwi`
- ElevenLabs: `https://try.elevenlabs.io/gkp73pehjgtl`

No verified pricing-specific asset exists for these five; pricing-intent CTAs
continue to use the exact general asset, not an invented pricing deep link.
Official editorial pricing sources are not affiliate leaks. No merchant URL was
opened for QA. Automattic and ActiveCampaign remain non-active, tested even with
an injected unverified catalog affiliateUrl. The older ActiveCampaign rejection
history does not establish approval of the owner's pending re-application.

## Event model and forensic proof

See [canonical contract](../../../revenue-measurement-contract.md) for fields,
identity, idempotency and reporting limits.

`page_view` / `software_view` → `cta_impression` → `cta_click` → server
`outbound_click` + independent legacy affiliate/vendor event. Never add the
two stores. Handoff proves recorded intent, not merchant load, conversion,
commission or payout. No measured conversion was created or claimed.

All five handoff route tests prove exact product, source path, CTA location,
anonymous identity and sanitized first-touch context survive even without a
stored landing event. Source is unknown if evidence is absent. New events carry
previousPath, landingPath, capturedAt, referrer hostname and safe UTM labels.
30-minute measured-idle expiry and fresh-document navigation reset sessions;
SPA navigation preserves them. Session policy changed intentionally and is not
retroactively imposed on historical records.

Browser proof: newsletter/email UTM landing on
`/best-no-code-database-for-operations` → native internal navigation to Airtable
→ native sticky CTA activation. Click and outbound request shared eventId,
session, original guide, previous guide, source/medium/campaign/content. No
merchant navigation and no production write. Client-side capture is not a claim
that this synthetic request was persisted. Separate mock/local route tests prove
both write paths, including independent backend failure.

## Browser / crawl / performance evidence

Private artifacts: `/Users/eyalhaimovich/MilooshReceipts/20260926-revenue-engineering/`.

- `browser/browser-qa.json`: 15 cases (5 × 1440/390/320), 36 trusted native
  activations, 0 browser errors, no horizontal overflow, sticky within viewport,
  native fragment navigation, matching IDs/context, all explicit QA; 0 analytics
  writes and 0 affiliate navigations. 30 screenshots.
- `guide-journey.json`: additional captured guide→money→handoff proof; one more
  native merchant CTA activation, cancelled at document bubble solely by QA.
- `rendered-audit.json`: 1,785 initial-HTML routes inspected for graph purposes;
  984 sitemap URLs, no duplicates/preview/API/internal URLs; 117 distinct internal
  links from the five money pages returned 200 without redirects.
- Schema: Organization, BreadcrumbList, ItemList and FAQPage parse on all five;
  no duplicate JSON-LD, invented aggregateRating/reviewCount/offers.
- Read-only production HEAD checks: www → apex 301 preserving UTM; trailing
  slash → canonical 308. Local internal dashboard without credentials: 401.
  Local Host-header emulation did not reproduce Vercel's host matcher; production
  behavior was checked directly instead. No production POSTs.
- HTML sizes 138–160 KB. Decision anchors and text are server-rendered; analytics
  delivery does not gate interaction. No Core Web Vitals/Lighthouse performance
  improvement is claimed from a local run. No speculative bundling rewrite.
- At 320px, existing sticky price text wraps tightly; screenshot evidence is
  retained for Claude's already-implemented narrow-phone fix. No duplicate UX fix.

## Release gates

Final gate results are recorded after the final code commit; no deployment is
part of this receipt. The initial full suite found one source-string expectation
for the old middle-click guard; it was updated, while native behavioral tests
prove cancelled, ordinary, modifier, middle and right-click semantics.

Final code SHA: `3b91aeb` (the later receipt-only commits do not change runtime).

| Command / check | Observed result |
|---|---|
| `npm test` (final uncongested rerun) | **226 files, 1,960 tests passed**, 81.01s; `release-tests-rerun.log`. |
| `npm run lint` | Exit 0, no warnings/errors; `release-lint.log`. |
| `npx tsc --noEmit --incremental false` | Exit 0; `release-typecheck.log`. |
| `VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN='' npm run build` | Exit 0, 3,532 generated static entries; `release-build.log`. |
| `npx tsx scripts/growth/rendered-revenue-audit.ts http://localhost:3227` | Exit 0 on final build; `rendered-audit-final.json`. |
| `node scripts/growth/first-revenue-browser-qa.mjs http://localhost:3227 /Users/eyalhaimovich/MilooshReceipts/20260926-revenue-engineering/browser-final` | Exit 0; final 15-case/36-activation matrix repeated successfully. |
| `git diff --check` | Pass after each implementation commit and receipt completion. |

One full run under concurrent build load failed the unchanged Reddit lifecycle
test when its subprocess produced no JSON at the test's 2,500ms kill deadline.
No Reddit code was changed. The isolated test passed 8/8 in 5.16s, then the full
uncongested run passed 1,960/1,960. This is documented as an observed timing-sensitive
test, not silently erased or relaxed. Earlier full run also passed 1,954 tests
before the final legacy-report regression tests were added.

Additional completed checks:

- `npm run validate:data`: 354 products, 27 categories, 1,348 comparisons, 0 problems.
- `npm run affiliate:audit`: 22 active partners; 99 existing findings (primarily
  stale research and external follow-up), not 99 new activation defects. Private
  pipeline runtime data is absent in this isolated worktree; no account changes.
- `npm run growth:one-sided-audit`: 165 one-sided comparisons pass; 16 dual-active
  pairs identified (not counted in that script's one-sided assertions).
- `npm run report:links`: 354-product data graph, mean 10.3 inbound cross-links;
  9 weak-link products outside this cohort. Rendered graph proof above is separate.
- `npm run maintenance:seo`: 1,778 titles, 1,736 descriptions, 984 sitemap entries,
  0 issues after fixing the obsolete audit policy; no sitemap URL/date changed.

## Remaining limits / integration requirements

1. Local commits only. Integrator must combine Claude's lane, resolve the shared
   funnel file carefully, rerun gates and perform any separately authorized release.
2. Production Blob failure/replay behavior was mocked, not tested by production
   writes. API still offers best-effort browser delivery, not guaranteed exactly-once
   merchant navigation. Persistent IDs do not prove humans or eliminate forged spam.
3. No current production funnel counts were fetched in this sprint. Local QA zeros
   must not be described as zero production traffic or zero revenue.
4. Historical identity-less records cannot recover missing UTMs or later QA labels.
5. Owner-supplied re-application updates need separate ledger-history reconciliation;
   no pending relationship was activated. No payout/conversion evidence was inferred.
