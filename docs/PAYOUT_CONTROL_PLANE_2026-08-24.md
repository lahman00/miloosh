# Miloosh Payout Control Plane — 2026-08-24

Purpose: one operational source for how Miloosh gets paid across active affiliate relationships. This file records only verified network/payment facts and explicitly separates non-sensitive automation from owner-only financial/tax/identity actions.

## Executive state

Miloosh currently has 19 active affiliate partners. They collapse into four payout rails, not 19 separate payment setups:

1. **PartnerStack** — Constant Contact, Todoist, Moosend, Volza, Pipedrive, GetResponse, Airtable, monday.com, WhatConverts, ElevenLabs, KrispCall, Hubstaff, Close, SurveyMonkey.
2. **Impact.com** — Shopify, Wix, Omnisend.
3. **Tapfiliate / Setmore** — Setmore only.
4. **MailerLite Trackdesk + Tipalti** — MailerLite only.

Machine-readable ownership lives in `data/affiliate/payout-rails.ts`; `tests/lib/payout-rails.test.ts` requires every active affiliate to belong to exactly one payout rail.

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

Current PartnerStack documentation says commissions become available for withdrawal after calculation and can be withdrawn through **PayPal, Stripe, or Direct Deposit via Airwallex**. Direct Deposit is supported for Israeli bank accounts, subject to PartnerStack/Airwallex verification and currency/account rules. PartnerStack explicitly says virtual banks and foreign-currency accounts are not supported for Airwallex direct deposit.

Official sources:

- https://support.partnerstack.com/hc/en-us/articles/360009377934-Configuring-your-payout-provider
- https://support.partnerstack.com/hc/en-us/articles/360009501113-How-do-I-get-paid

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

Current impact.com documentation says partners can withdraw once the eligible balance reaches **USD $10 or equivalent** and payment requirements are satisfied. Supported withdrawal destinations include bank/EFT and PayPal. Impact requires payment/tax details to be complete, places a 48-hour withdrawal hold after bank-detail changes, and supports threshold-based or fixed-date Autopay.

Official sources:

- https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/finance/payments-withdrawals-and-balance/how-do-partners-get-paid
- https://help.impact.com/partner/platform-features/finance/payments-withdrawals-and-balance/select-how-often-you-get-paid-as-a-partner
- https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/finance/payment-requirements-explained-for-partners

Operational conclusion: **one correctly configured Impact.com finance profile can service Shopify, Wix and Omnisend**. Do not create separate payout setups for those programs and do not re-apply to already-active brands.

Owner-only if still incomplete:

- complete/approve tax information required by Impact;
- link bank account or PayPal locally;
- complete 2FA/identity/payment verification if prompted;
- choose autopay schedule.

## 3. Setmore / Tapfiliate

Setmore is the only active Miloosh relationship on this rail.

First-party Setmore/Tapfiliate evidence confirms the relationship is active. Current Tapfiliate documentation says payout options are determined by the advertiser, not by Tapfiliate globally. Affiliates manage their payout methods in the affiliate portal; the advertiser sends the actual funds. Tapfiliate's platform supports options including Payoneer, PayPal and several bank-transfer formats, but only methods enabled by Setmore should be treated as available to Miloosh.

Official sources:

- https://support.tapfiliate.com/en/articles/13385592-adding-payout-details
- https://support.tapfiliate.com/en/articles/13272760-supported-payment-methods-paypal-wise-bank-transfer-crypto-and-more

Known Miloosh state from prior verified work: Setmore onboarding was still at **Step 4 — payout method**. Therefore this remains a real owner-only completion item unless a newer dashboard state proves otherwise.

Owner-only:

- open Setmore's Tapfiliate affiliate portal;
- choose one of the payout methods actually offered by Setmore;
- enter the selected payout details locally;
- make it primary if required.

Payoneer is a strong candidate only if Setmore actually exposes Payoneer in this account. Do not assume a payout option merely because Tapfiliate supports it in general.

## 4. MailerLite / Trackdesk / Tipalti

First-party MailerLite email confirms Miloosh is fully set up as a MailerLite affiliate and can promote using custom referral links from its Trackdesk partner dashboard.

Current official MailerLite documentation resolves the previously unattributed Tipalti task:

- MailerLite affiliate payouts are processed through **Tipalti**;
- Tipalti is integrated directly into Trackdesk, so MailerLite says no separate payout account needs to be created;
- available payout methods are **PayPal, Direct Deposit, and Wire Transfer**;
- commissions have a 30-day hold;
- payout eligibility requires at least **$100 Open Balance** generated from at least **2 unique paying referrals**;
- when eligibility is met, billing details are complete, and a valid payout method is selected, settlements are processed automatically on Fridays.

Official sources:

- https://www.mailerlite.com/affiliate
- https://www.mailerlite.com/help/guide-to-affiliate-payouts-and-commissions
- https://www.mailerlite.com/legal/affiliate-program-terms

Operational conclusion: the old generic owner task `complete Tipalti` should be understood specifically as **complete MailerLite Trackdesk Billing/Tipalti setup if the dashboard shows it incomplete**. Do not look for a mystery second network or create a separate Tipalti account from an unsolicited path.

Owner-only if incomplete:

- open MailerLite partner portal / Trackdesk → Billing;
- complete billing/tax identity fields requested there;
- select PayPal, Direct Deposit, or Wire Transfer;
- enter sensitive payout details locally.

## 5. Existing Payoneer asset

First-party Payoneer email dated 2026-08-23 confirms:

- the Payoneer account is connected and ready to receive Payoneer payments;
- a USD receiving account exists and is ready for use.

This means Miloosh already has a usable receiving rail where a network explicitly supports Payoneer or where a legitimate USD bank-receiving account is accepted. Do not blindly substitute Payoneer receiving-account details into platforms whose terms prohibit virtual/foreign-currency accounts or require a local bank account.

No Payoneer credential, customer identifier, receiving-account number, or other financial identifier is stored in this repository.

## 6. CJ — optional rail, with official Payoneer support

Two CJ publisher CIDs remain evidenced and must not be merged/deleted blindly:

- CID 8043935 — `lahman00@gmail.com`
- CID 8048091 — `hello@miloosh.com`

First-party CJ email dated 2026-08-23 proves **payment information was changed on CID 8043935**. That is evidence of payment-setup activity, not proof that the account is fully payout-ready or that it should be Miloosh's canonical CJ account.

CJ's current publisher page explicitly states that publishers can be paid by direct deposit or through CJ's global payments partner, **Payoneer**, in more than 150 currencies. This makes Miloosh's existing Payoneer account a legitimate CJ payout option if the live CJ account exposes/accepts that connection. The timing of the CJ payment-information change and Payoneer activation is not enough to claim they are already linked; only the live CJ dashboard can prove that.

Official sources:

- https://www.cj.com/publisher
- https://junction.cj.com/article/global-innovation-payoneer

CJ should remain optional and isolated to vendors whose current official affiliate path genuinely requires CJ. Current owner-action scope is intentionally limited to **1Password and QuickBooks**, not the old broad CJ wish-list. Do not create a third CJ account.

## Minimal owner action target

The intended end state is no more than these sensitive completion points:

1. **PartnerStack:** verify or select one payout provider for the PartnerStack partner group.
2. **Impact.com:** verify finance/tax profile and one payout method for Shopify/Wix/Omnisend.
3. **Setmore/Tapfiliate:** finish Step 4 payout method if still incomplete.
4. **MailerLite Trackdesk/Tipalti:** complete Billing only if the dashboard shows missing billing/tax/payment fields.
5. **CJ only when needed:** compare the two existing CIDs and verify payout readiness; use Payoneer only if the live CJ account shows it as the selected/available method.

Everything else should be handled as network-level operational state, not repeated vendor-by-vendor setup.

## Safety / truth rules

- Never store bank account numbers, card numbers, tax IDs, Payoneer identifiers, passport/ID numbers, passwords, 2FA codes or payout-provider secrets in this repository.
- Never mark `PAYOUT_READY` merely because an affiliate relationship is active.
- Never infer a payout method from a network's generic support matrix; verify the method actually enabled for Miloosh.
- Never create duplicate network accounts to solve an unknown payout state.
- A real payment-received event remains the strongest proof that the rail works end to end.
