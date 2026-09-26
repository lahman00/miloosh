# Why We Don't Rank War — Phase V Executive Summary (2026-09-26)

Continuation of `claude/miloosh-master-google-war-20260926`. Mandate: answer the master
question — if pages are indexed, intent-matched, factually strong, and useful, why do they
still rank deep? — with evidence, trying to falsify each of five candidate explanations
(competitive content gap, information gain gap, authority gap, domain/entity trust gap, SERP
format gap) rather than assuming any is true.

## The answer, in one sentence

**The evidence converges on a domain-level trust gap, not a page-level content gap**, for most
of the deep-ranking cohort — and this session found three independent, mutually-corroborating
pieces of hard evidence for it, not just one.

## The three findings that converge

1. **A narrow, consistent position band across unrelated categories.** Across 19 completely
   different software categories (accounting to AI to ecommerce), median ranking position sits
   in a tight 45.5-79.1 band, with a site-wide median of 71.2. If page-level content quality
   were the dominant factor, categories would show far more variance. They don't
   (`domain-pattern.json`).
2. **Zero branded search demand.** Not one recorded impression for any query containing
   "miloosh" across the full 3-month window (`brand-demand.json`) — independently consistent
   with HubSpot's own real rejection reason for Miloosh's affiliate application: "Low reach
   (traffic, followers)."
3. **Close to zero real external authority.** GSC's own Links report shows exactly 100 total
   external links, ~93 of which come from a single domain (vercel.app) that is almost certainly
   infrastructure/preview-deployment noise, not editorial endorsement. The real external link
   count is roughly 6, from 4 real domains, and **every single one points to the homepage** —
   not one individual software, comparison, or guide page has ever earned an external link
   (`authority-gap.json`). This data also independently confirmed one of Phase II's unverified
   offsite claims (the Qevra directory listing is real) and surfaced two previously-undocumented
   real links (hypestar.org, roasty.tech) worth reconciling with the user.

## The other lanes were checked and mostly ruled out or found not to be the primary driver

- **Competitive content gap / information gain**: Phase IV already showed 13 of 15 researched
  Tier-A pages have no fixable intent or content problem. This session's information-gain audit
  found most pages sit at genuine MODERATE gain (real sourced pricing/cons, not vendor-marketing
  fluff) but stopped short of buyer-specific decision logic (seat math, migration checklists) —
  a real but secondary gap, not the primary explanation (`information-gain.json`).
- **SERP format gap — real, and it explains WHY some queries are more winnable than others.**
  Live SERP composition checks found "alternatives to [massive SaaS brand]" queries are
  dominated by the vendor itself, competing vendors' content marketing, and massive media/
  directory brands (Salesforce, Forbes, G2, AlternativeTo) — essentially unwinnable for a new
  independent site regardless of content quality. Comparison queries for less-mainstream,
  specialist products (like Umbraco, ~0.1% CMS market share) face dramatically weaker
  competition — small agencies, not giants. This directly validates Phase IV's Umbraco
  intervention as strategically correct, and gives a concrete rule for future prioritization
  (`serp-competitors.json`).
- **Editorial/entity trust content**: already solid before this session (real About, Editorial,
  Sources, and Corrections policies) — the real, fixable gap was one layer down, at the
  structured-data level.

## What was executed

One real, evidence-backed, zero-fabrication fix: the sitewide Organization schema (rendered on
every page) was missing `logo`, `description`, and `contactPoint` despite all three already
existing as real, public facts elsewhere on the site. Added them. Commit `075d3ec`.

No large per-page treatment cohort (the mission's own 10-15-page ask) was forced. Given the
evidence points to a domain-level constraint that no snippet or content edit can fix, spending
further pages on page-level tweaks already shown (in Phase IV) not to be the bottleneck would
have been exactly the "SEO theater" this mission's own success criteria define as failure.

## Gate results

tsc, full vitest suite (2138 tests), lint, validate:data, and build all pass. See `qa.md`.
