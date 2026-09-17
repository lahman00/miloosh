# Acquisition Ledger

## עדכון מאומת — 17 בספטמבר 2026
גישה לנתוני Google עובדת דרך הממשק המחובר ויצוא CSV; חוסר תצורת API מקומית אינו חוסר גישה לדוח. ראיות: `docs/growth/ACQUISITION_EVIDENCE_20260917_HE.md`.
חבילת תוכן חדשה לפוסט היומי של החברה: `data/social/READY_STORE_DECISION_20260917.md`, מוכנה לבדיקה ולא פורסמה במסגרת ספרינט הקונים. המשימה היומית הקיימת נשארת בעלת הפרסום היחיד בכל רשת.
החשבון הקיים ברדיט אומת, אך כללי כל קהילה קובעים בנפרד. r/ecommerce אסר AI ולכן שימש למחקר בלבד. נתוני וסטטוס הערוצים ההיסטוריים בהמשך אינם תחליף לבדיקה עדכנית.

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
| LinkedIn company page | **ACTIVE** | Miloosh company publishing and direct company-identity comments are live through the authenticated browser workflow. Buyer-question-first posting is now the default. | Keep company cadence controlled and inspect the live page before each new company post to avoid duplicate automation/manual posts. |
| X / Twitter | DISABLED (deliberate) | — | Disabled in `data/social/social-strategy.json`. No credential investigated this mission — not reconsidered without a real reason to. |
| Bluesky | DISABLED (deliberate) | — | Same as X — disabled in strategy config, no credential on file. |
| Mastodon | DISABLED (deliberate) | — | Same. |
| Threads | DISABLED (deliberate) | — | Same. |
| Reddit | **RESEARCH ACTIVE / WRITES PAUSED** | Authenticated Miloosh Reddit browser/worker exists and buyer-intent research is active. Autonomous writes are currently disabled after a CAPTCHA event; the worker must not bypass it. | Continue thread discovery and response preparation. Resume writes only after the CAPTCHA/session issue is legitimately cleared, with per-subreddit rule review. |
| Pinterest | DEFERRED | — | Requires a real per-post image pipeline Miloosh doesn't have; gated behind a Trial-access review even before that. |
| YouTube | DEFERRED | — | Requires actual video production, a fundamentally different pipeline than text/image posts. |
| Instagram | DEFERRED | — | Requires a Business/Creator account, Meta App Review, hosted JPEG images — not a text/link-first platform anyway. |
| Quora | NOT ATTEMPTED THIS MISSION | — | No account. See "Reddit/Q&A research" below for the same treatment applied here. |
| Product Hunt | NOT READY | — | See "Launch readiness" below. |
| Directories (startup/SaaS/tool lists) | RESEARCHED, NOT SUBMITTED | — | Some legitimate targets are free but require an account; Launching Next has a direct free submission form. See "External acquisition reconnaissance" below. |
| Partnerships / advisor distribution | **ACTIVE** | Existing partner-visibility outreach is live; Pipedrive follow-up sent 2026-09-09. Target is agencies, consultants and operators who repeatedly influence software choice, not generic link exchanges. | Build a qualified pipeline and offer data/decision assets with a soft, problem-specific approach. |
| Bing / Microsoft Search organic | **ACTIVE VIA INDEXNOW** | Miloosh already has an IndexNow path and clean canonical/sitemap controls. | Submit only materially changed buyer-intent URLs; no paid Bing budget unless explicitly approved. |
| Chrome extension | EXPERIMENT BACKLOG | Strategic fit is high because it can surface Miloosh at the vendor-evaluation moment. No extension exists yet. | Validate the use case and scope before building; Chrome Web Store is relevant only after a real extension exists. |
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
- 2026-09-10 — Partner distribution — Soluxe Agency / Liam Colclough — sent a personalized data-sharing note tied to his current n8n vs Zapier vs Make guide. Offered automation pricing/source subset; no backlink, placement, or paid request. Gmail message `1a08991a35d5172a`.
- 2026-09-10 — Partner distribution — Cheberko / Alex — sent a personalized data-sharing note tied to his current automation comparison and client work. Offered automation pricing/source subset; no backlink, placement, or paid request. Gmail message `1a08991c6c2c5929`.
- 2026-09-10 — Partner distribution — Lurto — hello@lurtoagency.com — personalized data-sharing note tied to its July 2026 Zapier vs Make vs n8n operating-cost comparison. Offered automation-specific source/pricing subset; no backlink or placement ask. Gmail message `1a089975b38befec`.
- 2026-09-10 — Earned media — Hillary Crawford / NerdWallet — hcrawford@nerdwallet.com — personalized source pitch tied to her 2026 QuickBooks alternatives guide and small-business software beat. Offered accounting-only vendor-source/pricing subset; no placement ask. Gmail message `1a089980a861ade7`.

- 2026-09-10 — Partner support — Jotform / Kristina Ayşe Dinçer — reply SENT in invited campaign thread. Asked company-page eligibility, requirements/disclosure and demo access; no enrollment or 5,000-view commitment. Gmail 1a08b9c163c2401b; thread 1a085d88de74832c. Incoming handled and archived.
- 2026-09-10 — Partner support — Close / Michael Taylor — reply SENT via the verified PartnerStack Reply-To. Asked for calling/SMS/usage-cost guidance and small-team walkthrough. Referenced the prior distribution request without repeating it. Gmail 1a08bae1b03d7f5d; thread 1a07c476663c26c2. Incoming handled and archived.
- 2026-09-10 — Partner distribution — MailerLite / Gloria — live Klaviyo buyer-checklist update SENT to partners@mailerlite.com after history deduplication. Asked for an appropriate partner-education/editorial contact. Gmail 1a08bd378b4ff3f8; thread 1a01f51c7e1e7e29. UTM campaign klaviyo_buyer_checks_20260910, source mailerlite_partner, medium referral. Placement and acquisition not yet verified.
- 2026-09-10 — Production decision assets — /software/wrike and /software/klaviyo LIVE on deployment dpl_9wag16EoUH1tncLRoyt2uDzXxGtG / db8827f. Tracked buyer-checklist-cta links and vendor citations verified. New 28-day experiments registered; all 19 prior entries preserved.
- 2026-09-10 — Measurement correction — complete first-party snapshot contains 1,615 events, 43 high-confidence classified visitors, and 10 affiliate outbound events from 3 unique visitors. Prior partial 888/869-event reads are superseded. No paid conversion or commission verified. See work-revenue-execution-2026-09-10.md.
- 2026-09-10 — Organic distribution — four LinkedIn/Facebook drafts with tagged URLs prepared; zero posts executed. Facebook and Buffer identity reads returned HTTP 401; authorization restoration and existing Wrike delivery reconciliation required. No duplicate queue item created.
- 2026-09-10 — Owner blocker — Impact account 7623171 payment warning specifies missing billing city. No financial/tax/address edits. Proton invitation evaluated and deferred for unproven current catalog/demand fit; not accepted.
- 2026-09-10 — Repository blocker — GitHub origin rejected push and remote-ref read with HTTP 403 / account suspended. Work committed locally; no remote synchronization claimed. Production remains READY on dpl_9wag16EoUH1tncLRoyt2uDzXxGtG. Owner account resolution required.

## 2026-09-12 revenue continuation

- Production/domain verification — Vercel CLI confirmed `miloosh.com` and `www.miloosh.com` are assigned to `flowtemplate`; live canonical pages returned HTTP 200. The apparent missing-domain state from the connected project summary was not the authoritative domain view.
- Intent wave 1 — Smartsheet, Ecwid, Zoho CRM, and Calendly source-backed buyer checklists deployed without CSS/layout/component changes. Production `dpl_H2ae6nfG5RYAcgvKJG8T6LAkztq6`, commit `23148ff5627b58966423e72d98baa18bd42d8406`, READY and aliased to miloosh.com.
- MailerLite factual correction — broadened the Klaviyo-page MailerLite fit description after first-party partner feedback and verification of MailerLite websites, landing pages, ecommerce, digital-product, automation, API and MCP capabilities. Ranking/order was not changed for affiliate economics.
- Measurement integrity — prior Klaviyo experiment `work-revenue-20260910-klaviyo` closed `INCONCLUSIVE` before its first checkpoint because treatment changed. Fresh Klaviyo plus Smartsheet/Ecwid/Zoho CRM/Calendly experiments registered conditionally; unrelated experiment records preserved.
- Intent wave 2 — WooCommerce, Teamwork, and Doodle source-backed buyer checklists deployed using the existing decision component only. Production `dpl_HeEp3zgxbhk8dvs8A8XX797S6wB2`, commit `8c70d6acb25624cfe6f3b4ec3a8f2a789927b863`, READY and aliased to miloosh.com.
- Wave-2 measurement — WooCommerce, Teamwork and Doodle 28-day experiments registered conditionally after live verification; experiment registry grew 26→29 while preserving all existing records.
- Partner distribution — monday.com / Authorized Partners Business Support: SENT Teamwork buyer-checklist asset in the existing verified thread, Gmail `1a096cb6053dd18b`, UTM `monday_partner / referral / teamwork_buyer_checks_20260912`. Asked for partner-education/editorial routing; no placement or traffic is claimed.
- Payout closure requests — read-only verification requests sent to PartnerStack, Impact, MailerLite, Setmore and Jotform. No bank, tax, identity, billing-address or payment-provider value was invented or modified.
- SurveyMonkey — first-party partner email reported Miloosh's first referral click on 2026-09-12. This is a click only; no signup, paid conversion or commission is inferred.
- Social auth correction — Facebook environment variables were present but a read-only Graph probe returned OAuth code 190. Status reporting now distinguishes configured credentials from live connectivity. LinkedIn remains owner-auth blocked. No social post was claimed from either provider.
- Social backlog safety — existing publisher already prevents a stale catch-up burst: >24h entries are requeued instead of published as-is, maximum five stale requeues per run, maximum three requeue attempts, plus the existing Facebook daily publication cap. The 293 scheduled backlog items were therefore not bulk-deleted or force-published.
- GSC freshness blocker — the service-account and `CRON_SECRET` remain Vercel Sensitive values available to runtime but intentionally unavailable to local CLI/env pull. `vercel env run` confirmed sensitive values cannot be pulled. The protected `/api/growth/gsc-query` route remains authenticated; security was not weakened to obtain a fresh local report.
- Repository sync — GitHub connector continues to return HTTP 403 / account suspended. No alternate identity or repository was used to bypass it; local commits and Vercel production remain available.

## 2026-09-12 new-channel distribution wave

- New directories — SubmitStartup, Visalytica, AppStackBuilder, Ignlab Launch, LaunchFree and ToolPromote accepted free Miloosh submissions for review. No paid fast-track or site badge was purchased/added.
- New live directory — CurlShip accepted Miloosh via its documented submission API, HTTP 201, free listing ID `3120`. This is a live listing; no badge was added to Miloosh.
- New research distribution — data-led pitches SENT to TrulyCritic (`1a096fd5aebfc220`), SaaSTracker (`1a096fd7708240cd`), Ren Hao SEO Insights (`1a097283b29f9601`) and EveryAny.One (`1a09729741afa98e`). No paid/favorable placement requested.
- LaunchFree confirmation — first-party receipt Gmail `1a09721c70bfc4ae` confirms the submission entered its review queue.
- Auth-gated sources — StartupBase, IndieTools, directree, HereIsMySaaS and 10015 were not called completed; each requires owner/account authentication. Linkrena and SaaSWall magic-link/login completion remained pending because no login email had arrived.
- Policy skips — badge-required free tiers and paid fast-track routes were skipped to preserve the user's no-visual-change / no-unapproved-spend constraints.
- Durable source-by-source status: `docs/new-distribution-sources-2026-09-12.md`.


## 2026-09-13 — distribution and infrastructure, guides frozen

- Agency by Agency: SENT to info@agencybyagency.com; Gmail 1a09966d4c78f4ee; asset /best-time-tracking-for-agencies; UTM agencybyagency / referral / buyer_guides_distribution_20260913. New remit-specific resource pitch after current mailbox and ledger deduplication. No placement, backlink, traffic, endorsement or revenue is claimed.
- Operations Nation: SENT to community@operationsnation.com; Gmail 1a09966fb360f0ad; asset /best-no-code-database-for-operations; UTM operationsnation / referral / buyer_guides_distribution_20260913. New remit-specific resource pitch after current mailbox and ledger deduplication. No placement, backlink, traffic, endorsement or revenue is claimed.
- Support Driven: SENT to community@supportdriven.com; Gmail 1a099672a1350dc9; asset /best-help-desk-for-small-business; UTM supportdriven / referral / buyer_guides_distribution_20260913. New remit-specific resource pitch after current mailbox and ledger deduplication. No placement, backlink, traffic, endorsement or revenue is claimed.
- Prior Startup88 submission receipt re-read (Gmail 1a097e2d11c6922a): in review, NOT a confirmed live listing. No paid upgrade.
- New-directory screens: Startup Buffer stopped at an explicit human-verification challenge; Tools.so browser timed out; Crowdstax and Dir Hub require login. No completed submission or account signup claimed. FeedMyStartup offers an email submission route but its browser form did not become accessible at first read.
- Security patch 141ee10 was already deployed before this session. Independent production npm audit of that lockfile returned zero known production dependency vulnerabilities; no universal security guarantee.
- New infrastructure repair: social queue read errors no longer become false empty history. Reproduced eight failing cases before fix; 15 regression tests now included. Read-only compatibility check accepted all 2,485 live records; no social queue write or post. Guide content and visual files unchanged.


## 2026-09-17 — week-1 evidence reconciliation and merchant-focused outreach

- FreshBooks: SENT_VERIFIED; from hello@miloosh.com; Gmail `1a0af0bfd8e99f31`; מענה לשאלת מקורות התנועה אחרי אישור; לא הומצא פילוח קמפיינים. No publication or revenue claimed.
- HyNote: SENT_VERIFIED_AWAITING_TERMS; from hello@miloosh.com; Gmail `1a0af13a4dbff057`; בקשת הסכם מלא, משך גישת הבדיקה, היעדר חיוב אוטומטי וזכאות לתשלום לישראלים. No publication or revenue claimed.
- Retail Minded: SENT_VERIFIED_AWAITING_DECISION; from hello@miloosh.com; Gmail `1a0af1974233f46d`; הצעת מדריך החלטה לחנות קטנה: לתקן את האתר, להוסיף מכירה או לעבור. No publication or revenue claimed.
- SmallBusiness.co.uk: SENT_VERIFIED_AWAITING_DECISION; from hello@miloosh.com; Gmail `1a0af1f1a4d8f438`; הצעת מאמר על תיקון מול מעבר חנות, ללא דירוג מוצרים או קישורי שותפים. No publication or revenue claimed.
- LaunchFree: existing LIVE listing independently reverified at https://launchfree.io/listings/miloosh.html; link rel `noopener; no nofollow observed`. NOT a new Sep 17 placement.
- PublishYourSaaS: existing LIVE listing independently reverified at https://publishyoursaas.com/listing/miloosh-com; link rel `nofollow noreferrer`. NOT a new Sep 17 placement.
- CurlShip: existing LIVE listing independently reverified at https://curlship.com/l/3120; link rel `noopener nofollow`. NOT a new Sep 17 placement.
- Measurement: 97 tests passed; complete production analytics read. Lifetime confirmed-plus-strong visitor count 45; raw traffic and affiliate clicks are not conversions or revenue. Root-level guide_view instrumentation gap identified, not fixed/deployed.
- Partner registry: 78 rows exported; 24 active/content-pending rows reviewed for sprint relevance, not freshly account-verified. FreshBooks email approval supersedes stale local PENDING_REVIEW; tracking link activation not claimed.
- Full week-1 report: `docs/growth/WEEK1_EXECUTION_20260917_HE.md`. Evidence: central `02-Operations/week1-20260917/EVIDENCE_REGISTER.json`. No 85–90% completion claim; no spend, signup, production deploy, or duplicate social post.


## Verified follow-through 2026-09-17: guide tracking and FreshBooks

- Root-level buyer-guide analytics: LIVE_VERIFIED, 34 canonical guide templates; no historic backfill.
- FreshBooks: direct vendor approval and exact issued link read from Gmail 1a0a27bf25150cef; active registry and existing CTAs reconciled. No product claims or rankings changed. Payout configuration remains UNVERIFIED; no conversion or revenue claim.
- Final production: dpl_9L2YLn7j5d6SccPrqaF4HhShrTN5; source c4cd915f111fa49592e94cc23bb1de649a9902ec. 1608 tests passed, 13 candidate and 13 live browser checks passed.
- Retail Minded: automatic out-of-office through 2026-09-22, message 1a0af1a5832a9317; not editorial acceptance. No repeat follow-up sent.
- Evidence: central 02-Operations/week1-20260917/CONTINUATION_STATUS_HE.md and release manifests. Prior missing-link and guide-event blockers are superseded by this verified execution.


## 2026-09-17 evening — Ignlab pending submission verified live

- Ignlab Launch: previous Sep 12 submission now independently verified as a public listing at https://launch.ignlab.net/t/miloosh . Detail title, canonical, normal directory search discoverability and outbound https://miloosh.com/ link verified. Outbound rel is `noopener nofollow ugc`. No re-submission, account claim, payment, badge, vote or review. Visible Sep 17 date is not independently established as the first publication date. Traffic, conversions and revenue remain unverified.
- Evidence: central `02-Operations/revenue-sprint-20260917-evening/ignlab-listing.json` and `ignlab-browser-readback.json`. Do not report this as new again.

## 2026-09-17 22:10 — worksheet access and qualified community reply

- Existing merchant worksheet: direct same-tab browser access added while retaining the exact HTML download and Wix/Shopify comparison link. LIVE_VERIFIED at source `db7187a0b1a358850aa478bfa9f7a7c5e46c2444`, deployment `dpl_6pm8Jc6JZXrS4ixsBnM8ZMfqDyEg`. Worksheet bytes, ranking/order, issued affiliate URLs, disclosures and the quote/payment-provider checks were preserved. No conversion lift claimed.
- QA: 1,610 tests across 187 files; lint, typecheck, data validation and build passed. Eight isolated desktop/mobile checks each on baseline, local, candidate and live. Actual direct-open, download bytes and live return link verified; zero production analytics writes or affiliate-link navigations.
- Parallel review: Claude and Codex completed distinct read-only tasks in `agent-mesh/runs/20260917T185403Z-43a4bb`; outputs independently reviewed before applying the narrow change.
- Reddit: one new helpful no-link/no-brand reply published as Academic_Annual_8088 at https://www.reddit.com/r/smallbusiness/comments/1wix50r/comment/pafdqlf/ . Exact author/body and action-log hash independently verified. The topic is the manual-order workload behind a handmade seller's storefront decision. No fake experience, lead or traffic claim.
- Counter reconciliation: the already-published 17:38 reply at https://www.reddit.com/r/smallbusiness/comments/1wcdbr1/comment/padlwtr/ was missing from sprint STATE but present in the worker log and live. Finite evening sprint total is TWO verified comments; only ONE was new in the 21:50 manual continuation.
- PartnerStack read reached an onboarding/authentication page, not an authenticated business payout dashboard. No signup or account changes. Commission, conversion and payout amounts remain UNKNOWN.
- Two potential resource routes inspected, not submitted: Lobi Space remains contact-route review; Outgrow Your Garage remains eligibility/consent review. No guessed contact, false US-business declaration, newsletter consent or additional first touch.
- Evidence: central `02-Operations/revenue-sprint-20260917-evening/worksheet-access-2150/RESULTS_HE.md`, `RELEASE.json`, `community-reconciliation.json`, `RESOURCE_ROUTE_DECISIONS_HE.md`. No emails or forms sent and no spend in this continuation.

## 2026-09-18 night — merchant conversion path + strict distribution dedupe

- Store buyer path: added an early, vendor-neutral jump from the existing decision kit to the existing quick-comparison table. The jump records only `internal_cta_click`; it does not create an outbound/affiliate event. No new URL, email gate, ranking change or vendor claim.
- Wix ecommerce measurement alignment: the two existing store-guide `TrackedCtaLink` surfaces now pass `wixContext="ecommerce"` only for Wix on `/best-ecommerce-platform-for-small-business`. The browser destination was already the issued eCommerce asset; this change makes the server-recorded outbound URL use that same context instead of the generic Wix fallback.
- Analytics reporting: internal CTA actions are now reported separately by `ctaName + targetPath` using distinct visitors. Synthetic QA remains excluded by the existing report filter. This does not infer conversion or revenue.
- Release: source `a26639843a5d0110abbde6af4b730e68e179a899`, deployment `dpl_H9qB7E4HCuBzPNKST6m834KkPbZK`, promoted only after isolated local and candidate browser checks. Live desktop/mobile readback passed; zero affiliate navigation/outbound POSTs were executed by QA. Vercel reported no runtime errors in the post-release check.
- Quality gates: final full suite passed 1,615 tests across 188 files; lint, TypeScript, data validation and production build passed. Focused end-to-end test proves the recorded Wix URL is the dedicated eCommerce funnel when the guide supplies that context.
- IndexNow: the updated merchant guide was submitted once through the existing IndexNow client after verifying the public ownership key; HTTP 200. No noindex worksheet URL and no unchanged bulk set were submitted.
- Distribution suppression: monday.com is hard-suppressed for further external-comparison distribution asks after its partnership team stated that official marketing/comparison/editorial resources are managed in-house and external comparison articles are not cross-promoted. Affiliate operational support is a separate matter. Pipedrive is WAIT, not a decline: co-marketing is case-by-case for select Tier-1/performance-qualified partners, so no further distribution ask until material performance changes.
- Existing pending directory reconciliation: public sitemaps for Visalytica, AppStackBuilder and ToolPromote contained no Miloosh URL at the 2026-09-18 check; this is evidence of no sitemap-discoverable listing at that moment, not a rejection. SubmitStartup and Startup88 require deeper nested-sitemap/review-state confirmation; no resubmission was made.
- Durable suppression/dedupe notes: `02-Operations/revenue-night-20260918/OUTREACH_SUPPRESSION_HE.md`. No new cold email, account signup, paid placement, reciprocal badge, terms acceptance or payout/tax change was executed in this night segment.

## 2026-09-18 night — distribution execution and Wix attribution proof

- Launching Next: free submission accepted into the review queue, id `151886`; confirmation page reported an estimated 4-month wait. Newsletter opt-in was off. The subsequent $99 fast-track upsell was not purchased. This is SUBMITTED, not LIVE; no placement/traffic/backlink is claimed yet.
- ProductReveal: current no-account form was verified but not submitted because submission explicitly agrees to the site's terms and editorial policy. Owner-gated under the no-terms-acceptance rule.
- Uneed: current public documentation says signup is required to save/finish a product submission; public pages also conflict on whether the free waiting line is open. No account or submission created.
- Wix attribution proof: a complete recent first-party Blob read found a non-test `destination=affiliate` outbound from `/best-ecommerce-platform-for-small-business` on 2026-09-14 at `07:13:03.899Z`, slug `wix`, CTA `role-guide-summary-table`. The historical event stored the generic Website Builder `2096727 / trafcat=wsb` asset, directly validating the event-context mismatch fixed in release `a266398`. No attributed sale, commission or payout is inferred.
- Reddit WooCommerce opportunity: exact current rules allowed relevant non-promotional comments, but the worker returned `AMBIGUOUS_SUBMISSION_NOT_RETRIED`. Readback found no published comment, so it is recorded as NOT PUBLISHED and was not retried.
