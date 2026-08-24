# Miloosh payout owner runbook

Use this only while the owner is present for account authentication and sensitive finance/tax/identity steps. The objective is to verify and complete payout readiness with the minimum number of account touches.

Never paste passwords, bank/account numbers, tax identifiers, identity documents, PayPal/Payoneer credentials, or one-time codes into chat, source control, screenshots, or notes.

## Definition of done

For each account-level payout profile, collect only non-sensitive evidence:

- account identity/email;
- payout provider/method name only;
- status: verified/complete, incomplete, or unavailable;
- whether tax/identity verification is complete or still requested;
- any non-sensitive blocker text;
- date verified.

Do not record account numbers, tax IDs, document numbers, payout addresses, or provider secrets.

## 1. PartnerStack business account

Account: `hello@miloosh.com`

Known partners: Constant Contact, Todoist, Moosend, Volza, Pipedrive, GetResponse, Airtable, KrispCall, Hubstaff, Close, SurveyMonkey.

1. Open `https://dash.partnerstack.com/`.
2. Use email + password for `hello@miloosh.com`. PartnerStack Support explicitly said Google sign-in will error for this account.
3. Open the Payouts/Payments area.
4. If a provider already shows verified/connected, do not change it merely to standardize with another network.
5. If none is configured, use an actually offered provider. For Airwallex Direct Deposit, use a qualifying real local Israeli bank account; do not use a Payoneer USD receiving account as bank details because PartnerStack says virtual banks and foreign-currency accounts are unsupported for this route.
6. Complete only the local sensitive fields/verification requested by PartnerStack/provider.
7. Record only: provider name, verified/incomplete status, non-sensitive blocker, verification date.

Done when the account itself shows a usable payout provider as verified/ready.

## 2. PartnerStack legacy/personal-email account

Account: `lahman00@gmail.com`

Known partners: monday.com, WhatConverts, ElevenLabs.

1. Sign in to the existing PartnerStack identity tied to `lahman00@gmail.com`; do not create another account.
2. Open Payouts/Payments.
3. Treat this as an independent finance profile. Do not assume the `hello@miloosh.com` provider carries across.
4. Preserve all three active partner relationships.
5. Configure/verify only a provider actually offered by this account.
6. Record only method name, readiness, blocker, date.

Done when this second account independently shows payout readiness.

## 3. Impact.com

Known active programs: Shopify, Wix, Omnisend.

1. Open `https://app.impact.com/` and sign in to the existing Miloosh publisher account.
2. Do not re-apply to Shopify, Wix, or Omnisend.
3. Open Finance / Bank Account / Tax / Payments as exposed by the current UI.
4. Check whether tax/payment requirements are already satisfied before editing anything.
5. Prefer an already-working bank/EFT setup if present. Impact documents a PayPal processing fee, so do not switch a valid bank setup to PayPal merely for convenience.
6. If a valid payout method is already present, avoid unnecessary bank-detail edits because Impact places a security hold after changes.
7. Confirm Autopay/withdrawal settings.
8. Record only payout method class, readiness, tax/verification completion state, non-sensitive blocker, date.

Done when one Impact finance profile can receive commissions for all three active programs.

## 4. Setmore / Tapfiliate

Known payout instruction from first-party Setmore welcome email: keep **PayPal details updated** to cash in.

1. Open `https://setmore.tapfiliate.com/` and sign in to the existing affiliate account.
2. Check onboarding Step 4 / Payout Method.
3. Verify or update PayPal locally if incomplete.
4. Make it primary if the portal requires a primary payout method.
5. Do not substitute Payoneer merely because Tapfiliate supports it generically unless Setmore itself changes the instruction.
6. Record only `PayPal`, readiness, blocker, date.

Done when Setmore/Tapfiliate shows the payout method completed.

## 5. MailerLite / Trackdesk / Tipalti

1. Open the existing MailerLite affiliate dashboard from `https://www.mailerlite.com/affiliate`.
2. Do not create a second MailerLite affiliate or standalone Tipalti account.
3. Open Trackdesk Billing / payout settings.
4. If the embedded Tipalti profile is already complete, do not redo it.
5. If incomplete, complete the requested billing/tax/identity fields locally.
6. MailerLite currently offers PayPal, Direct Deposit, and Wire Transfer. Its published affiliate information says MailerLite covers PayPal transaction fees while Direct Deposit/Wire fees are borne by the affiliate; PayPal is therefore the default convenience choice unless the live dashboard or owner's preference gives a reason to use another method.
7. Record only method class, readiness, blocker, date.

Account setup readiness is separate from payout eligibility. Current MailerLite terms require the payout threshold/referral conditions before money is actually settled.

## 6. CJ, optional

Only do this when Miloosh wants to pursue current CJ-required programs such as 1Password or QuickBooks.

Existing CIDs:

- `8043935` — `lahman00@gmail.com`
- `8048091` — `hello@miloosh.com`

1. Do not create a third CJ publisher account.
2. Sign in to both existing CIDs.
3. Compare advertiser relationships, links, tax/payment readiness, and historical performance.
4. CID 8043935 has first-party evidence of a payment-information change on 2026-08-23, but that alone does not prove payout readiness.
5. CJ officially supports Payoneer for publishers. Check whether the already-ready Payoneer account is actually linked; do not infer linkage from timing.
6. Do not delete, merge, deactivate, or abandon either CID until the comparison is recorded.
7. Select a canonical CJ account only from live evidence.

## Close-out

After each account check:

1. Update `data/affiliate/payout-rails.ts` readiness from `UNVERIFIED` / `OWNER_ACTION_REQUIRED` to `VERIFIED` only when dashboard evidence supports it.
2. Keep sensitive values out of the repository.
3. Run payout integrity tests.
4. Verify `/internal/payouts` in production.
5. A real received payment remains the strongest end-to-end proof; account setup alone must never be represented as revenue.
