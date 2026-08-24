# First-party affiliate signals — 2026-08-24

This file records first-party network/vendor evidence observed on 2026-08-24. It is evidence only: it must not silently change editorial rankings, partner activation, or conversion/revenue claims.

## KrispCall — network click milestone

- Source: email from `affiliate@krispcall.com`, delivered to `hello@miloosh.com` on 2026-08-24.
- Subject: `Your KrispCall Communications Inc. link is getting some activity!`
- First-party PartnerStack/KrispCall statement: the Miloosh referral link reached **10+ clicks**.
- Canonical referral URL remains `https://try.krispcall.com/aikpbrrrl8k9`.
- Interpretation: verified network-side click activity exists. **No sale, customer, commission, payout, or revenue is evidenced by this email.** Do not convert this milestone into a conversion/revenue claim.
- QA caveat: PartnerStack's milestone email does not identify whether individual clicks were human, QA, or otherwise; Miloosh's own `isTest` telemetry must remain separate from network-side totals.

## Trainual — direct PartnerStack invitation

- Source: email from `tom.h@trainual.com`, delivered to `hello@miloosh.com` on 2026-08-24.
- Subject: `You'd be a great fit for this`.
- Trainual describes its PartnerStack affiliate program and supplied a direct invite path:
  `https://dash.partnerstack.com/invite/0a4fcf940e5b4a6a9278f868544f1d7b`
- This upgrades the acquisition evidence from a generic public join path to a vendor-sent invitation.
- It **does not** prove acceptance or an active partnership. If PartnerStack authentication is still required, the existing owner-login blocker remains valid.
- Do not mark Trainual pending/active until the invite is accepted/submitted and the resulting first-party state is observed.

## Close — partnership and referral URL re-confirmed

- Source: email from `michael.taylor@close.com`, delivered to `hello@miloosh.com` on 2026-08-24.
- Subject: `Getting Listed + Value From Your Close Partnership`.
- Close explicitly provided the Miloosh referral URL again:
  `https://refer.close.com/0alqdg4so8rm`
- Close also invited Miloosh to apply for its Partner Directory (`https://partners.close.com/get-listed/form`).
- This corroborates the existing ACTIVE Close relationship and exact referral URL already stored in the canonical ledger/active registry.
- Directory listing is a distribution opportunity, not evidence that a directory listing already exists.

## CJ — dual-account evidence refresh

First-party CJ emails currently prove two distinct publisher accounts:

- `CID 8043935` — tied to `lahman00@gmail.com`; first-party account-change mail exists from 2026-08-14, and a payment-information change notification was sent on 2026-08-23.
- `CID 8048091` — tied to `hello@miloosh.com`; first-party signup/configuration/account-change mail exists from 2026-08-19/20.

No advertiser approval/relationship email was found in the current Gmail search set for either CID. Therefore:

- do not create a third CJ account;
- do not choose a canonical CID merely because one is newer or uses the business mailbox;
- do not delete/merge/deactivate either account;
- compare live advertiser relationships, issued links, tax/payment readiness, and historical performance before choosing the canonical account.

## Freshworks — false rejection traced and operationally corrected

Freshworks/Freshdesk/Freshsales have only first-party submission evidence in the connected Gmail account. The latest matching message is `Your Application to join Freshworks`; no first-party decline/rejection message was found on 2026-08-24.

Repository history identifies the source of the contradictory rejection: commit `e4238c25b7646af22078e6278708357c3c10f663`, titled `fix: record Help Scout application decline`, changed the Freshworks ledger enum from `PENDING_REVIEW` to `REJECTED` and set a decision date while leaving Freshworks evidence/eligibility/notes in their pending state. The subsequent merge carried that accidental mutation. The immediately earlier affiliate-truth merge explicitly described its work as `classify ClickUp rejection without changing Freshworks`.

Verified operational interpretation as of 2026-08-24: **Freshworks is PENDING_REVIEW, not verified rejected.**

The following executable status consumers were reconciled to that evidence on 2026-08-24:

- `scripts/growth/canonical-affiliate-reconciliation.ts`
- `scripts/growth/pending-program-readiness.ts`
- `lib/growth-audit/monetization-gaps.ts`
- `lib/growth-audit/category-money-map.ts`
- `tests/lib/canonical-affiliate-reconciliation-current-truth.test.ts`

The raw canonical record was surgically repaired by commit `f406aad69d53bd18a8dd79781a702cca2d571bd2`: `status=PENDING_REVIEW`, `statusUpdatedAt=2026-08-20`, and `decisionAt=null`. The temporary one-shot workflow deleted itself after targeted affiliate-integrity tests and TypeScript verification passed. Freshworks now has one consistent source-of-truth state.

## `hello@miloosh.com` outbound identity

The connected Gmail profile is `lahman00@gmail.com`. Gmail contains inbound mail addressed to `hello@miloosh.com`, but a Sent search found no message whose actual From identity is `hello@miloosh.com`; recent Miloosh business messages were sent from `lahman00@gmail.com`.

Treat send-as as **not yet verified/configured through the connected Gmail identity**. Incoming forwarding proves receipt, not outbound From authorization. A real sent message with `From: hello@miloosh.com` is required before this task can be marked complete.

## Buffer — key creation evidence and code contract

First-party Buffer email shows two API-key creation notifications on 2026-08-19 for the Miloosh Buffer account. The emails instruct that keys remain private and can be revoked/regenerated from Buffer API Settings; they do not expose the secret value in Gmail.

Current Miloosh code uses server-only variables:

- `SOCIAL_LINKEDIN_BUFFER_API_KEY`
- `SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID`
- `LINKEDIN_TRANSPORT=buffer`

The adapter requires the API key to support account/channel read plus post read/write behavior and verifies that the configured target resolves to a LinkedIn **Company Page**, not a personal profile. No secret value should ever be committed or copied into evidence files.

A replacement cannot be performed from Gmail alone because the secret key value is not included in the notification email. Do not invent or recover it from logs.

## Tipalti / payout onboarding — no attributable first-party evidence found

A Gmail search on 2026-08-24 for `Tipalti` returned zero messages. Broader recent searches for affiliate payout/tax/payment onboarding found PartnerStack guidance and CJ payment-information notices, but no Tipalti-branded onboarding or payee invitation that can be safely tied to a Miloosh partner/network.

Therefore the owner-task label `complete Tipalti` is currently **unattributed** in the available first-party evidence. Do not guess which network/program it belongs to or ask for banking/tax data until a real Tipalti invitation/dashboard context identifies the payer and required onboarding step.

## Pending-program decision sweep

A targeted Gmail sweep on 2026-08-24 for Freshworks, FreshBooks, Amplitude, Toggl and CallRail found only submission/application-received evidence for the matching programs; no new approval/decline decision was found. Continue to represent those programs as pending unless newer first-party evidence appears.

## Evidence discipline

These signals are deliberately separated into three classes:

1. **Relationship truth** — e.g. Close is active and its exact referral URL is re-confirmed.
2. **Acquisition opportunity** — e.g. Trainual sent a direct invite but is not yet accepted/active.
3. **Performance signal** — e.g. KrispCall crossed a 10+ click network milestone, with no conversion or revenue claim.

Never promote one class into another without new first-party evidence.
