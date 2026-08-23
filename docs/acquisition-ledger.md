# Acquisition Ledger

MILOOSH PEOPLE NOW mission (2026-08-23). The canonical record of every
distribution channel and asset Miloosh has, or could have, for acquiring real
human visitors — what's live, what's ready, what's blocked, and why. Real
performance numbers are pulled from the existing analytics/classification
system (`lib/analytics/human-classification.ts`) and the social queue
(`lib/social/queue.ts`), not duplicated into a second database here — this
document is the operator's map, not a second source of truth for numbers that
already have one.

Update this file when a channel's status changes (activated, blocked,
deprioritized) — not on every post. Per-post/per-lead numbers belong in
`scripts/analytics/report.ts`'s output, which stays live and queryable;
copying them here would go stale immediately.

## Channel status

| Channel | Status | Real evidence | Blocker |
|---|---|---|---|
| Facebook | **ACTIVE** | 8 posts published (2026-08-17 to 2026-08-23), 1/day cadence. 2 of 8 produced any attributed traffic (1 UNRESOLVED, 6 STRONG_HUMAN_EVIDENCE from the CircleCI post). 6 of 8 produced zero attributed clicks. | None — working, real credential, real posts. |
| LinkedIn | OWNER_BLOCKED | 0 posts (channel disabled at publish time). | Missing `SOCIAL_LINKEDIN_ACCESS_TOKEN`. Content is generated and queued; publishing activates immediately once the token is set. |
| X / Twitter | DISABLED (deliberate) | — | Disabled in `data/social/social-strategy.json`. No credential investigated this mission — not reconsidered without a real reason to. |
| Bluesky | DISABLED (deliberate) | — | Same as X — disabled in strategy config, no credential on file. |
| Mastodon | DISABLED (deliberate) | — | Same. |
| Threads | DISABLED (deliberate) | — | Same. |
| Reddit | OWNER_ACTION_REQUIRED | — | Automation intentionally not built (this codebase's own design: manual, per-subreddit human review only — real communities enforce no-self-promo rules that need human judgment, not scripted posting). No Miloosh Reddit account exists. See "Reddit/Q&A research" below for prepared, unposted candidates. |
| Pinterest | DEFERRED | — | Requires a real per-post image pipeline Miloosh doesn't have; gated behind a Trial-access review even before that. |
| YouTube | DEFERRED | — | Requires actual video production, a fundamentally different pipeline than text/image posts. |
| Instagram | DEFERRED | — | Requires a Business/Creator account, Meta App Review, hosted JPEG images — not a text/link-first platform anyway. |
| Quora | NOT ATTEMPTED THIS MISSION | — | No account. See "Reddit/Q&A research" below for the same treatment applied here. |
| Product Hunt | NOT READY | — | See "Launch readiness" below. |
| Directories (startup/SaaS/tool lists) | RESEARCHED, NOT SUBMITTED | — | Some legitimate targets are free but require an account; Launching Next has a direct free submission form. See "External acquisition reconnaissance" below. |
| RSS feed | **ACTIVE** | Live at `/feed.xml`, 30 most-recently-verified software pages, real dated content. | None. |
| SaaS Stack Cost Calculator | **ACTIVE** | Live at `/tools/saas-cost-calculator`, 59 real-priced products, shareable URL state. | None. |
| Email capture | **ACTIVE (capture only)** | Live signup form on `/newsletter` and the calculator tool; leads stored with full attribution. | No email provider configured (checked: no RESEND/SENDGRID/MAILCHIMP/POSTMARK/SES env var) — actual sending (welcome email, weekly brief) needs the owner to add one. Zero leads lost waiting for it. |
| Share buttons | **ACTIVE** | Live on software and comparison pages (native Web Share API / copy-link fallback). | None. |

## Facebook — what the evidence actually says

Per-post attribution (via real `utm_content` matching each queue entry's ID,
joined against `lib/analytics/human-classification.ts`'s session buckets):

| Post | Published | Attributed sessions | Classification |
|---|---|---|---|
| alternatives-circleci | 2026-08-23 09:00 UTC | 6 | STRONG_HUMAN_EVIDENCE |
| category-cms | 2026-08-21 17:00 UTC | 1 | UNRESOLVED |
| alternatives-notion | 2026-08-17 18:36 UTC | 0 | — |
| alternatives-contentful | 2026-08-18 17:01 UTC | 0 | — |
| migration-sentry-vs-snyk | 2026-08-19 17:01 UTC | 0 | — |
| research-bloomfire-2026-08-04 | 2026-08-20 17:00 UTC | 0 | — |
| commercial-close-chloe-ai-agent | 2026-08-22 07:06 UTC | 0 | — |
| migration-cost-is-real | 2026-08-22 17:00 UTC | 0 | — |

**Honest read:** this is 1 real success out of 8, not a proven "Facebook
works" or "alternatives posts work" pattern — n=8 is too small to generalize
from, and two other "alternatives" posts (Notion, Contentful) got zero clicks
while the CircleCI one got 6. The most defensible read is "post reach on a
brand-new page's tiny follower base is inherently noisy," not a content-type
finding. Continue publishing at the existing safe cadence and keep
re-measuring — do not conclude "topic X works" from one data point.

## Reddit/Quora research — prepared, not posted (no account exists)

Read-only research only. No account was created, no login attempted, no post
made — per the standing rule against creating accounts/personas without
explicit owner action. Candidate opportunities identified for the owner to
post manually if they choose:

- **r/SaaS, r/sysadmin, r/devops** — recurring "CircleCI alternatives"/CI-CD
  tool threads exist with real buyer-intent questions; Miloosh's
  `/software/circleci` page (the one page with proven real Facebook
  traction) has directly relevant, sourced content. A genuinely useful,
  non-promotional answer citing specific real facts (not a bare link) would
  fit these communities' norms — but posting requires a real Reddit account
  and human judgment about each thread's current rules/mod tone, which this
  session cannot do.
- **r/smallbusiness, r/Entrepreneur** — recurring "what CRM should I use"
  threads where Miloosh's Pipedrive/HubSpot/Close comparison content is
  relevant.

No content was drafted verbatim for these — per Rule Zero, doing so without
the ability to actually post (and adapt to the live thread's specific
context) would be premature; the owner posting manually needs to read the
actual thread, not a canned reply.

## Launch readiness — Product Hunt and similar

**Not ready.** A real assessment against Product Hunt's own norms:
- No real founder/maker profile prepared (would require the owner's own
  identity, not something this session can create).
- Real traffic is currently 858 tests passing but under 10 confirmed/strong
  real human visitors — a PH launch with near-zero existing audience to
  notify at launch time typically underperforms and can't be "relaunched"
  later without controversy.
- Recommendation: revisit once the email list and social following have
  enough real people to notify on launch day — a launch's value is
  concentrated in the first few hours' momentum, which needs a real
  existing audience to seed.

## Directory research — legitimate options found

Not every legitimate directory is equivalent and not every free directory is
worth time. Prefer sources with a real audience or durable discovery value.
Do not buy express-review or backlink packages at this stage.

## External acquisition reconnaissance — 2026-08-24

This section captures current external demand and distribution opportunities
verified outside the repository so the next execution agent can act without
repeating research.

### P0 buyer-pain hooks — evidence of current demand

These are **demand signals**, not permission to self-promote in the source
communities.

1. **Freshdesk free-plan exit pain — highest freshness.** A live r/sysadmin
   thread from 2026-08-18 has users actively asking what to replace Freshdesk
   with after receiving notice that their free plan is ending. Responses name
   Zammad, Znuny, LibreDesk, YouTrack, Spiceworks, GLPI, Help Scout and others.
   Acquisition asset: a verified "Freshdesk free plan ending — real
   alternatives by team size / hosted vs self-hosted / switching burden"
   page or calculator-backed comparison. Do not self-promote into r/sysadmin
   unless the current subreddit rules explicitly allow the specific reply.

2. **Notion AI pricing/limits backlash — high discussion intensity.** Multiple
   late-July/early-August 2026 r/Notion threads show substantial user concern
   around AI access and rolling/monthly usage limits. Acquisition asset:
   "Notion AI limits in 2026: what changed, what each plan actually includes,
   and when an external AI workflow is cheaper." Verify every plan/limit
   against current first-party Notion documentation before publishing.

3. **HubSpot cost-creep / migration intent.** Current 2026 discussions include
   small businesses explicitly saying HubSpot is becoming too expensive,
   with paid upgrades and annual contracts driving migration intent. Asset:
   "HubSpot getting too expensive? What to inventory before you migrate" plus
   seat/contact/add-on cost scenarios and migration checklist.

4. **Zapier cost fatigue.** Current automation-community discussions ask what
   people are moving to as Zapier costs rise, repeatedly surfacing Make, n8n
   and other alternatives. Best asset is not another listicle: build/use a
   cost comparison calculator with task-volume scenarios and maintenance
   tradeoffs, sourced from current vendor pricing.

### P0 PR / earned-media thesis

Do **not** pitch "Miloosh launched". The stronger editorial thesis is:

> SaaS pricing is becoming harder to budget as vendors combine seats,
> credits, usage, outcomes, AI allowances and contract constraints. Miloosh
> tracks the buyer-visible changes and their switching implications.

This is timely: 2026 coverage from Reuters, CIO/CIO Dive, The Information and
other enterprise-software outlets is already discussing AI-driven changes to
traditional per-seat SaaS economics, usage/outcome pricing, and cost
unpredictability. Miloosh should enter that existing conversation with
original data, not generic commentary.

**Highest-value build for PR:** `Miloosh SaaS Pricing Pressure Index 2026`.
Only publish metrics that can be reproduced from Miloosh's verified dataset.
Useful dimensions include:

- free tier present / removed / time-limited
- starting paid price
- per-seat vs flat vs usage/outcome pricing
- AI included vs add-on vs credit/usage pricing
- minimum-seat or annual-contract constraints
- last verified date
- documented pricing-change history when Miloosh has real prior evidence
- modeled monthly cost for 5 / 10 / 25 / 50-seat teams where mathematically
  valid

Every public statistic must include methodology, sample size, verification
window and source rules. If historical price evidence is incomplete, do not
pretend Miloosh has longitudinal history it does not have.

### Distribution strike list

| Priority | Channel | Current verified state | Action |
|---|---|---|---|
| P0 | **Launching Next** | Official submission form is free; manual review. Form asks for startup name, URL, 5–8 word headline, up to 2,500-char description, 5–10 tags, startup type, marketing-budget range, submitter name/email and a simple anti-spam check. Paid express review exists but is unnecessary. | Prepare/submit a free listing once owner/contact details are used legitimately. Position Miloosh as verifiable software research + SaaS cost calculator, not an affiliate directory. |
| P0 | **Uneed** | Product-launch platform; current third-party verification indicates a free/account-based launch path may exist, but sources conflict on current free vs paid queue terms. | Recheck the official submission UI immediately before acting. If free queue is available, submit the calculator/research product with screenshots and no paid boost. |
| P1 | **Tiny Startups** | Official 2026 terms confirm both free and paid submission tiers. Free submissions enter review queue; account required. | Owner account required. Use free path only; decline upsells. Best submission asset is the live SaaS cost calculator rather than generic Miloosh homepage. |
| P1 | **Product Hunt** | Free launch surface but requires real maker/founder identity/account and launch-day momentum. | Keep NOT READY until a meaningful seed audience exists; prepare assets only after calculator/newsletter has real users. |
| P1 | **Fazier / Peerlist / other launch boards** | Potential launch surfaces surfaced by current directory indexes, but official submission terms not yet reverified in this ledger. | Verify official terms before any submission; no paid placement without owner approval. |
| Avoid | Generic backlink farms / paid auto-submit services | Many sell 100+ directory submissions with little evidence of human discovery. | Do not buy. Human traffic and durable discovery outrank raw backlink count. |

### PR target classes to monitor

Prioritize people/outlets already publishing on:

- SaaS / AI pricing model changes
- software procurement and budget unpredictability
- AI credit/usage billing
- vendor lock-in and contract escape clauses
- software migration / switching economics
- CIO software-cost management

Strong pitch only after Miloosh has an original, reproducible data point. The
pitch should lead with the finding and methodology; Miloosh itself is the
source attribution, not the story.

### Asset-to-channel map

| Asset | Best first channels | Primary job |
|---|---|---|
| SaaS Stack Cost Calculator | Facebook, Launching Next, Uneed/Tiny Startups if eligible, founder communities | Click acquisition + email capture |
| Freshdesk free-plan / alternatives asset | Facebook, search, carefully selected helpdesk/sysadmin Q&A where rules allow | High-freshness buyer intent |
| Notion AI limits explainer | Facebook, Notion/productivity communities where transparent links are permitted, search | Current pricing/limits pain |
| Zapier cost comparison calculator | automation communities where tools/resources are allowed, search, launch directories | Linkable utility + buyer intent |
| SaaS Pricing Pressure Index | journalists, CIO/procurement newsletters, founder media, backlink outreach | Earned media + citations + backlinks |
| Weekly Software Brief | calculator/software-page visitors, future newsletter distribution | Retention + lead nurture |

### Execution rule

A new content asset is not complete until it has a distribution route and a
measurement route. For every asset, record the landing URL, UTM source/medium/
campaign/content where relevant, classified-human sessions, CTA exposure,
clickers, newsletter signups and affiliate clicks. Do not use raw pageviews or
bot-heavy traffic as acquisition success.
