# Partnership integrity audit — 2026-09-30

Audit branch: audit/partnership-integrity-20260930. Base: 71e6e46.
Observed production: e23a126b9b4169226bd1c84ffdb94b48daf44f05, deployment dpl_3puWCBTyyznpgBzkNmqdg9npdKKY.
No push/deploy, email send, account acceptance, payout or tax changes during this audit.

## Scope and observed evidence
- Enumerated all 80 current ledger records/buckets after recording Zendesk rejection; 22 active software affiliate assets, six payout rails and five intake/migration records. These are not 80 signed partnerships.
- Scanned 1,788 locally rendered public HTML pages and fetched 257 live routes. 256 returned200; the diagnostic /software/cloro probe returned404 and was NOT an observed public broken link.
- All22 active hubs returned200 with correct canonical URLs. 383 commercial affiliate placements across250 routes matched25 issued assets; no unknown sponsored asset or rel defect was found in this sample.
- Six supplementary vendor Pricing links still go direct in the older production deployment: Constant Contact, Jotform, KrispCall, MailerLite, Omnisend, SurveyMonkey. Existing reconciliation fixes are not deployed. No second implementation was created.
- Live isolated-browser QA: 31 valid page/viewport cases, 84 native activations, no failed checks. Both event requests shared an ID, correct source path and QA marker. ALL API writes intercepted and external navigation cancelled; ZERO real merchant requests or production analytics writes.
- Harness diagnostics retained: an initial reversed Wix/Shopify route was corrected to the published canonical; a hidden desktop duplicate on a mobile guide was excluded only after identifying responsive visibility. Not website failures.
- Backend request handler exercised with44 additional primary/pricing cases acrossall22 partners and both isolated event stores. This is local backend evidence, not proof of remote merchant attribution.
- Fresh authorized production config shows tracking enabled. Local missing environment files did not prove production tracking disabled.
- Production Blob read: 2,684 first-party events and21 legacy records.18 legacy affiliate-click records consist of9 QA,8 explicitly non-test and1 unknown marker. Non-test does not prove a human buyer. Historical records lack join IDs, so do not sum sinks or invent a conversion rate. Merchant conversions, approved commissions and paid payouts remain UNKNOWN.

## Local fixes
CallRail -> PENDING_REVIEW from first-party Sep30 submission receipt, no duplicate application.
Zendesk personal-account rejection -> explicit REJECTED record, no affiliate activation.
Impact owner instructions -> one new authenticated request if no replacement is open; old880838 cannot be reopened.
Money matrix -> clearly separates code configuration from executed-contract and merchant-attribution proof.
Jotform -> qualification delay not a cookie duration; pricing-asset documentation aligned with implementation.
Wix materials URL -> exact existing issued asset, no new tracking parameters invented.
Cloro migration / Catalister / MRPeasy -> terms-review intake only, no new catalog/approval.

## Contract risks and action holds
Public terms are not copies of the22 accepted account-specific agreements; acceptance/version/offer evidence remains incomplete.
- ElevenLabs: https://elevenlabs.io/affiliates-terms — obtain written clarification on search metadata and single-referral-account restrictions before expanding promotion or duplicating accounts. Preserve editorial independence; do not silently alter protected experiments.
- MailerLite: https://www.mailerlite.com/legal/affiliate-program-terms — clarify pre-publication content review for independent comparisons and future content. No new promotional expansion until clarified.
- Airtable: stored affiliate-terms URL now redirects to About; obtain current contract from the program, not general company ToS.
- Moosend: current public terms and the account's PartnerStack arrangement require reconciliation; do not infer the assigned commercial offer.
- Setmore: linked PDF includes legacy examples; separate qualification/payout delay from attribution cookie. Request applicable current offer before projecting revenue.
- Close: public agreement limits affiliate commission basis to subscriptions; assigned account group and October code remain unverified.

## Reproducible checks
Independent npm ci --ignore-scripts from lockfile, not shared node_modules.
271 test files / 2484 tests passed; TypeScript, lint, catalog validation, full dependency audit and Webpack build passed.
Raw logs, HTML snapshots, redacted summaries and private production read evidence are in the owner-local MilooshReceipts/20260930-partnership-audit directory. No tokens, private event identities, or confirmation links included in this committed receipt.

## Not certified
No legal opinion or guarantee that all contracts comply. No verification of every private portal, executed contract or merchant-side conversion. No artificial click/sale used to test commission attribution.
