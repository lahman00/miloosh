# Miloosh Payout Control Plane — 2026-08-24

Purpose: one operational source for how Miloosh gets paid across active affiliate relationships. This file records only verified network/payment facts and explicitly separates non-sensitive automation from owner-only financial/tax/identity actions.

## Executive state

Miloosh currently has 19 active affiliate partners. They collapse into **five account-level payout profiles**, not 19 separate payment setups:

1. **PartnerStack / hello@miloosh.com** — Constant Contact, Todoist, Moosend, Volza, Pipedrive, GetResponse, Airtable, KrispCall, Hubstaff, Close, SurveyMonkey.
2. **PartnerStack / lahman00@gmail.com** — monday.com, WhatConverts, ElevenLabs.
3. **Impact.com** — Shopify, Wix, Omnisend.
4. **Tapfiliate / Setmore** — Setmore only.
5. **MailerLite Trackdesk + Tipalti** — MailerLite only.

CJ remains an optional sixth checkpoint for current CJ-required publisher paths; it is not part of the 19 currently active partner payout profiles.

Machine-readable ownership lives in `data/affiliate/payout-rails.ts`; `tests/lib/payout-rails.test.ts` requires every active affiliate to belong to exactly one payout rail.

## 1. PartnerStack — two separate account-level payout profiles

### A. Business-email account — hello@miloosh.com

Assigned active partners:

- Constant Contact
- Todoist
- Moosend
- Volza
- Pipedrive
- GetResponse
- Airtable
- KrispCall
- Hubstaff
- Close
- SurveyMonkey

First-party PartnerStack Support explicitly confirmed that `hello@miloosh.com` is the account containing the Airtable and Pipedrive partnerships and activity. Support also said this account uses the **email + password** login flow and specifically warned that Google sign-in will error for it. First-party partner mail to `hello@miloosh.com` corroborates the other relationships assigned here.

### B. Legacy/personal-email account — lahman00@gmail.com

Assigned active partners:

- monday.com
- WhatConverts
- ElevenLabs

First-party monday.com application mail and WhatConverts/ElevenLabs affiliate mail are tied to `lahman00@gmail.com`. Therefore this is a separate PartnerStack account-level payout checkpoint. Do not assume a payout provider configured under `hello@miloosh.com` automatically applies here.

### PartnerStack payout method rules

Current PartnerStack documentation says commissions become available for withdrawal after calculation and can be withdrawn through **PayPal, Stripe, or Direct Deposit via Airwallex**. Direct Deposit is supported for Israeli bank accounts, subject to PartnerStack/Airwallex verification and currency/account rules. PartnerStack explicitly says virtual banks and foreign-currency accounts are not supported for Airwallex direct deposit.

Official sources:

- https://support.partnerstack.com/hc/en-us/articles/360009377934-Configuring-your-payout-provider
- https://support.partnerstack.com/hc/en-us/articles/360009501113-How-do-I-get-paid

Operational conclusion: verify **one payout provider per actual PartnerStack account**, so Miloosh currently has two PartnerStack payout checks, not fourteen. The connected Gmail evidence does not prove that either account's payout provider is already configured.

Owner-only if incomplete:

- sign into each evidenced PartnerStack account separately;
- inspect its Payouts/Payments area;
- select/link an actually offered provider if none is verified;
- enter bank/PayPal/Stripe details locally;
- complete requested identity verification.

Do not use the Payoneer USD receiving account as an Airwallex direct-deposit bank account: PartnerStack's published rules reject virtual banks and foreign-currency accounts for that route.

## 2. Impact.com — shared profile for Shopify, Wix, Omnisend

Verified active programs:

- Shopify
- Wix
- Omnisend

Omnisend's first-party welcome message is issued through `notifications@app.impact.com`, confirming it shares the Impact.com rail with Shopify/Wix.

Current impact.com documentation says partners can withdraw once the eligible balance reaches **USD $10 or equivalent** and payment requirements are satisfied. Supported withdrawal destinations include bank/EFT and PayPal. Impact requires payment/tax details to be complete, places a 48-hour withdrawal hold after bank-detail changes, and supports threshold-based or fixed-date Autopay. Impact currently documents a 2% PayPal processing fee capped at USD $20 equivalent.

Official sources:

- https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/finance/payments-withdrawals-and-balance/how-do-partners-get-paid
- https://help.impact.com/partner/platform-features/finance/payments-withdrawals-and-balance/select-how-often-you-get-paid-as-a-partner
- https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/finance/payment-requirements-explained-for-partners

Operational conclusion: **one correctly configured Impact.com finance profile can service Shopify, Wix and Omnisend**. Do not create separate payout setups for those programs and do not re-apply to already-active brands.

Owner-only if incomplete:

- complete/approve tax information required by Impact;
- link bank account or PayPal locally;
- complete 2FA/identity/payment verification if prompted;
- choose autopay schedule.

## 3. Setmore / Tapfiliate

Setmore is the only active Miloosh relationship on this rail.

The strongest first-party evidence is Setmore's own affiliate welcome email, which explicitly says to keep **PayPal details updated so you can cash in**. Prior verified work also found Setmore's Tapfiliate onboarding at Step 4, payout method.

Tapfiliate generically supports multiple payout-method fields, but that generic matrix must not override Setmore's direct instruction.

Official Tapfiliate background:

- https://support.tapfiliate.com/en/articles/13385592-adding-payout-details
- https://support.tapfiliate.com/en/articles/13272760-supported-payment-methods-paypal-wise-bank-transfer-crypto-and-more

Operational conclusion: the Setmore task is now narrow: **verify/update PayPal in the existing Setmore Tapfiliate account**. Do not substitute Payoneer unless Setmore itself changes the payout instructions.

## 4. MailerLite / Trackdesk / Tipalti

First-party MailerLite email confirms Miloosh is fully set up as a MailerLite affiliate and can promote using custom referral links from its Trackdesk partner dashboard.

Current official MailerLite documentation resolves the previously unattributed Tipalti task:

- MailerLite affiliate payouts are processed through **Tipalti**;
- Tipalti is integrated directly into Trackdesk, so MailerLite says no separate payout account needs to be created;
- available payout methods are **PayPal, Direct Deposit, and Wire Transfer**;
- commissions have a 30-day hold;
- payout eligibility requires at least **$100 Open Balance** generated from at least **2 unique paying referrals**;
- when eligibility is met, billing details are complete, and a valid payout method is selected, settlements are processed automatically on Fridays;
- MailerLite states that it covers PayPal transaction fees, while Direct Deposit and Wire Transfer fees are borne by the affiliate.

Official sources:

- https://www.mailerlite.com/affiliate
- https://www.mailerlite.com/help/guide-to-affiliate-payouts-and-commissions
- https://www.mailerlite.com/legal/affiliate-program-terms

Operational conclusion: `complete Tipalti` means **inspect MailerLite Trackdesk Billing/Tipalti and complete it only if the dashboard shows missing fields**. Do not create a mystery second Tipalti account.

## 5. Existing Payoneer asset

First-party Payoneer email dated 2026-08-23 confirms the account is ready to receive Payoneer payments and a USD receiving account exists.

This makes Payoneer useful only where the paying network explicitly supports it. No Payoneer credential, customer identifier, receiving-account number, or other financial identifier is stored in this repository.

## 6. CJ — optional, with official Payoneer support

Two CJ publisher CIDs remain evidenced and must not be merged/deleted blindly:

- CID 8043935 — `lahman00@gmail.com`
- CID 8048091 — `hello@miloosh.com`

First-party CJ email dated 2026-08-23 proves **payment information was changed on CID 8043935**. That is evidence of payment-setup activity, not proof that the account is fully payout-ready or that it should be canonical.

CJ's current publisher page states that publishers can be paid by direct deposit or through CJ's global payments partner, **Payoneer**. Therefore Miloosh's existing Payoneer account is a legitimate CJ payout option if the live CJ account exposes/accepts that connection. Timing alone does not prove linkage.

Official sources:

- https://www.cj.com/publisher
- https://junction.cj.com/article/global-innovation-payoneer

CJ remains isolated to vendors whose current official publisher path genuinely requires it. Current owner-action scope is intentionally limited to **1Password and QuickBooks**. Do not create a third CJ account.

## Minimal owner action target

The end state is now exactly these account-level checks:

1. **PartnerStack / hello@miloosh.com** — verify one payout provider.
2. **PartnerStack / lahman00@gmail.com** — independently verify one payout provider for monday.com, WhatConverts and ElevenLabs.
3. **Impact.com** — verify one finance/tax profile and payout method for Shopify/Wix/Omnisend.
4. **Setmore/Tapfiliate** — verify/update PayPal.
5. **MailerLite Trackdesk/Tipalti** — complete Billing only if missing.
6. **CJ, optional** — reconcile the two existing CIDs only when pursuing 1Password/QuickBooks.

Everything else should be handled as network/account-level operational state, not repeated vendor-by-vendor setup.

## Safety / truth rules

- Never store bank account numbers, card numbers, tax IDs, Payoneer identifiers, passport/ID numbers, passwords, 2FA codes or payout-provider secrets in this repository.
- Never mark `PAYOUT_READY` merely because an affiliate relationship is active.
- Never infer that a payout method configured in one PartnerStack account applies to another PartnerStack account.
- Never infer a payout method from a network's generic support matrix; verify the method actually enabled for Miloosh.
- Never create duplicate network accounts to solve an unknown payout state.
- A real payment-received event remains the strongest proof that a rail works end to end.
