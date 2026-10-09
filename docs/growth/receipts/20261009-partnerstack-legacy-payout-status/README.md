# PartnerStack legacy payout evidence reconciliation — October 9, 2026

**Status: first-party account setup observed; withdrawal readiness NOT VERIFIED.**

## Verified scope and dated provenance
- On September 14, 2026, PartnerStack Support reported that the legacy account did not have an attached payout method and needed tax-registered location information. That was accurate **as of that date**.
- On October 9, 2026, the owner provided screenshots of the authenticated PartnerStack Commissions & withdrawals dashboard. The earlier tax-location warning had disappeared, an ILS direct-deposit method was selected, and the provider details appeared in a "Connected bank account" panel. These screenshots establish *method connection and tax-form completion as displayed*, not a completed real withdrawal, verification badge, approval or earned commission.
- No bank name, account digits, SWIFT/BIC, address, tax number, user identity document or personal verification data is reproduced in this public receipt.
- Preserve the four existing active affiliate relationships and account-specific issued tracking links (monday, whatconverts, elevenlabs, wrike). PartnerStack's separate network application decline does not alone invalidate those individual partnerships, per its earlier support correspondence.

## Authoritative data change
- Change **only** the legacy payout rail from `OWNER_ACTION_REQUIRED` ("connect method") to `UNVERIFIED` ("method connected; withdrawal readiness not independently confirmed"). It must **not** become `VERIFIED` from connection screenshots alone.
- Update its existing owner action pack to reflect that bank/tax setup was already completed and to avoid requesting duplicate setup. The remaining owner action is a read-only network/dashboard verification of withdrawal readiness if and when appropriate.
- Distinguish these statuses in the growth agents' English and Hebrew action text. `OWNER_ACTION_REQUIRED` continues to mean a documented setup blocker; `UNVERIFIED` instructs a review rather than automatically instructing the owner to reconnect a payout provider.
- No affiliate URL, program status, SEO target, on-page text or ranking decision is intentionally changed. Historical receipts about prior missing account setup remain dated records and should not be rewritten as though they describe October 9.
- Actual conversions, approved commissions, payment receipts and bank verification remain `NOT_MEASURED` / `UNVERIFIED`. No financial success or changed eligibility is inferred.

## Security and release
- Work in an isolated branch derived from current production-source commit `7b4db56`. Do not modify the dirty canonical checkout, PartnerStack account, email, bank details, programs or external websites.
- Add tests to enforce four-partner link continuity, conservative payout status, meaningful owner wording, and protection against counting setup as a paid commission.
- Verify the rendered-site semantic diff to confirm no commercial page text, canonicals, SEO structured data or affiliate outbound link changes.
- No merge, push, deployment or financial account action until the exact candidate passes the normal complete release gates.
