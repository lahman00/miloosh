# Miloosh Pain Radar + Reddit Intelligence Engine

## Objective

Turn fresh software-buyer pain into a measurable Miloosh action within hours, while keeping Reddit participation compliant, transparent, non-spammy, and human-gated where community rules require judgment.

## Operating loop

`discover -> normalize -> score -> verify -> choose asset -> distribute -> measure -> learn`

The engine is designed around pain signals such as:

- price increases / cost creep
- free plan ending or shrinking
- billing surprises
- usage or AI-credit limits
- annual-contract friction
- migration pressure
- integration breakage
- support failure
- explicit alternatives/comparison requests

## Pain Radar

`lib/growth/pain-radar.ts` provides the deterministic scoring core.

Inputs are normalized `PainCandidate` records. The scorer weights:

- freshness
- engagement
- commercial intent
- pain severity
- Miloosh audience fit
- existing Miloosh coverage
- source reliability
- immediate build/distribution ability

Output actions:

- `BUILD_ASSET_NOW`
- `DISTRIBUTE_EXISTING_ASSET`
- `PREPARE_PR_HOOK`
- `REDDIT_REPLY_CANDIDATE`
- `MONITOR`
- `REJECT`

The scorer intentionally does not fetch data. Discovery adapters must be separately authorized and policy-compliant.

## Predictive Pain Forecasting

Pain Radar reacts to pain that already exists. `lib/growth/pain-forecast.ts` adds a pre-pain layer intended to identify buyer pain before community complaints or search demand fully emerge.

It scores early signals including:

- pricing-page changes
- terms changes
- free-tier contraction
- plan repackaging
- seat minimum changes
- usage/credit billing
- AI pricing changes
- feature gating
- sunset/deprecation notices
- migration policy changes
- support policy changes
- contract changes
- risky release notes
- sentiment acceleration
- search-demand anomalies
- competitor price gaps
- M&A/support-risk signals

Forecasts are generated for 7-day, 30-day and 90-day horizons and include:

- probability score
- severity score
- Miloosh opportunity score
- LOW / MEDIUM / HIGH confidence
- likely pain classes
- full evidence list
- recommended pre-emptive action

Possible pre-emptive actions include:

- `PREBUILD_ASSET`
- `PREPARE_PR_POSITION`
- `PREPARE_MIGRATION_GUIDE`
- `PREPARE_PRICING_ALERT`
- `MONITOR_CLOSELY`
- `NO_ACTION`

Forecasts are not facts. They must remain auditable and later be backtested against what actually happened. See `docs/pain-forecasting-engine.md`.

## Reddit Intelligence Engine

Reddit is treated as two distinct things:

1. a **demand-intelligence source**;
2. a **community participation channel** only when rules permit it.

It is never treated as a mass-promotion surface.

`lib/growth/reddit-opportunity.ts` provides a community-rule gate. It supports four outcomes:

- `VALUE_ONLY`
- `VALUE_PLUS_DISCLOSED_LINK`
- `HUMAN_REVIEW`
- `DO_NOT_POST`

A Miloosh link is only eligible when current subreddit rules have been checked and explicitly allow the relevant form of promotion/linking. Restricted or ambiguous rules force human review. Prohibited self-promotion still permits a no-link, genuinely useful answer when appropriate.

## Reddit legal / platform constraints

As of August 2026, Reddit's current policies require explicit approval for API access to Reddit data and impose additional restrictions on commercial use. Unauthorized scraping, circumvention, spam, mass unsolicited engagement, repeated promotional posting, and automated product-promotion bots are not acceptable acquisition mechanisms.

Therefore the production design MUST NOT silently scrape Reddit or auto-post promotional replies.

Approved ingestion options are limited to:

- an explicitly approved Reddit API/commercial arrangement;
- manually supplied candidate URLs/content;
- public-web discovery performed through an authorized search provider whose own use complies with applicable terms;
- other sources with explicit permission.

## Target future architecture

### 1. Discovery adapters

Adapters emit normalized candidates from approved sources:

- web/news search
- vendor communities
- forums
- approved Reddit source
- public support communities
- social/search trend sources

### 2. Pain deduplication

Merge repeated discussion of the same underlying pain event by:

- vendor/product
- intent
- time window
- normalized title/topic
- canonical source URL

### 3. Verification layer

Reddit/forum/social complaints are **signals**, not product truth.

Before Miloosh publishes claims, verify vendor facts against preferred sources:

1. official pricing
2. official product/docs/help
3. official trust/security
4. official terms/contract docs
5. reputable secondary sources only when primary evidence is unavailable

### 4. Remedy selector

Choose the fastest useful Miloosh response:

- update an existing software page
- build a pain page
- build/extend calculator
- build a comparison
- create a migration guide
- generate a social post
- prepare a journalist pitch
- create newsletter item
- no action

### 5. Reddit community registry

Maintain per-subreddit state:

- rules URL
- verified timestamp
- self-promotion policy
- link policy
- disclosure expectations
- flair/account-age requirements
- notes/mod guidance

Rules go stale. Re-verify before a candidate is promoted to posting-ready status.

### 6. Reply composer

The system may prepare a draft, but publishing must remain human-approved unless Miloosh later has explicit platform authorization and community rules clearly permit automation.

Draft requirements:

- answer the actual question first
- standalone useful content
- no fake firsthand experience
- no undisclosed affiliation
- no repetitive canned response
- no vote solicitation
- no unsolicited DM
- link only when allowed and genuinely useful

### 7. PR amplifier

High-scoring pain clusters may become PR opportunities when they reveal a broader pattern, for example:

- multiple free tiers shrinking
- AI/credit pricing confusion
- per-seat economics becoming unaffordable for teams
- migration pressure caused by contract/pricing changes

A PR hook is publishable only after Miloosh has independently verified enough data to support a broader finding.

### 8. Forecast/backtest loop

Forecast records should eventually store:

- forecast created time
- horizon
- predicted pain classes
- probability/confidence
- evidence available at forecast time
- whether material pain actually appeared
- time to first confirmed pain signal
- resulting search-demand change
- resulting asset traffic/leads/clicks/revenue

The model should be calibrated over time. High forecast scores must empirically outperform low forecast scores or the weights must be changed.

### 9. Measurement

Every distributed Miloosh asset should use first-party attribution and the existing human-classification layer.

Track:

- pain candidate ID / forecast ID
- source type
- asset produced
- channel
- classified human sessions
- engaged humans
- CTA exposure
- CTA clickers
- newsletter leads
- affiliate clicks
- revenue

The learning loop should reward pain signals and forecasts that produce real human movement, not posts or impressions.

## Next implementation steps

1. Merge and test the pure scoring/gating/forecasting core.
2. Add persistent `PainCandidate` and forecast ledger storage.
3. Add approved-source ingestion adapters.
4. Add candidate deduplication and signal aggregation.
5. Add vendor-fact verification workflow.
6. Add remedy selector that maps candidates/forecasts to Miloosh assets.
7. Add subreddit rules registry and freshness TTL.
8. Add human-review queue UI/report.
9. Add PR-cluster detection across vendors/intents.
10. Add forecast backtesting/calibration.
11. Wire outcome attribution back into scoring weights.

## Non-negotiable guardrails

- no unauthorized Reddit scraping
- no API use without required approval
- no commercial API use outside permitted terms
- no mass promotional posting
- no unsolicited mass DMs
- no fake personas
- no ban/rate-limit/moderation evasion
- no vote manipulation
- no presenting Reddit anecdotes as verified vendor facts
- no presenting forecasts as confirmed vendor actions
- no auto-linking when subreddit rules are unclear

The desired machine is aggressive in **speed, coverage, scoring, verification, prediction and execution** — not aggressive toward community rules.
