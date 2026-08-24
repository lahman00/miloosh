# Affiliate revenue map — verified state

Updated: 2026-08-24

This is the compact operational map. It is deliberately derived from the canonical sources rather than preserving historical counts that drift:

- relationship truth: `data/affiliate/canonical-ledger.ts`
- publicly activatable partners + exact URLs: `data/affiliate/active-partners.ts`
- first-party same-day signals: `data/affiliate/FIRST_PARTY_SIGNALS_2026-08-24.md`
- detailed historical materials audit: `data/affiliate/partner-materials-audit.ts`

If this document conflicts with the canonical ledger or active registry, the canonical source wins.

## Canonical active registry — 19 verified active partners

Every partner below has an exact canonical affiliate/referral URL in `active-partners.ts`; none is active merely because a network badge, public program page, or generic signup URL exists.

| Partner | Software route | Exact affiliate URL in registry | Operational status |
|---|---|---:|---|
| Constant Contact | `/software/constant-contact` | Yes | ACTIVE |
| Todoist | `/software/todoist` | Yes | ACTIVE |
| Moosend | `/software/moosend` | Yes | ACTIVE |
| Volza | `/software/volza` | Yes | ACTIVE |
| Pipedrive | `/software/pipedrive` | Yes | ACTIVE |
| GetResponse | `/software/getresponse` | Yes | ACTIVE |
| Airtable | `/software/airtable` | Yes | ACTIVE |
| monday.com | `/software/monday` | Yes | ACTIVE |
| WhatConverts | `/software/whatconverts` | Yes | ACTIVE |
| ElevenLabs | `/software/elevenlabs` | Yes | ACTIVE |
| KrispCall | `/software/krispcall` | Yes | ACTIVE |
| Setmore | `/software/setmore` | Yes | ACTIVE |
| Hubstaff | `/software/hubstaff` | Yes | ACTIVE |
| Close | `/software/close` | Yes | ACTIVE |
| Shopify | `/software/shopify` | Yes | ACTIVE |
| Wix | `/software/wix` | Yes | ACTIVE |
| MailerLite | `/software/mailerlite` | Yes | ACTIVE |
| Omnisend | `/software/omnisend` | Yes | ACTIVE |
| SurveyMonkey | `/software/surveymonkey` | Yes | ACTIVE |

### Activation rules

- A public program claim is not an approval.
- An approval without an exact personal tracking URL is not publicly activatable.
- Affiliate economics do not change editorial ranking or verdicts.
- Setmore remains organic-only: no paid media/PPC/brand or non-brand ads under its verified program restriction.
- Wix intent-specific tracking URLs remain separate; the active registry contains the canonical general website-builder CTA.

## Current first-party performance evidence

### KrispCall

On 2026-08-24 KrispCall/PartnerStack sent a first-party email stating that the Miloosh referral link reached **10+ network-side clicks**.

This is a verified activity milestone, **not** a conversion or revenue event. No sale, customer, commission, payout, or revenue amount is evidenced by that message. PartnerStack's email also does not classify individual clicks as human vs QA, so Miloosh's internal `isTest` telemetry remains the source for real/test separation on Miloosh-side click reporting.

## Current acquisition opportunities / blockers

### Trainual

Trainual sent Miloosh a direct PartnerStack invitation on 2026-08-24. Exact invite path is recorded in `FIRST_PARTY_SIGNALS_2026-08-24.md`.

This improves the acquisition path but does not equal acceptance. PartnerStack authentication remains owner-only if the invite requires login; do not mark Trainual pending or active until a real submitted/accepted state is observed.

### Gorgias

Still `OWNER_ACTION_REQUIRED`: the application asks for Miloosh's own audience/traffic tier and agency/reseller/publisher profile representation. Those fields must not be fabricated. Once the owner is authenticated in PartnerStack, use truthful publisher/content-site facts only.

### CJ

Two separate first-party CIDs are verified:

- `8043935` — `lahman00@gmail.com`
- `8048091` — `hello@miloosh.com`

Do not create a third account. Do not select a canonical CID, delete, merge, or deactivate either account until live advertiser relationships, issued links, tax/payment readiness, and any historical performance are compared. The owner action pack now reflects this reconciliation task rather than the stale instruction to register another CJ account.

### `hello@miloosh.com` outbound identity

Incoming mail to the business address is active, but the connected Gmail evidence contains no Sent message whose actual From identity is `hello@miloosh.com`; recent business replies were sent from the personal Gmail identity. Treat business-mail send-as configuration as still unresolved until a real sent message proves otherwise.

## Known state corrections that must not regress

- **Help Scout — REJECTED (2026-08-24):** canonical ledger status was fixed after its narrative evidence had already documented the decline. Never show it as pending/active without new first-party evidence.
- **ClickUp — REJECTED:** do not show as pending/active without new first-party evidence.
- **Brevo — REJECTED:** stale PartnerStack top-level badge does not override the program-level decline evidence.
- **Close — ACTIVE:** exact URL re-confirmed by Close on 2026-08-24.
- **MailerLite / Omnisend / SurveyMonkey — ACTIVE:** activated only after exact owner-supplied URLs were obtained and verified.

## Revenue observability rule

Internal affiliate-click summaries must separate QA/test traffic from real traffic. `isTest` clicks remain visible but must not inflate real affiliate-click totals. Network-side milestone emails and Miloosh-side event telemetry are different evidence sources and must not be silently merged.

## Priority policy

1. Preserve and improve buyer-intent surfaces already connected to verified active partners.
2. Follow actual demand evidence (GSC/real traffic) before creating new affiliate-driven editorial pages.
3. Advance vendor-sent opportunities such as Trainual only when their real account/application state can be observed.
4. Resolve owner-only infrastructure that directly blocks money: CJ account reconciliation, PartnerStack authentication/profile fields, payout/tax setup, and `hello@miloosh.com` send-as.
5. Rejected/uncertain relationships receive no activation work without new first-party evidence.

No CTA, ranking, comparison verdict, or public recommendation is authorized solely by this document.
