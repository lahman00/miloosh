# Second-Asset Decision — CRM Plan Gates 2026

## The four candidates, scored

The mission named four candidates: CRM plan gates, AI-voice commercial-use limits, email-marketing
pricing structures, and ecommerce migration constraints. Each was checked against real Miloosh
catalog data and the parallel authority worktree's own existing plans before building anything.

| Candidate | Data completeness | Primary-source coverage | Buyer usefulness | Citation potential | Demand signal | Verdict |
|---|---|---|---|---|---|---|
| **CRM plan gates** | 10 CRM products in catalog, but the *specific* plan-gate data (which tier unlocks what) didn't exist anywhere -- had to be researched fresh | High once researched: all 7 target vendors yielded primary-sourced, high-confidence answers | High -- answers a real, recurring buyer question ("which plan do I actually need") that pricing pages don't answer directly | High -- a genuinely new comparison angle, not a repackaging of public list prices | Not measured this session (no GSC pull) | **Built.** See below. |
| **Ecommerce migration constraints** | 11 ecommerce products, 9 with verified pricing | Would need fresh research (export limits, lock-in terms aren't in the pricing schema) | Real, but this exact asset concept is **already Asset B** in the parallel Codex/Antigravity worktree's `linkable-deep-assets.md` (found this session, different worktree) | N/A -- would duplicate | N/A | **Not built.** Duplication risk with concurrent work already in flight elsewhere in this repo. |
| **AI-voice commercial-use limits** | 16 AI-category products, 9 verified | Would need fresh research | Real, narrower audience | N/A -- would duplicate | N/A | **Not built.** This is **Asset C** in the same parallel plan (ElevenLabs character-cost model). Same duplication risk. |
| **Email-marketing pricing structures** | **Does not exist.** No `email-marketing` category in `data/categories/categories.json` -- the closest real category is the much broader `marketing` (23 products, mixed tool types) | N/A | N/A | N/A | N/A | **Not built.** The candidate itself doesn't map to a real, scoped catalog segment; would need a scoping session before any research could start. |

## Why CRM plan gates is the strongest available choice

1. **Not already claimed.** Unlike the ecommerce and AI-voice candidates, nothing in the parallel
   authority worktree's plans touches CRM plan-gate research -- zero duplication risk.
2. **Real, unmet buyer need.** Every one of the 7 target CRMs' pricing pages shows a price per seat
   but not which named tier a specific feature (email sync, automation, sequences) requires. That
   gap is exactly the kind of question a buyer has to open 3-4 help-center tabs to answer today.
3. **The research came back clean.** All 7 vendors yielded `"confidence": "high"` results with
   explicit, itemized `unknownFields` where something genuinely couldn't be confirmed (never
   silently filled in). See `dataset-audit.json`'s sibling data in
   `lib/crm-plan-gates/data.ts` for the full per-vendor record.
4. **It resists becoming a ranking.** The mission explicitly required "no vendor ranking... a
   buyer-decision dataset, not best CRM." The plan-gate framing is naturally non-comparative: a
   feature gated behind an upgrade is a packaging fact, not a quality judgment, and the built page
   states this explicitly in its own methodology section and includes a dedicated test
   (`tests/lib/crm-plan-gates.test.ts`) asserting no row ever exposes a score, rank, or weighted
   total.

## What was built

`/research/crm-plan-gates-2026` -- see `methodology.md` for the full sample/verification
description, and `changes.md` for the exact files. Headline, non-ranking findings:

- Only **1 of 7** (Zoho CRM) includes sales sequences/cadences on its entry paid plan.
- **5 of 7** include two-way email sync on their entry (or free) plan.
- **4 of 7** include workflow automation on their entry paid plan.
- **3 of 7** (Pipedrive, Close, monday CRM) disclose no cap on the number of pipelines.
- Only **1 of 7** (monday CRM) has a confirmed minimum seat count (3 seats) to purchase any plan.

## What would make a future email-marketing or ecommerce/AI-voice asset viable

- **Email marketing**: first needs a real scoping decision -- either add an `email-marketing`
  category to the catalog with a defined product list, or explicitly narrow the candidate to
  "marketing automation platforms with an email-sending core" from within the existing broader
  `marketing` category.
- **Ecommerce / AI-voice**: check with the parallel Codex/Antigravity worktree on the actual
  publication status of Assets B and C before starting independent work, to avoid two branches
  producing conflicting versions of the same research asset.
