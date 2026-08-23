# Miloosh Pain Forecasting Engine

## Purpose

Pain Radar reacts to pain that already exists. Pain Forecasting tries to identify buyer pain before it becomes widespread enough to dominate communities or search demand.

This is a forecasting system, not a certainty engine. Every forecast must preserve its evidence, horizon, confidence, and later outcome so Miloosh can backtest whether the signal was actually predictive.

## Forecast horizons

- **7 days** — imminent buyer pain: pricing-page edits, free-tier contraction, deprecations, seat minimums, contract/pricing changes, feature gating.
- **30 days** — likely near-term pain: rollout effects, new usage/credit models, AI billing changes, migration deadlines, support-policy changes.
- **90 days** — strategic risk: M&A, support degradation, pricing-model divergence, persistent sentiment acceleration, search-demand anomalies.

## Signal classes

### First-party vendor signals

Highest-value early signals include:

- pricing-page changes
- terms changes
- free-tier contraction
- plan renaming or repackaging
- seat minimum changes
- usage/credit billing introduction
- AI pricing changes
- feature gating
- sunset/deprecation notices
- migration-policy changes
- support-policy changes
- contract changes
- risky release notes

These should normally carry more evidentiary weight than community complaints because they can precede complaints.

### Market and buyer signals

- acceleration in complaints/questions
- search-demand anomalies
- rising alternatives/migration queries
- widening price gap versus credible competitors
- repeated procurement objections across independent sources

These are demand/impact evidence, not vendor-fact evidence.

### Strategic weak signals

- acquisition/M&A
- layoffs or support-team contraction
- ecosystem consolidation

These must stay low-confidence unless reinforced by stronger buyer-visible evidence. Miloosh must never claim an acquisition or layoff automatically means a price increase or support failure.

## Forecast output

Every vendor forecast must contain:

- horizon
- probability score
- severity score
- Miloosh opportunity score
- LOW / MEDIUM / HIGH confidence
- likely pain classes
- complete evidence list
- recommended pre-emptive action

Possible actions:

- PREBUILD_ASSET
- PREPARE_PR_POSITION
- PREPARE_MIGRATION_GUIDE
- PREPARE_PRICING_ALERT
- MONITOR_CLOSELY
- NO_ACTION

## Pre-emptive remedy model

The system's advantage is speed before the crowd arrives.

Examples:

### Free tier is being reduced

Before complaint volume peaks:

1. verify the vendor change;
2. calculate affected user/team economics;
3. prepare the alternatives/switching asset;
4. prepare social/newsletter alert;
5. watch relevant search/community demand;
6. publish only once the claim is supportable and timing is useful.

### Vendor announces deprecation

Prebuild:

- migration guide
- alternatives table
- deadline timeline
- migration-cost calculator if data permits

### AI credits or usage pricing introduced

Prebuild:

- plain-language pricing explainer
- usage scenarios
- bill-risk calculator if defensible
- PR/data angle if the change belongs to a broader verified market pattern

## Backtesting

Forecast records must eventually store:

- forecastCreatedAt
- predicted horizon
- predicted pain classes
- probability/confidence
- evidence available at forecast time
- whether material pain actually appeared
- time to first confirmed pain signal
- resulting search-demand change
- resulting asset traffic/leads/clicks/revenue

The system should optimize for calibrated forecasts, not dramatic forecasts.

A forecast score of 80 should eventually be right materially more often than a forecast score of 40. If it is not, weights need recalibration.

## Guardrails

- Never present a forecast as a confirmed vendor action.
- Never infer future pricing from M&A/layoffs alone.
- Never manufacture urgency.
- Community anecdotes are evidence of sentiment/demand, not proof of vendor policy.
- Vendor facts require authoritative verification.
- Predictions must remain auditable and revisable.
- No trading/investment claims should be derived from this system.

## Long-term moat

The moat is not a one-time prediction model. It is the accumulated history of:

**signal → forecast → actual pain → remedy → distribution → human response → conversion**

Over time Miloosh should learn which vendor signals predict which buyer pains and how early it can respond without sacrificing accuracy.
