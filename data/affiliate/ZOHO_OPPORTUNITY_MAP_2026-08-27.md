# Zoho affiliate opportunity map — 2026-08-27

Evidence-based execution record for the Zoho affiliate sprint. Companion to
the `zoho-ecosystem` entry in `data/affiliate/canonical-ledger.ts`. Every
figure below is either directly observed in the repository (comparison
counts, active-partner list) or from a live-verified Zoho source (dated
2026-08-27); nothing is estimated search volume.

## Phase 1-2: current state and terms (see canonical-ledger.ts for the full record)

**State: OWNER_ACTION_REQUIRED** (application drafted, not submitted).
Zoho's own signup form requires phone-number SMS verification and a
CAPTCHA — both genuinely require the owner, not an agent. Every other
field was filled with real, truthful information in a live browser session
on 2026-08-27; the session did not persist, so re-entry is needed (~2
minutes) before the owner completes the phone/CAPTCHA step. The
previously-recorded "requires a password" blocker was verified stale and
incorrect — the live form has no password field at signup.

**Terms confirmed to materially match Hari's summary**, with real
additions found in the live FAQ/signup form that Hari did not mention:
- 60-day "stickiness" period before commission accrues (a referral must
  remain a customer 60 days, separate from the 90-day signup/purchase
  windows Hari described).
- $25,000 commission cap per single deal.
- The referred customer must sign up in the same Zoho data center the
  affiliate is registered in, or the sale does not qualify.
- Payout currency follows the referred customer's payment currency, not
  the affiliate's home currency (except INR).
- ~15 days from payout request to bank reflection.

None of these are a materially new *obligation* on Miloosh (they clarify
Zoho's payout mechanics, not a new duty Miloosh takes on), so Phase 2's
stop condition was not triggered — but they are recorded because Hari's
summary did not include them and the application/internal expectations
should reflect the real terms, not the abbreviated ones.

## Phase 5: partner-readiness spot check (live production, 2026-08-27)

All 5 existing Zoho pages return 200, carry the Affiliate Disclosure link,
correct `<title>`/canonical tags, and no placeholder/lorem-ipsum/TODO
content found. `zoho-books` is on the current extended pricing schema
(`last_verified: 2026-08-20`); `zoho-crm`, `zoho-projects`, `zoho-desk`,
`zoho-flow` are still on the older 3-field pricing schema (`accessed_at:
2026-08-04`) — the basic starting price still renders on these pages, but
they lack the newer tier/free-trial detail. Not a functional defect;
flagged as a real, ready-to-execute content-freshness follow-up, most
valuable on `zoho-crm` given it's the highest-comparison-count product
(see below).

## Phase 6: product opportunity scoring

Six candidate NEW Zoho products evaluated (in addition to the 5 already
covered) against real evidence: existing Miloosh active-partner overlap
(a real, measurable proxy for both commercial fit and immediate two-sided
monetization potential), and whether the product is a current, real
Zoho offering. Search-volume numbers are not published here — none were
measured; qualitative demand is inferred only from category maturity and
the number of real competitors Miloosh already covers editorially.

| Candidate | Active-partner overlap (real, from `active-partners.ts`) | Existing Miloosh competitor coverage in category | Qualitative assessment | Priority |
|---|---|---|---|---|
| **Zoho Campaigns** (email marketing) | GetResponse, MailerLite, Omnisend, Constant Contact, Moosend — **5 active partners** | Strong — all 5 already have real Miloosh pages | Highest real overlap of any candidate; every comparison would be two-sided-monetizable the moment Zoho tracking goes live | **1 (highest)** |
| **Zoho Forms** / **Zoho Survey** | SurveyMonkey — 1 active partner | SurveyMonkey already covered (vs Typeform, Jotform, Qualtrics) | Real but narrower overlap than Campaigns; forms and survey are arguably two separate Zoho products worth checking individually before committing to one page | 2 |
| **Zoho Analytics** | None direct (WhatConverts is call-tracking/attribution, adjacent not equivalent) | Weak | Real product category (BI/reporting) but no direct active-partner comparison angle found | 3 |
| **Zoho Invoice** | None direct (zoho-books already covers invoicing-adjacent ground) | Weak — would likely cannibalize zoho-books content rather than add new value | Lower priority; zoho-books already serves this buyer intent | 4 |
| **Zoho Mail / Zoho Meeting / Zoho People / Zoho Recruit / Zoho Social / Zoho Creator / Zoho One** | None found among current active partners | Not evaluated in depth | No evidence-backed case for prioritizing any of these over Campaigns/Forms right now | Not prioritized this pass |

**Recommendation: Zoho Campaigns is the clear next product to add**, not on
a guessed keyword list but because it is the one candidate with real,
already-published Miloosh competitor content on 5 different active
affiliate partners simultaneously.

## Phase 7: first money clusters (existing coverage, not new pages)

Because Miloosh already has deep comparison coverage on all 5 current
Zoho products, the first "money clusters" are **already built and live**
— they just need Zoho's own CTA activated once tracking exists. No new
content is required to realize them:

1. **Zoho CRM** — 9 real comparisons already published (HubSpot,
   Salesforce, Pipedrive, Copper, Freshsales, Keap, Nutshell, Close,
   GoHighLevel).
2. **Zoho Projects** — 11 real comparisons (Asana, monday, Wrike, ClickUp,
   Trello, Jira, Linear, Basecamp, Shortcut, Smartsheet, Teamwork).
3. **Zoho Desk** — 12 real comparisons (Freshdesk, Help Scout, Zendesk,
   Crisp, Front, Gorgias, HappyFox, Intercom, Kayako, LiveAgent, Reamaze,
   Tidio).
4. **Zoho Flow** — 9 real comparisons (Zapier, Make, Pipedream, n8n, IFTTT,
   Power Automate, Tray.ai, UiPath, Workato).
5. **Zoho Books** — 4 real comparisons (QuickBooks Online, Xero,
   FreshBooks, Wave).

The one genuinely new cluster worth building, per Phase 6's scoring, is
**Zoho Campaigns** (review, pricing, alternatives, and comparisons against
the 5 overlapping active partners below).

## Phase 8: two-sided monetization with existing active partners

Real, already-published comparison pages where an ACTIVE Miloosh affiliate
partner is already on one side. These become two-sided-monetized the
moment Zoho tracking is live, with zero new content work:

| Comparison (live today) | Zoho side | Active-partner side |
|---|---|---|
| `zoho-crm` vs `pipedrive` | Zoho CRM | Pipedrive (ACTIVE) |
| `zoho-crm` vs `close` | Zoho CRM | Close (ACTIVE) |
| `zoho-projects` vs `monday` | Zoho Projects | monday.com (ACTIVE) |
| `zoho-projects` vs `wrike` | Zoho Projects | Wrike (ACTIVE) |

If Zoho Campaigns is built (Phase 6/7), it would add up to 5 more
two-sided-monetized comparisons (vs GetResponse, MailerLite, Omnisend,
Constant Contact, Moosend) — the single highest-leverage content
investment identified in this sprint.

No comparison was force-created to hit a monetization target — every pair
above already existed in the real, editorially-built comparison graph
before this sprint; this phase only identified which of them are
commercially doubled-up.

## Phase 9-10: content quality and fact verification

Existing Zoho pages already follow Miloosh's standard decision-focused
format (Top alternatives, Why consider another option, How to choose,
Pricing, FAQ, Sources) — confirmed on `zoho-crm` via live inspection, no
generic "both are powerful platforms" filler found. `zoho-books`'s pricing
is current (`last_verified: 2026-08-20`); the other four should be
refreshed against Zoho's own current pricing pages before or shortly
after tracking goes live — flagged as a concrete follow-up, not executed
in this pass to keep this sprint focused on the affiliate-activation path
per the mission's own "do not create SEO garbage / do the smallest
coherent set of excellent pages" instruction.

## Phase 11: data model

No new parallel data model was created. Zoho products already use
Miloosh's canonical `data/software/*.json` schema and the canonical
affiliate ledger — extending both, not duplicating them, matches the
existing architecture for every other Miloosh partner.

## Phase 12: affiliate link fail-closed rule

**No Zoho tracking URL exists anywhere in this codebase.** Confirmed by
search before this sprint began. `affiliateUrl: null` in the ledger entry
remains null. Nothing was fabricated, guessed, or appended as a tracking
parameter. Existing Zoho software pages link to Zoho's ordinary official
URLs for editorial sourcing only, with no affiliate framing — correct,
matches Miloosh's own fail-closed pattern already used for every other
not-yet-approved partner this session.

## Phase 19: internal briefing for the Zoho meeting (prepared, not sent)

**Miloosh in 30 seconds:** An independent software research and
comparison platform — comparison pages, alternatives, decision guides, and
product research to help business buyers choose software.

**Audience:** Business software buyers researching CRM, project
management, help desk, email marketing, and adjacent categories via
organic search and direct comparison queries (verified: real GSC
impression/click data exists per Miloosh's own SEO Factory; exact figures
not restated here to avoid quoting a stale snapshot in a document meant to
last).

**Content model:** Comparisons, alternatives pages, decision guides —
already covering 5 Zoho products with 45 real comparison pages combined
(9+4+11+12+9).

**Why Zoho:** Real, already-built editorial overlap with 4 currently
active Miloosh affiliate partners (Pipedrive, Close, monday, Wrike) across
CRM and project management, plus a clear fifth cluster (Campaigns)
overlapping 5 more active partners in email marketing.

**Initial coverage plan:** Activate tracking on the 5 existing Zoho
product pages first (zero new content needed); build Zoho Campaigns next
given its 5-partner overlap.

**Promotion method:** Organic commercial-intent content only — no paid
search, no incentivized clicks, no coupon/deal-site distribution.

**Compliance:** Standard Miloosh affiliate disclosure on every monetized
page; no reproduction of Zoho's own marketing materials, case studies, or
testimonials as Miloosh's own; pricing sourced and dated per page.

**Questions for Zoho** (do not send unless asked): Is attribution
last-click? Are deep links available for all 5 products we'd start with?
Any product-specific commission exclusions? Are annual vs monthly plans
treated differently for the 60-day stickiness clock? How are
upgrades/downgrades mid-window handled beyond the FAQ's general answer?
Can one affiliate account promote multiple Zoho products under one
tracking setup? Are comparison screenshots of the Zoho product UI
permitted? Any country-specific restriction relevant to an Israel-based
affiliate beyond the data-center-matching rule already found? What
payout/tax onboarding does an Israel-based affiliate need for wire/PayPal?

## Phase 20: payout practicality

**Classification: PAYOUT SETUP REQUIRED** (not blocked — real, known paths
exist; not yet verified end-to-end because the account doesn't exist yet).

- Israel: confirmed selectable as both country and phone country code on
  the live signup form; no exclusion found in the FAQ.
- PayPal: Zoho's own FAQ lists it as a preferred payout method; PayPal
  operates in Israel — no blocker expected, not independently re-verified
  this pass.
- Wire transfer: also Zoho-preferred; standard beneficiary/bank details
  would be needed at payout time, not signup time.
- Threshold: $100 (or INR 4,000) unpaid commission before a payout can be
  requested — low, not a practical barrier.
- **Real nuance, not a blocker:** payout currency follows the *referred
  customer's* payment currency (except INR), not the affiliate's home
  currency — an Israel-based affiliate could receive USD, EUR, GBP, etc.
  depending on which customers convert. Worth the owner knowing before
  the first payout arrives in an unexpected currency.
- Tax documentation requirements were not found in the FAQ content
  retrieved this pass — genuinely unknown, flagged rather than guessed;
  likely requested during onboarding once approved, standard for
  US-headquartered affiliate programs paying international affiliates.

This does **not** repeat the PartnerStack pattern (an account created and
believed active while payout was actually unverified/declined) — no Zoho
account exists yet at all, so there is nothing to falsely mark ready.

## Phase 4: draft reply to Hari (PREPARED, NOT SENT)

Not sent — authoritative evidence does not yet confirm submission (blocked
on phone/CAPTCHA, see Phase 1 above). Ready to send in the *existing*
thread the moment the owner completes and submits the real form:

> Hi Hari,
>
> Following up in this thread: we've submitted the Zoho Affiliate Program
> application for Miloosh (miloosh.com).
>
> We're ready whenever you'd like to set up the evaluation/onboarding
> meeting you mentioned.
>
> Thanks,
> Eyal

Deliberately short, makes no approval claim, does not pressure, matches
the mission's explicit instruction to confirm submission and readiness
only.
