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
| Directories (startup/SaaS/tool lists) | RESEARCHED, NOT SUBMITTED | — | Every legitimate one found requires account creation/owner identity; see "Directory research" below. |
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

## Directory research — legitimate options found, all require owner action

Every startup/SaaS directory investigated (BetaList, r/SaaS's own submission
process, general "best tools" list sites) requires account creation or an
owner-identified submission — consistent with the account-creation
prohibition. None were submitted to. Revisit once genuinely differentiated
(the calculator tool, or a future dataset/report asset) gives a stronger
"why list this" reason than "it's a comparison site" alone.
