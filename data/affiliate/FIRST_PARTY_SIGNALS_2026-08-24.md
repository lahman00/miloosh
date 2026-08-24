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

## Freshworks — unresolved canonical contradiction

The current canonical ledger entry is internally contradictory:

- `status: "REJECTED"`
- `statusUpdatedAt: "2026-08-24"`
- `decisionAt: "2026-08-24"`

but the same record still says:

- evidence: application received / Gmail confirmation
- eligibility: `Publisher application submitted`
- notes: `Awaiting vendor decision`

A Gmail search on 2026-08-24 found only the first-party PartnerStack submission message (`Your Application to join Freshworks`, received 2026-08-19) and **no first-party decline/rejection message** for Freshworks/Freshdesk/Freshsales.

Therefore `REJECTED` is not independently supportable from the currently available first-party evidence. Do not propagate the rejected state into more derived files until the actual decision evidence is found. Equally, do not silently revert it to pending without checking whether the missing decision came from another first-party source outside Gmail. This record needs explicit reconciliation.

## `hello@miloosh.com` outbound identity

Current Gmail evidence contains inbound mail to `hello@miloosh.com`, but a Sent search found no message whose actual From identity is `hello@miloosh.com`. Recent Miloosh business messages were sent from `lahman00@gmail.com`.

Treat send-as as unresolved until a real sent message proves the business From identity works. Do not infer completion from incoming delivery alone.

## Evidence discipline

These signals are deliberately separated into three classes:

1. **Relationship truth** — e.g. Close is active and its exact referral URL is re-confirmed.
2. **Acquisition opportunity** — e.g. Trainual sent a direct invite but is not yet accepted/active.
3. **Performance signal** — e.g. KrispCall crossed a 10+ click network milestone, with no conversion or revenue claim.

Never promote one class into another without new first-party evidence.
