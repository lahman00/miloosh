# Miloosh: affiliate, SEO and security execution receipt

Scope: local release candidate; not a production deployment.
Branch: execution/affiliate-seo-20260930. Base ad895c5. Tested implementation HEAD 2d7d03698e555753cf4f8e915f7d457cbb7de1cc.
Security 6fedf9f; affiliate 46a3b65; SEO 2d7d036.

## Actual changes
- Fireflies: exact vendor-issued asset wired into the existing software page and two existing comparisons, five rendered commercial placements. Current account offer is 10% recurring; duration is not verified. Missing payout remains separate. Active configured website partners:23, seven payout rails. The five first-revenue products are unchanged.
- Apollo, Aircall and Softr: Sep30 submission receipts recorded as PENDING_REVIEW and removed from the fresh-application queue. No new applications sent. Softr has no catalog record and none was manufactured for its application. Aircall still requires the explicit editorial-permission clarification; a general approval would not silently waive it.
- Buddy Punch: owner accepted terms and supplied a real issued URL. Recorded ACCEPTED_NOT_ACTIVATED. No catalog page or public CTA invented merely for the commission.
- Setmore: OWNER_REPORTED_COMPLETE setup observation, withdrawal readiness UNVERIFIED; do not ask the owner to refill old steps.
- Impact: provider bank review pending when a balance is payable; historical missing-city ticket is not a current instruction to change banking details.
- MailerLite: PayPal validation failed; root cause unknown. Owner-requested pause retained with Fireflies. No claim that changing PayPal from Business to Personal is necessary or sufficient.
- Wix: Romy's written confirmation is linked to buyer-intent Website Builder/eCommerce/Headless routing, not payment readiness.
- Zendesk material-status projection aligned with the rejection already in the canonical ledger; Jotform qualification delay is not recorded as a cookie window.

## SEO implementation
Three existing first-revenue pages gained nine source-linked pre-purchase/migration checks, rendered server-side with local navigation and an explicit distinction between vendor documentation and proposed buyer tests:
- Todoist: export completeness, recurring dates, safe CSV import boundaries.
- Close: lead versus activity migration, JSON/CSV exit coverage, required workflow tier and communications usage.
- Setmore: staff-calendar billing, sync/reminder limits, contact versus appointment continuity.
Only these three genuine content updates changed sitemap lastmod to Sep30. No new URLs, sitemap expansion, canonical rewrite, noindex shortcut, ranking reshuffle or fabricated migration tests.
Protected Airtable, Pipedrive, Wrike and Ecwid rendered text, canonical, description/robots metadata and href sequences exactly match the available base artifacts.

## Security
Next.js16.3.5 ->16.3.8; eslint-config-next16.3.2 ->16.3.8; transitive DOMPurify ->3.4.16. Targeted installs and independent npm ci, no npm audit fix --force.
The initial dependency scan found one critical Next ImageResponse advisory and one low DOMPurify advisory. The final dependency scan reports0 vulnerabilities. This is not evidence the public site was exploited.
Sources: https://github.com/advisories/GHSA-vcvr-r3jv-pc5j and https://github.com/cure53/DOMPurify/security/advisories/GHSA-p98j-92pf-mc4p.

## QA
- 274 test files / 2515 tests passed.
- TypeScript, lint, catalog validation, dependency audit, production-style Webpack build and full static gate passed.
- Catalog:354 software pages,27 categories,1348 comparisons;0 validation problems.
- Build:3542 generated outputs. Static gate:988 sitemap URLs,1786 public HTML pages,86685 internal anchors,0 failures.
- Isolated browser:18/18 cases,62 native activations,0 browser check failures; desktop/tablet/mobile and published comparison routes. API calls intercepted before page load, external navigation prevented. ZERO production event writes or merchant requests.
- Separate local backend tests exercise primary/pricing destinations for all23 active partners in both isolated event stores; browser wiring is not merchant attribution.
- Local /recommend returned200; a benign local patched ImageResponse probe returned a valid1080x1080 PNG. No exploit probe executed.
- Initial failures were preserved, diagnosed and corrected: stale state/count assertions after real evidence changes; sitemap date test expected old dates and one new test assumed production origin under development defaults. No test was deleted and no safety invariant weakened.

## Current GSC evidence
Read live on Sep30, but report Last update is Sep21:218 indexed,1705 excluded=820 discovered+825 crawled+58 proper alternates+2 redirects. These counts are not a new improvement claim. The local indexation-readiness audit still reports12 failures outside this bounded content scope; not reported as fixed.

## Unchanged external systems / release priority
No social actions (X remains held), new applications, email sends, contract acceptance, bank changes, payout-profile changes, push or deploy.
Production still observed at e23a126 / dpl_3puWCBTyyznpgBzkNmqdg9npdKKY. The existing six supplementary Pricing-link repairs remain unshipped, not reimplemented here. The security patch also remains local until a controlled release.
Next priority is a reviewed production release, especially the security patch, rather than more application volume. Review the already-existing108-file implementation delta from production before releasing the full branch; do not assume a local green build means production changed.

## Evidence pointers
Fireflies welcome Gmail1a0f3e41e847eb0c and authenticated FirstPromoter Home; Apollo receipt1a0f23df662a2deb; Aircall1a0f245207674373; Softr1a0f24a6227cf4bb; Romy1a0f23bd5b019acd; Buddy Punch1a0f2363f6cc8396 plus owner screenshot15.18.35. No raw email authentication/notification URLs copied.
Vendor content sources:
https://www.todoist.com/help/account-and-billing/security/import-or-export-a-project-as-a-csv-file-in-todoist-YC8YvN
https://help.close.com/getting-started/import-data-into-close/importing-other-data-into-close
https://help.close.com/account-management/exporting-data
https://close.com/pricing
https://www.setmore.com/pricing
Raw reproducible QA logs and screenshots: ~/MilooshReceipts/20260930-affiliate-seo-execution/.
