# Miloosh test-gate recovery — 2026-10-08

Status: PARTIAL FIX, FULL GATE FAIL, DO NOT RELEASE.

Base: canonical HEAD 80eb1e5. Isolated branch: codex/miloosh-test-gates-20261008. No changes to production, no merge.

## Baseline confirmation
Full `npm test -- --reporter=json --outputFile=/tmp/miloosh-baseline-tests-20261008.json` against unchanged canonical source produced 23 failed and 1877 passed assertions. This proves the 23 failures predate the isolated Salesforce data correction. Exact failing cases retained on Mac in the JSON artifact.

## Functional repair
Four executable TypeScript script entrypoint guards were incorrectly comparing an encoded `import.meta.url` against a raw filesystem path containing Hebrew directory characters. Thus direct `node --import tsx ...` invocations silently exited without reports and Reddit CLI emitted no JSON. Changed only the guards in `scripts/analytics/report.ts`, `scripts/growth/verified-active-cta-coverage.ts`, `scripts/growth/post-acquisition-report.ts`, and `scripts/reddit/worker.ts` to normalize/encode the path before comparison. No policy, locks, browser authorization or production data semantics changed.

## Verified tests
- `npx vitest run tests/reddit/worker-lifecycle.test.ts tests/analytics/report-unavailable.test.ts tests/analytics/legacy-report-unavailable.test.ts`: PASS 14/14.
- Full `npm test -- --reporter=json --outputFile=/tmp/miloosh-test-fixes-full.json`: FAIL 12, PASS 1887, 1899 total. Failed categories: two page-order assertions tied to old literal 'Top alternatives' rather than a dynamic heading; store-plan Wix/Shopify source and date assumptions (6+ assertions); community manifest Wix regional price mismatch; partner material audit missing CallRail; FreshBooks/SurveyMonkey payout-readiness expectations. Exact list and errors in JSON result.
- Do NOT change assertions, prices, protected pages or payout status merely to pass. Each remaining discrepancy needs source-of-truth reconciliation and independent evidence.

## Release decision
BLOCKED: 12 remaining test failures. This branch has no deployment authorization. Changes isolated from Salesforce and the security remediation branch. All test standards preserved.

## October 8 — second pass: historical test reconciliation

Following a comparison against first-party internal ledgers and official vendor pricing, the remaining 12 baseline test failures were resolved in the isolated test branch. Evidence sources: Shopify official https://www.shopify.com/pricing (current Basic/Grow/Advanced monthly-equivalent annual-billing prices); Wix official https://www.wix.com/plans (pricing and currency vary by customer location); internal data/software/shopify.json and wix.json (last_verified 2026-10-07); data/affiliate/payout-rails.ts (PartnerStack business account payout setup verified by vendor support, with payouts and conversions still separate); data/affiliate/canonical-ledger.ts (CallRail 2026-10-01/02, ActiveCampaign 2026-10-02, Apollo 2026-10-01 issued partner links).

Changes: corrected two brittle component-order tests to look for the real dynamic section component; updated stale Shopify pricing snapshot dates and checked the current annual-billing text; aligned Wix regional-price manifest to `regional_price_variable` with no invented numeric paid-price; updated assertions about the PartnerStack business payout rail without asserting any money earned; added missing source-backed partner materials entries for CallRail, ActiveCampaign, Apollo. No payable commissions, deposits, page traffic, or live purchases were fabricated.

`npm test -- --reporter=json --outputFile=/tmp/miloosh-all-tests-after-reconcile.json`: PASS **1899/1899**, 0 failing. `npm run lint`: PASS; `npm run validate:data`: PASS; `git diff --check`: PASS. Full build status tracked separately. The old baseline of 23 failing tests was established independently before these fixes. NOTE: Changing a test snapshot expectation only because its canonical source has changed is justified by the dated official/first-party evidence above, not a relaxation of the test's purpose.

SECURITY GATE IS SEPARATE AND REMAINS RED until full npm audit is clean. No merge/deploy/production release permitted yet.
