# Miloosh Payout Control Plane — 2026-08-24

Purpose: one operational source for how Miloosh gets paid across active affiliate relationships. This file records only verified network/payment facts and explicitly separates non-sensitive automation from owner-only financial/tax/identity actions.

## Executive state

Miloosh currently has 19 active affiliate partners. They collapse into four payout rails, not 19 separate payment setups:

1. **PartnerStack** — Constant Contact, Todoist, Moosend, Volza, Pipedrive, GetResponse, Airtable, monday.com, WhatConverts, ElevenLabs, KrispCall, Hubstaff, Close, SurveyMonkey.
2. **Impact.com** — Shopify, Wix, Omnisend.
3. **Tapfiliate / Setmore** — Setmore only.
4. **MailerLite direct affiliate platform** — MailerLite only.

## 1. PartnerStack — primary payout rail

Active Miloosh partners on this rail:

- Constant Contact
- Todoist
- Moosend
- Volza
- Pipedrive
- GetResponse
- Airtable
- monday.com
- WhatConverts
- ElevenLabs
- KrispCall
- Hubstaff
- Close
- SurveyMonkey

Current PartnerStack documentation says commissions become available for withdrawal after calculation and can be withdrawn through **PayPal, Stripe, or Direct Deposit via Airwallex**. Direct Deposit is supported for Israeli bank accounts, subject to PartnerStack/Airwallex verification and currency/account rules.

Operational conclusion: configure **one PartnerStack payout provider** correctly and it covers this whole group. Do not repeat banking setup program-by-program.

Current evidence does **not** prove which payout provider is already configured in the Miloosh PartnerStack account. Gmail contains partner onboarding and payout-navigation references but no first-party confirmation of an already-linked payout provider.

Owner-only if still incomplete:

- select/link the payout provider;
- enter bank/PayPal/Stripe details locally;
- complete any requested identity verification.

Do not send credentials, bank details, identity documents, or one-time codes into chat or repository files.

## 2. Impact.com — shared rail for Shopify, Wix, Omnisend

Verified active programs:

- Shopify
- Wix
- Omnisend

Omnisend's first-party welcome message is issued through `notifications@app.impact.com`, confirming it shares the Impact.com rail with Shopify/Wix.

Current impact.com documentation says partners can withdraw once the eligible balance reaches the platform minimum (USD $10 or equivalent) and payment requirements are satisfied. Supported withdrawal methods include bank/EFT and PayPal. Impact requires payment/tax details to be complete and may place a security hold after banking changes. Autopay can be configured by threshold or fixed payout date.

Operational conclusion: **one correctly configured Impact.com finance profile can service Shopify, Wix and Omnisend**. Do not create separate payout setups for those programs.

Owner-only if still incomplete:

- complete/approve tax information required by Impact;
- link bank account or PayPal locally;
- complete 2FA/identity/payment verification if prompted;
- choose autopay schedule.

## 3. Setmore / Tapfiliate

Setmore is the only active Miloosh relationship on this rail.

First-party Setmore/Tapfiliate evidence confirms the relationship is active. Current Tapfiliate documentation says payout methods are advertiser-controlled and affiliates add payout details under their profile/Payout Methods. Tapfiliate itself does not necessarily issue the payment: the advertiser is responsible for sending funds. Supported platform payout-method fields can include Payoneer, PayPal and international bank details, but only options enabled by Setmore should be treated as available to this Miloosh account.

Known Miloosh state from prior verified work: Setmore onboarding was still at **Step 4 — payout method**. Therefore this remains a real owner-only completion item unless a newer dashboard state proves otherwise.

Owner-only:

- open Setmore's Tapfiliate affiliate portal;
- choose one of the payout methods actually offered by Setmore;
- enter the selected payout details locally;
- make it primary if required.

Payoneer is a strong candidate only if Setmore actually exposes Payoneer in this account. Do not assume a payout option merely because Tapfiliate supports it in general.

## 4. MailerLite direct

First-party MailerLite email confirms Miloosh is fully set up as a MailerLite affiliate and can promote using custom referral links from its own affiliate dashboard.

The current collected evidence does not yet prove Miloosh's payout method or payout-completion status inside the MailerLite affiliate dashboard. Treat payment setup as **unverified**, not incomplete by assumption.

Owner-only only if the dashboard shows an unfinished payout/tax step. Do not create a duplicate affiliate account.

## 5. Existing Payoneer asset

First-party Payoneer email dated 2026-08-23 confirms:

- the Payoneer account is connected and ready to receive Payoneer payments;
- a USD receiving account exists and is ready for use.

This means Miloosh already has a usable receiving rail where a network explicitly supports Payoneer or where a legitimate USD bank-receiving account is accepted. Do not blindly substitute Payoneer receiving-account details into platforms whose terms prohibit virtual/foreign-currency accounts or require a local bank account.

## 6. CJ

Two CJ publisher CIDs remain evidenced and must not be merged/deleted blindly:

- CID 8043935 — `lahman00@gmail.com`
- CID 8048091 — `hello@miloosh.com`

First-party CJ email dated 2026-08-23 proves **payment information was changed on CID 8043935**. That is evidence of payment-setup activity, not proof that the account is fully payout-ready or that it should be Miloosh's canonical CJ account.

CJ should remain optional and isolated to vendors whose current official affiliate path genuinely requires CJ. Do not build the whole Miloosh payout system around CJ.

## 7. Tipalti

No first-party Tipalti invitation/onboarding email was found in the current Gmail evidence. Therefore `complete Tipalti` is not an actionable owner task until a real payer/program is identified. Do not ask the owner for tax/bank data based on an unattributed Tipalti note.

## Minimal owner action target

The intended end state is no more than these sensitive completion points:

1. **PartnerStack:** verify or select one payout provider.
2. **Impact.com:** verify finance/tax profile and one payout method for Shopify/Wix/Omnisend.
3. **Setmore/Tapfiliate:** finish Step 4 payout method if still incomplete.
4. **MailerLite:** inspect payout settings once; act only if incomplete.

Everything else should be handled as network-level operational state, not repeated vendor-by-vendor setup.

## Safety / truth rules

- Never store bank account numbers, card numbers, tax IDs, passport/ID numbers, passwords, 2FA codes or payout-provider secrets in this repository.
- Never mark `PAYOUT_READY` merely because an affiliate relationship is active.
- Never infer a payout method from a network's generic support matrix; verify the method actually enabled for Miloosh.
- Never create duplicate network accounts to solve an unknown payout state.
- A real payment-received event remains the strongest proof that the rail works end to end.
