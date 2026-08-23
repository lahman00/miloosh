# Project

Status: In development — autonomous maintenance system live (Sprint 12)

Sprint: 12

Version: 0.12.0

## What this is

Miloosh is a software-comparison directory: for a given tool, it shows
verified, sourced alternatives grouped by category, with generated
metadata, structured data, and internal linking designed to scale past a
handful of hand-written pages.

## Scope by sprint

- **Sprint 1** — premium landing page and software comparison UI on top of
  a hardcoded 5-entry dataset.
- **Sprint 2** — SEO infrastructure: sitemap, robots, JSON-LD (Organization/
  Breadcrumb/SoftwareApplication/FAQ), About/Privacy/Terms/Contact pages.
  Found and fixed a real dead-link bug (6 "alternative" tools had no page of
  their own), closing the link graph to 11 entries.
- **Sprint 3** — Content Engine: moved the dataset to one validated JSON file
  per software entry (`data/software/*.json`), Zod schema, reusable content
  generators, related-software utilities, and `/compare` architecture
  (built, not routed).
- **Sprint 4** — Business Expansion: grew the dataset to 30 software entries
  across 8 categories, all with sourced facts (see docs/content-engine.md
  for what "sourced" means and what was deliberately left unpopulated), a
  `/category/[slug]` route, an expanded comparison engine, monetization-ready
  architecture (no live monetization), and `npm run validate:data`.
- **Sprint 5** — Legal, Compliance & Trust: 9 new legal/trust pages
  (Affiliate Disclosure, Disclaimer, Editorial Policy, Sources Policy,
  Corrections Policy, AI Usage Disclosure, Accessibility Statement, Cookie
  Policy, Trademark Notice), each accurate to how the site actually
  operates today — no claimed certifications, no invented company details.
  Added a real `accessed_at` field to every software entry so the Sources
  Policy's "access dates are stored" claim is true rather than aspirational,
  and a visible Sources section on every software page. Footer reorganized
  into columns to hold 11 legal links without clutter.
- **Sprint 6** — Brand, Domain & Revenue: every remaining hardcoded brand
  string centralized into `lib/site.ts` (`SITE_NAME`/`SITE_TAGLINE`/
  `SITE_DESCRIPTION`/`SITE_EMAIL`/`SITE_URL`/`SITE_THEME_COLOR`/
  `SITE_VERSION`, the last sourced straight from `package.json`); real
  generated favicon/app icon/Apple touch icon/OG image/Twitter image/web
  manifest (all built from the same brand mark, not placeholders); an
  analytics abstraction (Google Analytics/Plausible/PostHog/none, off by
  default, env-var-only); a proper affiliate-link engine
  (`lib/affiliate.ts`: `preferredUrl`, tracking params, disclosure flag)
  replacing the earlier ad hoc CTA helper; reusable vendor-link blocks
  (pricing/docs/support/integrations/status/community — none populated,
  no invented URLs); and real, computed data-freshness stats (tool count,
  category count, most recent source-verification date) surfacing in the
  Footer, About, Editorial Policy, and Sources Policy pages instead of
  hand-typed numbers.
- **Sprint 7** — Launch the Comparison Pages: routed `/compare/[a]-vs-[b]`
  for a curated set of exactly 20 pairs (`data/comparisons.ts`), each
  built entirely from fields already in the dataset — side-by-side
  summary, best-for, feature comparison, pros/cons (with an honest
  disclosure standing in for an invented cons list), key differences,
  who-should-choose-which, official-source links, related software, and
  related comparisons. Closed a real data gap first: Jira, Linear, Miro,
  and Lucidchart didn't exist yet but were named in the required pair
  list, so they were researched and added from official sources the same
  way Sprint 4 grew the dataset — not fabricated to fit the list.
  `dynamicParams = false` plus an in-component published-pair check means
  a valid-but-uncurated pair (two real software slugs) 404s instead of
  rendering on demand. Added a `/compare` index page, comparison URLs in
  the sitemap, `BreadcrumbList` + ratings-free `ItemList` JSON-LD, related-
  comparison links from software/category pages and the homepage, a
  Compare link in the navbar and footer, and comparison-pair checks
  (broken references, self-comparisons, duplicate pairs) in
  `npm run validate:data`.
- **Sprint 8** — Revenue Intelligence: researched affiliate/referral
  programs for all 34 products against official vendor and
  partner-network pages (`data/revenue/affiliate-programs.ts` — 15
  confirmed, 13 confirmed-none, 6 unresolved, nothing guessed). A revenue
  score (0-100) per product from real inputs only — confirmed affiliate
  availability, stored pricing model, comparison involvement, a
  documented per-category value weight — split into Tier A/B/C
  (`lib/revenue/scoring.ts`, `tiers.ts`). Architecture-only: an Affiliate
  Manager, an Outbound Event abstraction, and a Click Tracker, all off by
  default and unwired from any page. Seven ranked future revenue
  opportunities and `docs/revenue.md`.
- **Sprint 9** — Activate First Revenue: an application checklist for the
  6 Tier A products (`docs/affiliate-applications.md`) with every
  approval-status/ID/URL field left blank — no approval claimed. Extended
  the Affiliate Manager so a real approved link activates via env var or a
  gitignored `config/affiliate-credentials.json`, gated in code on a
  confirmed program, requiring no code change. Wired outbound-click
  tracking end to end into a local, first-party JSON log
  (`var/outbound-clicks.json`) via a new API route, still off by default;
  added `/internal/outbound-clicks`. Zero affiliate links activated, zero
  real credentials anywhere in the repo.
- **Sprint 10** — AI Software Advisor: `/recommend`, a mobile-first wizard
  matching team/budget/needs against the verified dataset with a fully
  deterministic scoring engine (`lib/recommend/`) — no LLM, no external
  API, every point traceable to a real stored field or a real text search.
  Industry is collected but never scored (no dataset support), disclosed
  explicitly rather than faked. The scorer sits behind a documented,
  swappable `ScoringStrategy` interface for a future AI-based version.
  Recommendation analytics (generated/shown/clicked) share Sprint 9's
  tracking switch; `/internal/recommendations` added.
- **Sprint 11** — Launch Readiness Audit: a full read-only audit (code
  structure, SEO, performance/accessibility, content) via parallel review
  passes, then every verified fix applied — removed unused Prisma/Supabase
  dependencies and 7 dead code exports never called from any page; fixed 3
  live content bugs (a copy-pasted 404 heading, a category name getting
  incorrectly lowercased, a vendor name's internal capital breaking when
  spliced into a sentence); capped meta descriptions that exceeded the SEO
  length limit on 32 of 34 pages; added missing focus-visible states and
  two missing input labels. Several docs (`content-engine.md`,
  `monetization.md`, `legal-and-trust.md`) had drifted out of sync with
  the shipped code and were corrected.
- **Sprint 12** — Autonomous Maintenance System: six deterministic,
  read-only agents — link health (checks every official/source/vendor/
  affiliate URL for 404s, timeouts, bad redirects), data freshness
  (0-100 documentation-completeness score per product, explicitly never a
  correctness claim), SEO integrity (imports the real `sitemap.ts`/
  `robots.ts` rather than reimplementing them, checks for duplicate
  titles/descriptions, broken references, orphan-page risk), recommendation
  regression (14 structural fixtures against the real engine — asserts
  behavior, not exact wording), comparison opportunity (suggests
  well-supported unpublished pairs, never publishes one), and affiliate
  opportunity (confirmed-but-inactive/unresolved/high-tier-no-program/
  stale-research, cross-referencing Sprint 8's data, never exposing an
  actual activated URL). `npm run maintenance` runs all six and writes
  `var/maintenance/latest-summary.{json,md}`; a critical *finding* never
  fails the command, only a real agent execution failure or an SEO/
  regression codebase bug does. A private dashboard at
  `/internal/maintenance`, a weekly GitHub Actions workflow
  (`.github/workflows/maintenance.yml`, uploads reports as artifacts, can
  open a tracking issue via the default token, never edits data or
  commits or merges), and a disabled-by-default, provider-neutral
  notification abstraction (email/Slack/Telegram webhooks, no real
  credentials). Nothing in this system publishes a factual change or
  pushes to `main` automatically — every finding is a report for a human.
- **GA4 production activation** — Google Analytics turned on in production
  (measurement ID `G-BBFL3YH9NZ`) behind Google Consent Mode v2: every
  signal defaults to denied, the real `gtag.js` script is only rendered
  (and only then can it load or set a cookie) after a visitor explicitly
  clicks "Allow analytics" in a new banner, with a "change your choice"
  control on `/cookies`. Manually verified against live production —
  pre-consent absence, post-consent exactly-once loading, no duplication
  on SPA navigation, decline/persist behavior.
- **Growth/QA agent swarm** — a registry of 40 narrow, single-responsibility
  agents (30 enabled/deterministic, 10 honestly blocked on missing
  external credentials — never faked) spanning SEO, growth/marketing
  discovery, content-quality, and QA/monitoring, coordinated by a central
  orchestrator: dependency-ordered parallel dispatch, cross-agent finding
  dedup, centralized impact scoring, PASS/WARN/FAIL QA rollup. Wraps the
  six Sprint 12 maintenance agents rather than duplicating them; adds real
  new checks (live-sampled redirect/broken-URL crawl, category depth,
  duplicate/templated-content detection, internal-link-opportunity graph,
  cannibalization detection, tag-cluster category opportunities,
  freshness×revenue-tier triage, persona-based content opportunities,
  production smoke checks, GA4 consent regression guards). Four operation
  modes (`agents:quick/daily/weekly/full`); results at `/internal/growth`
  and `var/agents/latest-report.md`. First test suite in this repo
  (`vitest`, `tests/agents/`, 38 tests) covers registry validation, dedup,
  scoring, malformed/timeout/partial-failure handling, and a real GA4
  regression guard.
- **Production-exposure review + access gate** — audited `/internal/growth`
  and `/internal/maintenance` as an unauthenticated visitor: no secrets,
  keys, credentials, or tokens found; one real latent gap (a QA agent's
  captured build/lint output could leak an absolute local filesystem path
  on failure) found and fixed before it ever shipped. All five `/internal/*`
  pages now gated behind HTTP Basic Auth (`proxy.ts`, fails closed if
  credentials aren't set) — the smallest available mechanism, no new
  dependency, no login system. Credentials rotated at least once since
  (old ones verified invalidated) — see `docs/agents-architecture.md`
  "Access control."
- **Phase 2 — unblocking external-data agents** — registry grew from 40 to
  44 entries (31 enabled, 13 blocked). Google Search Console: a real
  service-account JWT auth flow (`node:crypto` only, no new dependency)
  and REST client, unit-tested with genuine RSA signature verification,
  powering five agents (index/search-visibility, CTR opportunity, ranking
  movement, growth winner/loser, content opportunity) — all correctly
  held disabled pending an owner-provided service-account credential (a
  real account/access requirement, not a code gap). Bing Webmaster Tools:
  a real API-key REST client, same story. IndexNow: fully implemented,
  tested, deployed, and **enabled** — genuinely needs no account or
  signup (the protocol's own design); self-issued key committed and live
  at `https://miloosh.com/64571916632587e2f714c221fb8ccc42.txt`, one real
  submission sent to the live IndexNow API and confirmed (HTTP 202 "URL
  received") before flipping it on. Keyword-volume and backlink-data
  agents remain blocked — no free/official API exists
  for either; not purchased without explicit approval.
- **Phase 3 — Google Search Console indexation-analysis workflow** —
  built against the owner's real GSC baseline (1,358 sitemap URLs, 38
  indexed, 1,320 not indexed — dominated by 1,307 "Crawled - currently
  not indexed", explicitly not treated as a technical failure). Hardened
  the GSC client with quota-aware retry/backoff, full `searchAnalytics`
  pagination, and an expanded URL Inspection field set (robots/fetch
  state, Google vs. user canonical). Added a shared 7-day inspection
  cache (`urlInspectionCache` in agent state) so the whole workflow makes
  one inspection pass per URL per run, not one per agent — required to
  respect the Inspection API's 2,000/day quota. Built five new agents on
  top of it: index-coverage classification (rewritten `classify()` with
  a regression-tested guard against misreading "Crawled - currently not
  indexed" as indexed), an indexed-vs-non-indexed comparator (quota-
  aware biased sampling: homepage + all categories + a software spread +
  a comparison-page sample, since a naive random sample would likely
  contain zero indexed URLs at a 2.8% indexed rate), canonical-
  consistency and crawl-recency analyzers, and an evidence-graded
  priority-candidate selector (revenue tier used strictly as a tiebreak,
  never as a sole selection reason — enforced by a dedicated regression
  test) feeding an experiment tracker/verifier for later before/after
  comparison. Every cross-group finding is deliberately evidence-graded
  (observation/hypothesis/confidence/proposed test) rather than asserting
  causation. Dated GSC snapshots (`var/agents/gsc-snapshots.json`) seeded
  with the owner-reported baseline, labeled `source: "owner-reported"` so
  it's never confused with a live API pull. Registry grew from 44 to 49
  entries (31 enabled, 18 blocked — all ten GSC-dependent agents remain
  disabled; none enabled without a real authenticated API call). Test
  suite grew accordingly; see `docs/agents-architecture.md`
  "Google Search Console — connecting real data" for the exact owner
  steps needed to unblock it.
- **Autonomous growth/QA work shift (2026-08-10)** — owner-directed
  extended session focused on real traffic/revenue impact rather than
  agent-count growth. Found and fixed three real production bugs: IndexNow
  was sending a malformed `keyLocation` (missing path separator) and
  getting rejected with HTTP 422 on every real submission; the meta-
  description generator always appended a boilerplate CTA before
  truncating, so all 217/217 software pages were truncated even when the
  CTA never fit (now 177/217, and only pages with genuinely long sourced
  descriptions); the link checker misclassified direct Cloudflare/Akamai
  403s (verified via a real browser hitting a live Cloudflare challenge
  page) as generic "client_error" instead of bot-blocking. Content
  forensics on the three templates (no GSC access yet) found comparison
  pages are 81.5% of the sitemap (1,107/1,358) and collapsed to just 12
  distinct intro-sentence shapes across the whole corpus — fixed by
  grounding the second sentence in each pair's real feature/platform
  counts (12 → 290 shapes). Added a category-page synthesis sentence
  (real platform-coverage data, not editorial claims) and a client-side
  filter on `/compare` (1,107 links now findable without removing any
  from the crawled HTML). Selected and recorded a 15-URL experiment
  cohort via the existing experiment-tracker for later GSC comparison.
  Closed a real revenue-documentation gap: 9 of 15 Tier A products with
  a confirmed affiliate program had no application checklist entry —
  added using already-sourced research, no new fetches. Registry grew
  from 49 to 50 entries (32 enabled, 18 blocked — the one addition,
  content-comparison-similarity-analyzer, needed no credential).
  Internal linking confirmed comprehensive (0 findings, no orphans).
  Discovered but deliberately did not act on: 0/217 software entries
  have `pricing.model`/`links.*`/`founded`/`company`/`pros`/`cons`/
  `faq`/`tags` populated — a systemic dataset gap, not specific to the
  7 products the freshness scorer flagged as "stale."
- **Production determinism + first-party pricing/factual-depth push
  (2026-08-22/23)** — two linked missions. First, a production
  determinism bug: the homepage's evidence-ranked "popular" sections
  (`app/page.tsx`) read a local, gitignored GSC cache
  (`var/agents/gsc-opportunity-mining.json`), so public rendering
  silently depended on whichever machine last ran `vercel deploy --prod`
  (confirmed empirically that CLI deploy uploads the local working
  directory directly, bypassing git — a real, still-open operational fact
  about how this project ships, distinct from what any one fix can
  change). Root-caused and fixed by discovering a real, already-running,
  previously-unknown pipeline — `lib/seo-factory/run.ts` + a daily Vercel
  cron (`0 22 * * *`) that queries Search Console directly and persists
  to Vercel Blob — and building `scripts/growth/generate-priority-
  snapshot.ts`, a manually-run/reviewed generator that writes a small,
  git-committed evidence file (`data/seo/priority-snapshot.json`: url +
  impressions + clicks + ctr + position only, no queries, no internals)
  from that pipeline's real output. `buildIndexationPriorityList` now
  reads the committed file; proven deterministic by diffing its output
  with/without `var/agents` present (byte-identical) and by a full clean-
  checkout build with the entire `var/` tree removed. Homepage copy
  ("Popular" / "the tools people compare most") renamed to "Explore" /
  "Featured comparisons... prioritized by real search demand and page
  connectivity" since real clicks are still near-zero site-wide and
  didn't support a genuine popularity claim.

  Second, closed the software-catalog's biggest concrete factual-depth
  gap: added `scripts/growth/factual-depth-audit.ts` (0-100 score across
  12 real dimensions — pricing, free-trial info, feature/platform/source
  counts, stated limitations, comparison connectivity; explicitly does
  not reward prose length) and `scripts/growth/remediation-queue.ts`
  (crosses factual depth against real GSC demand to find pages where
  Google is already testing the page AND the page has a concrete, fixable
  gap). Added real, first-party-sourced pricing (and, where the source
  supported it, real stated limitations — seat caps, contract
  requirements, per-channel/per-conversation billing) to 10 of the
  catalog's highest-demand, thinnest pages: Semrush, Freshdesk, Intercom,
  Front, Buffer, Salesforce, Tidio, Airtable, Wrike, and Smartsheet
  (Smartsheet's exact tier prices couldn't be reliably verified — the
  pricing page 404s in the available browser tool and WebFetch produced
  inconsistent numbers across three attempts — so only its real tier
  names, seat minimums, and trial length were recorded; prices left
  genuinely unresolved rather than guessed). Factual-depth distribution
  moved from A=51/B=4/C=150/D=42 to A=60/B=5/C=141/D=41. All ten pages'
  scores moved from bucket C/D into bucket A. Next real remediation queue
  (same demand-backed method, not yet acted on): Zapier, n8n, Jasper,
  Basecamp, ActiveCampaign, Webex, GitHub, Copy.ai, Umbraco, CrowdStrike.
- **9-page remediation completion + analytics human-traffic classification
  system (2026-08-23)** — finished the remediation queue's remaining 9
  pages (Freshdesk, Intercom, Front, Buffer, Salesforce, Tidio, Airtable,
  Wrike, Smartsheet — all bucket C→A; Smartsheet's exact prices stayed
  genuinely unverified after the pricing page 404s in the available
  browser tool and WebFetch returned three inconsistent numbers). Full
  distribution after both remediation passes: A=60, B=5, C=141, D=41.

  Separately, and more consequentially: the raw "real/unknown human"
  visitor count jumped 28→60 between sessions. Rather than report that as
  growth, built a permanent second classification layer —
  `lib/analytics/human-classification.ts` — that buckets every SESSION
  (not event) into CONFIRMED_CLEAN / STRONG_HUMAN_EVIDENCE / PROBABLE_HUMAN
  / SUSPICIOUS / UNRESOLVED / KNOWN_QA_TEST / KNOWN_AUTOMATION using only
  rule-based, generalizable evidence (real UTM + a progressive multi-type
  engagement funnel; a real outbound/affiliate click; multi-page
  navigation with dwell time; two independent burst-cadence detectors —
  same-path repeated hits, and a same-path-agnostic "N distinct visitors
  arriving within 15s" check that the earlier Aug 22 5-visitor/5-page
  cluster needed and a same-path-only rule would have missed). Applied to
  the full dataset: 1 CONFIRMED_CLEAN, 6 STRONG_HUMAN_EVIDENCE (the real
  CircleCI/Facebook post cluster — genuine `utm_content` match to the
  actual published queue entry, real progressive engagement including two
  client-only `cta_impression` `IntersectionObserver` events, no CTA click
  yet — the deepest the acquisition loop has verifiably reached), 22
  PROBABLE_HUMAN, 21 SUSPICIOUS (includes both the newly-found 09:01-09:04
  homepage-only burst AND, correctly reclassified under the new framework,
  the Aug 22 16:53 5-visitor/5-page cluster and the older
  UNKNOWN_POSSIBLE_OPERATOR_QA legacy session), 12 UNRESOLVED, 8
  KNOWN_QA_TEST, 0 KNOWN_AUTOMATION (investigated and explicitly ruled out
  this agent's own deploys/verify-deployment/known crons as the source of
  the homepage burst — see `lib/analytics/known-automation-sessions.ts`'s
  header for exactly what was checked and ruled out; no deterministic
  source was found, so it stays SUSPICIOUS rather than being force-fit).
  `scripts/analytics/report.ts`'s milestone scoreboard now reports a
  CONFIRMED-OR-STRONG count (7) as the headline number, with the raw
  REAL_OR_UNKNOWN count kept only as a clearly-labeled, non-authoritative
  denominator — regression-tested so a raw jump can never again silently
  read as a milestone reached. Full defensible-range answer as of this
  mission: minimum confirmed 1, probable estimate ~7-29 (confirmed+strong
  through probable), maximum plausible up to 60 if every unresolved/
  suspicious session were eventually vindicated (not expected, not
  claimed).
- **CTA conversion optimization: measurement layer + first controlled
  experiment (2026-08-23)** — the classified funnel's own bottleneck was
  the next evidence-backed target: 6 STRONG_HUMAN_EVIDENCE visitors from
  the real CircleCI/Facebook post reached `cta_impression` and 0 clicked.
  Mapped the full CTA system first: 4 live locations all sharing one
  component (`components/TrackedCtaLink.tsx`) — `software-page-cta`,
  `compare-page-choose-card`, `role-guide-summary-table`, `role-guide-
  card-cta` — plus a `VendorLinksBlock` that renders nothing today (no
  `software.links` populated yet, a real but currently-inert gap). Every
  CTA already resolves its destination through `lib/affiliate.ts`
  (`getSoftwareCtaUrl`), which never fabricates a URL and dual-records
  every real click into both the legacy revenue pipeline and first-party
  analytics — confirmed this is why "outbound_click" events in the
  classification layer were already trustworthy, not a measurement gap.

  Real finding from the audit (Phase 4/10): `PricingSection` renders
  AFTER the CTA card on the software page, not before it — a visitor
  sees "Visit {Name}" before any pricing context. Documented, not fixed
  this pass (a layout change would confound the copy experiment below;
  left as a separately-scoped follow-up).

  Built a real, additive (opt-in per CTA) experiment layer:
  `lib/experiments/cta-copy-experiment.ts` (deterministic per-visitor
  hash assignment, stable across sessions) wired into `TrackedCtaLink`
  and the software-page primary CTA only (`software-cta-copy-v1`).
  CONTROL is the pre-existing "Visit {Name}" text, byte-identical, so
  the baseline arm is the real unchanged experience, not a synthetic one.
  TREATMENT is "Visit {Name}'s Official Site" — deliberately NOT
  "View pricing" / "Start free trial" / "Best deal", since
  `getSoftwareCtaUrl` resolves to the vendor's general site for most
  entries, and those phrases would describe a destination the link
  doesn't actually deliver (this mission's own copy-accuracy rule).
  `cta_impression`/`outbound_click` events now carry `experimentId`/
  `variant` when applicable (extended, not replaced, the existing event
  shapes). `scripts/analytics/report.ts` gained a per-arm CTA experiment
  report with an explicit `INSUFFICIENT_DATA` gate (>= 30 impressions
  required in EVERY arm before any comparison is shown) — never computes
  or implies statistical significance even once that floor is cleared.
  Real production status at deploy time: 0 experiment-tagged impressions
  yet (too new) — INSUFFICIENT_DATA, honestly reported as such.

  A known, accepted design tradeoff, documented in the component itself:
  since visitor ID lives in localStorage (client-only), the treatment
  variant can't be known during SSR — control renders first on both the
  server and the initial client render (so there's no hydration
  mismatch), then a post-mount effect swaps in treatment if assigned.
  This is a small, standard, one-time text swap after mount, not a
  flicker between page loads (a returning visitor's assignment never
  changes) — the alternative (a cookie-based edge/middleware split) would
  be materially larger scope than "one CTA hypothesis."

- **MILOOSH PEOPLE NOW mission (2026-08-23)** — acquisition-focused, not
  infrastructure-focused: the stated problem was "not enough real people,"
  so this session built and shipped real acquisition assets rather than
  further content/SEO work. **Email Acquisition Engine promoted from
  PLANNED to ACTIVE ACQUISITION INFRASTRUCTURE** (capture half only — see
  below): `lib/newsletter/leads.ts` (one private Vercel Blob object per
  lead, keyed by a SHA-256 hash of the email so a re-subscribe updates
  rather than duplicates — a deliberate, documented deviation from the
  random-UUID-per-event pattern `lib/revenue/events.ts` uses, since a lead
  has a real unique key an outbound click doesn't), a real signup form
  with never-pre-checked consent (`components/newsletter/
  NewsletterSignupForm.tsx`), a working token-based unsubscribe
  (`/newsletter/unsubscribe`, functional even before any email is ever
  sent), full first-party attribution (UTM + landing path + visitorId),
  and a `newsletter_signup` analytics event (behavioral marker only, no
  PII in the anonymous stream). Live at `/newsletter` and as a secondary
  placement on the cost calculator (below). **Honest limitation:** no
  email provider is configured in this environment (checked: no RESEND/
  SENDGRID/MAILCHIMP/POSTMARK/SES env var) — signups are captured and
  stored now, but no welcome email or Weekly Brief can actually send until
  the owner adds one. No lead is lost waiting for that.

  Shipped the first linkable tool: `/tools/saas-cost-calculator` (Phase
  16) — add real products, see a real monthly/annual total, shareable via
  URL query params that round-trip correctly on load. Built from the 59
  (of 247) catalog entries with real, first-party-sourced
  `pricing.entryPaid` — a product without verified pricing is left out,
  never estimated. Found and fixed a real bug while building it: JSX
  silently dropped the space between `{products.length}` and the
  following word when both were interpolated into the same paragraph
  (worked around with a single template-literal expression instead of
  relying on JSX's own text-node whitespace handling).

  Also shipped: `/feed.xml` (real RSS feed of the 30 most-recently-
  verified software pages, dated from the same real `accessedAt` field
  the sitemap already uses), a native-Web-Share `ShareButton` on software
  and comparison pages, and `docs/acquisition-ledger.md` (the real,
  evidence-based channel inventory and status tracker this mission
  produced — see that file for the full channel-by-channel state).

  Real Facebook finding (not a channel-level or content-type conclusion —
  n=8 is too small): of 8 published posts, only 1 (CircleCI, the same
  post from the CTA mission) produced meaningful attributed traffic (6
  STRONG_HUMAN_EVIDENCE sessions); 6 of 8 produced zero. Reddit/Quora/
  Product Hunt/directories were researched but not posted to or submitted
  — no Miloosh account exists for any of them, and creating one is an
  explicit prohibition this mission's own rules carried over from every
  prior mission. See `docs/acquisition-ledger.md`'s "Reddit/Quora
  research" and "Launch readiness" sections for exactly what was found
  and what a human would need to do to activate each one.

  Real incident, self-corrected: local verification of the newsletter
  form (`npm run start` + a live browser, no `?qa=1`) wrote a real test
  lead into the production Vercel Blob store, because `.env.local`'s real
  `BLOB_READ_WRITE_TOKEN` is loaded automatically by `npm run start` the
  same as production — not just an analytics-events risk (the lesson from
  the CTA mission's browser-verification incident applies to ANY write
  path this codebase has, not only the one it was first found on).
  Caught immediately, deleted directly (a real lead record is mutable PII
  under this project's control, unlike the immutable analytics log, so
  direct deletion — not an annotation — was the correct fix here).

See `docs/` for full architecture documentation:

- `docs/content-engine.md` — data model, schema, generators, sourcing policy
- `docs/categories.md` — category system
- `docs/comparison-engine.md` — the `/compare` architecture and curated-pairs policy
- `docs/recommendation-engine.md` — the deterministic `/recommend` scoring engine
- `docs/monetization.md` — the affiliate/sponsorship/vendor-links architecture
- `docs/revenue.md` — affiliate research, revenue scoring, and commercial tiers
- `docs/affiliate-applications.md` — the Tier A affiliate-program application checklist
- `docs/legal-and-trust.md` — the 11 legal pages and what was verified
  before each claim was written
- `docs/brand-and-analytics.md` — brand centralization, generated visual
  identity, and the analytics abstraction
- `docs/maintenance-system.md` — the 6 maintenance agents, severity rules,
  report formats, GitHub Actions behavior, and the human approval workflow
- `docs/maintenance-notifications.md` — the provider-neutral notification
  abstraction (disabled by default)
- `docs/agents-architecture.md` — the growth/QA agent swarm: registry,
  orchestrator, scoring formula, every agent's responsibility, blocked
  agents and how to unblock them, how to add/disable an agent, testing
- `docs/acquisition-ledger.md` — every distribution channel's real status
  (active/blocked/deferred/deliberately-disabled), Facebook's real
  per-post evidence, and what's been researched but not yet acted on

## Rules that have held across every sprint

- No database — the dataset is JSON files, validated at build time.
- No authentication.
- No cookies for advertising or auth, ever. Google Analytics (GA4) is
  active in production behind Google Consent Mode v2 (default denied): no
  cookie is set until a visitor explicitly clicks "Allow analytics" in the
  banner shown on first visit — see `docs/legal-and-trust.md`.
- No fabricated facts: no invented pricing, ratings, reviews, founding
  dates, affiliate relationships, or compliance certifications. Every
  software entry cites at least one official source with an access date;
  fields with no verified source stay unpopulated rather than guessed.
- No automatic publishing: nothing in the maintenance system or the
  growth/QA agent swarm edits `data/`, commits, pushes, or merges on its
  own — every finding is a local report for a human to review and act on
  by hand.
