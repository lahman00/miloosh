# Cloro visibility integration — 2026-09-27

## Scope

Cloro is connected to Miloosh as a bounded, read-only-by-default visibility source for Google Search and AI answer surfaces. The API key is not stored in the repository; it is stored locally with restrictive permissions and Claude's hosted Cloro MCP is connected separately.

## First measured baseline

The first run used three prompts across ChatGPT, Perplexity, and Google Search (9 total requests). Exact charged cost: **54 credits** from the 500-credit free allowance, leaving an estimated **446 credits**.

Observed on this single US-targeted run:

- Brand prompt: Miloosh was surfaced by **ChatGPT, Perplexity, and Google Search**.
- ChatGPT cited `miloosh.com`.
- Perplexity cited `miloosh.com`.
- Google Search placed `miloosh.com` at **organic position 7** for the monitored brand query `miloosh software research`.
- Generic customer-support pricing prompt: **no Miloosh mention/citation/result** across the three monitored providers.
- Generic CRM email-sync/sequences prompt: **no Miloosh mention/citation/result** across the three monitored providers.

This is a baseline observation, not a visibility share estimate and not proof of stable ranking.

## Safety model

`npm run growth:cloro-visibility` performs **no network request** and only materializes the committed baseline into the private `var/` report store.

A live run requires all of:

1. `CLORO_API_KEY` in the environment.
2. Explicit `--live`.
3. A bounded `--budget` (default 60 credits).

The default three-prompt / three-provider run is estimated at 54 synchronous credits. A live run refuses to start when the estimate exceeds the budget.

## Command-center integration

The Cloro report is now consumed by:

- Authority report
- Morning Google/operations report
- Google Command Center

All three preserve the distinction between brand recognition and generic category visibility.

## Validation

- 264 test files passed.
- 2,370 tests passed.
- TypeScript passed.
- ESLint passed.
- Data validation passed: 354 software pages, 27 categories, 1,348 comparisons.
- Command-center composition test passed locally using existing release artifacts.
- No production deployment was performed.
- No additional Cloro credits were consumed after the 54-credit baseline.
