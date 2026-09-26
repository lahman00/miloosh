# QA receipt — local integrated candidate

Code commit `651d04a6291b6906bd4ff3505dbd1a0452c22c51`. Build ID `tsJ2LEmp_wCtbMsKU5FIN`; artifact SHA-256 `eb79d4cc2840625ede40fc02ea296b32f3cbc12d4d5cb73d4a419804290b6a68`. Application-source changes were present in this build; subsequent fixes affected only measurement/report/test/crawl scripts. No production promotion.

## Thirteen existing gate checks

| Gate | Final observed result |
|---|---|
| Typecheck (`npx tsc --noEmit`) | PASS, also rerun after final script changes |
| Lint | PASS; focused changed-script lint also rerun |
| Full Vitest suite | PASS, 253 files / 2,285 tests |
| Static-gate unit tests | PASS, 11 Python tests |
| validate:data | PASS, 354 software / 27 categories / 1,348 comparisons / 0 problems |
| affiliate:audit | Exit 0; pre-existing operational follow-up reminders remain, no affiliate state changed |
| Production-mode local build | PASS, isolated `.next-miloosh-qa` |
| Static artifact verifier | PASS, failures [] |
| Query-store import | PASS, existing authenticated observations preserved |
| growth:google-war | PASS, current artifact |
| Command-center strict audit | PASS, 1,782 routes / 4,135 tracked links / 0 CTA findings |
| Browser smoke | PASS on explicit corrected rerun; both private panels, research and three commercial surfaces at 1440/390/320px; research click journey at 1440/390px |
| git diff --check | PASS, staged diff check also PASS |

The primary `growth:release-google` runner stopped at the initial browser fixture failure. Its `var/growth/google-command/release/gates.json` is preserved, not rewritten to pretend that invocation exited successfully. The corrected browser gate ran separately to exit 0; final typecheck/lint/diff checks also passed. This table describes the final individual check results, not a fictitious uninterrupted green pipeline.

Earlier full-suite failure: the lifecycle mock kept only the last useEffect after adding a second effect. Harness now executes and cleans up all effects, plus a research StrictMode deduplication test. Full suite then passed. Earlier browser fixture failure: the SPA page-view observation needed an explicit bounded wait; the outbound request contract uses `slug`, not persisted-event `softwareSlug`. The fixture was corrected to the existing contract, including shared event ID/session/CTA location. No application behavior was changed to satisfy these fixture failures.

## Additional authority checks

- 67 focused tests across authority registry, measurement, input gates, research privacy/funnel and existing page-view lifecycle suites: PASS.
- Registry import repeated twice: still 11 records, zero network/public actions. Brand import repeated twice: still one capture, no metric inflation.
- `growth:authority-report` and `growth:morning-google`: exit 0. Repeated report comparison yields no newly verified records rather than repeatedly calling old links new.
- Safe indexing proof: existing deployed research known, request history/quota unknown, state WAIT_REQUEST_HISTORY, requestsMade 0.
- Expected Umbraco titles: EXPECTED_TITLE_RENDERED at `/compare/joomla-vs-umbraco` and `/compare/drupal-vs-umbraco`; no competing reversed route created.

## Full rendered crawl

Read-only local browser crawl against port 3294, 390px, all 1,782 emitted routes. All non-GET, API/internal and external requests blocked. No link clicks, merchant navigation or production writes. Inspects HTTP/final path, canonical/title/description/robots parity with the same artifact, H1, overflow and canonical CTA markers/destinations/disclosure.

Initial pass: 1,776 completed, six generic navigation/inspection failures (`/`, `/about`, `/accessibility`, `/category/documentation`, `/category/ecommerce`, `/category/field-service-management`). Failure cause was not fully captured, so no unsupported production-defect or timeout-cause claim. Original result retained at `var/growth/google-command/crawl/latest.json`, captured `2026-09-26T20:30:53.134Z`.

Explicit serial recheck of exactly those six, same origin and artifact: **6/6 PASS**, captured `2026-09-26T20:32:17.809Z`, `recheck.json`. Union of verified results: **1,782 unique routes, zero unresolved failures**. Graph separately covers all 79,475 rendered internal edges. Initial crawl checked 4,135 tracker-marked links; zero CTA blocks and zero metadata/overflow failures among completed routes.

## Visual and telemetry inspection

Agent-browser local screenshots: `var/growth/google-command/browser/{authority,research,command}-{1440,390,320}.png`. Desktop and mobile research/authority captures inspected visually: legible, no page-level horizontal overflow; wide evidence tables scroll inside their containers. Existing research content was not rewritten.

Browser proof is synthetic and isolated. Actual rendered research source link → `/software/algolia` → existing software CTA. One research view and one decision click; CTA and intercepted outbound request share event/session identity and `software-page-cta`. External requests aborted; all API calls fulfilled locally by mocks. **No production persistence or merchant arrival is claimed.** Server ingress/whitelisting and persistence boundaries are separately unit-tested. Comparison-event classification is tested, but no comparison link is fabricated in the existing research body.

## Live read-only check and invariants

Existing pricing-pressure research live: HTTP 200, exact canonical, one H1, metadata, Organization JSON-LD, no HTML noindex/X-Robots-Tag, HTTP-200 sitemap inclusion. This is presence verification of the pre-existing asset only, not verification that new telemetry is deployed. Request history/quota unknown; no indexing request.

No outreach, posts, provider/account changes, merchant requests sent, production analytics writes, Blob writes, GitHub push or Vercel deployment. Affiliate/product data, research copy, social/cron files and six cohort memberships unchanged. Claude's uncommitted research/price work and shared checkout banner/outreach documents preserved.
