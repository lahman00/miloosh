# Google Demand Capture — Executive Summary — 2026-09-26

Branch `claude/gsc-demand-20260926`, isolated worktree, built on top of
`claude/wave2-attack-20260926` (a different, already-completed same-day
sprint that had real, tested fixes to Pipedrive/Wrike/WhatConverts — read in
full, not redone). Local commits only. **Nothing pushed, merged, or
deployed.**

## The single biggest finding this session surfaced

Miloosh has **1,705 of ~1,923 pages not indexed by Google — only 218 are
indexed.** Of the 1,705, **1,645 (96.5%) are pages Google successfully
crawled and explicitly chose not to index** ("crawled but not indexed" /
"crawled - currently not indexed"), not a technical crawlability, robots.txt,
or redirect problem (those account for only 60 of the 1,705). This was
confirmed directly in a live, authenticated Google Search Console session
this session, not inferred.

Both of this mission's two named priority pages — Pipedrive (351
impressions, 0 clicks, position 78.0) and Wrike (238 impressions, 0 clicks,
position 88.4) — are individually in this same "crawled, not indexed"
bucket. This reframes the whole diagnosis: **their 0% CTR at deep positions
is best explained by not being in the index for most of the measured
window, not by a title, snippet, or internal-linking problem.** Real
internal-link-graph analysis (computed directly from the catalog, not
estimated) shows Pipedrive is actually the **#6 most-linked product
site-wide out of 354, and #2 in its own CRM category** — internal linking
is already a strength, not the bottleneck. Wrike is weaker (#93/354, #8/12
in its category) but sits under an active, real 28-day measurement
experiment (ending 2026-10-08) that this session did not touch.

## What changed this session
1. Fixed two unsupported/stale claims about Pipedrive in
   `data/guides/registry.ts` (an unverifiable popularity claim, an
   unsupported comparative-cost claim contradicted by the guide's own data,
   and stale tier names/prices) — commit `a88bd27`. Full detail:
   `changes.md`.
2. Requested indexing directly via live Google Search Console for both
   `/software/pipedrive` and `/software/wrike` — both confirmed received.
   Wrike's request does not touch its content or links (respecting the
   active experiment); it only asks Google to crawl a page it hadn't
   crawled since before the experiment's own intervention existed.

## What was deliberately not changed
- Wrike's page content/links (active experiment through 2026-10-08).
- Zoho CRM's page/links to Pipedrive/Close (a different active experiment
  through 2026-10-10).
- Pipedrive's title/meta/H1 (no override exists; the generated defaults
  already match measured "alternatives" intent) or its internal links
  (already strong by real measurement).

## Broader mining results (next-20+ opportunities, link graph, intent map)
A dedicated research pass was run against the same real GSC exports used
above (537-page, 1,000-query property-wide captures) plus the full
comparisons/catalog/guide-registry data. Full detail in
`gsc-opportunities.json`, `internal-link-graph.json`, and
`intent-ownership.json`; ranked queue in `remaining-opportunities.md`.
Headlines:
- **13 real Tier A candidates** beyond Pipedrive/Wrike, all using the
  existing `AlternativeDecisionGuide` mechanism with already-published
  comparisons routing to a verified active affiliate partner — no new
  content infrastructure needed. The strongest single cluster: Jasper,
  Copy.ai, Perplexity, and Synthesia (619 combined impressions) all have
  real, published comparisons to ElevenLabs.
- **9 true orphan products** (zero inbound links from any source) — none
  are active affiliate partners, so this is a catalog-connectivity gap,
  not a monetization mismatch.
- **5 active affiliate partners are in the bottom quartile of internal
  linking** (Volza, Jotform, MailerLite, Omnisend, SurveyMonkey) — a real,
  evidenced mismatch between site architecture and commercial priority.
  Not fixed this session: the correct mechanism (which *other* product's
  guide should name them) needed more care than remaining time allowed to
  execute well; documented precisely in `internal-link-graph.json` and
  `remaining-opportunities.md` rather than rushed.
- **13 products have a decision guide but no SERP title/description
  override** (mulesoft, salesforce, clickup, and 10 others), so Google
  still shows generic sitewide-style snippets for pages with real,
  measured "alternatives" demand.
- **Notion and Trello show real demand fragmentation**: both get under 2%
  of their product family's combined search impressions on their own
  page, with the rest spread across comparison pages — both also lack
  their own decision-guide entry despite Notion being the single
  most-linked product on the entire site.

## Confirmed per the mission's success conditions
1. Pipedrive: a real content-accuracy fix landed, real internal-link
   strength confirmed (not a weakness), and a real, evidence-backed
   indexing request submitted.
2. Wrike: audited, evidence-backed indexing request submitted without
   touching anything the live experiment measures.
3. 13 real Tier A opportunities identified with existing infrastructure
   ready to route to (`gsc-opportunities.json`).
4. Internal-link mismatches identified and precisely diagnosed
   (`internal-link-graph.json`).
5. Intent-ownership gaps mapped, including 2 real fragmentation cases and
   13 pages with unaligned SERP snippets (`intent-ownership.json`).
6. Decision content: unchanged this session beyond the two Pipedrive
   guide-accuracy fixes; wave2's earlier work already covered this well.
7. Revenue attribution: untouched. No analytics, funnel, or affiliate code
   was modified this session.
8. No fabricated SEO/product/affiliate claim — the one substantive content
   change this session made *removed* two such claims.
9. Full QA evidence in `qa.md`.
10. Next execution queue, ranked by evidence and impact, in
    `remaining-opportunities.md`.
