# Indexation discovery fix — 2026-09-29

Branch: `claude/revenue-acquisition-20260929`  
Base: `7ae5946`

## What changed

The local `growth:indexation-readiness` audit exposed two high-factual-depth pages that failed only because no existing Miloosh page pointed to them:

- `/software/chili-piper` — factual depth A, 0 inbound discovery links.
- `/software/hibob` — factual depth A, 0 inbound discovery links.

Rather than add generic/sitewide links, this change adds one semantically relevant buyer path to each:

- Cal.com now names Chili Piper when a buyer needs qualification/routing around scheduling rather than only a booking link.
- BambooHR now names HiBob when a buyer needs a broader mid-market/enterprise HR platform with workforce planning and compensation depth.

The alternative descriptions are derived from the existing sourced Chili Piper and HiBob software records; no new vendor claim was invented.

## Measured local effect

Before:
- PASS 149
- WARN 61
- FAIL 14
- PROTECTED 130

After:
- PASS 149
- WARN 63
- FAIL 12
- PROTECTED 130

Both pages moved out of `NO_INTERNAL_DISCOVERY`; this is a Miloosh readiness improvement, **not a prediction or claim that Google will index them**.

## QA

- `npx vitest run tests/growth/indexation-readiness.test.ts` — 1 file / 6 tests passed.
- `npm run -s validate:data` — 354 software pages, 27 categories, 1,348 comparisons, 0 problems.
- `npm run -s growth:indexation-readiness` — completed; FAIL count reduced from 14 to 12.

## External state

No deploy, push, indexing request, partner action, email, or other external mutation was performed by this code change.
