# Tier A actions — Pipedrive and Wrike — 2026-09-26

Branch `claude/gsc-demand-20260926`, isolated worktree, started at `f1e147d`
(tip of `claude/wave2-attack-20260926`, which had already made real,
committed, well-tested content fixes to Pipedrive and Wrike earlier the same
day — read in full before starting, not redone). Local commits only.
**Nothing pushed, merged, or deployed.**

## Pipedrive — `/software/pipedrive`

### OBSERVED (real, measured evidence)
- GSC page-level export (property-wide, captured 2026-09-25T12:27:07Z,
  `~/MilooshReceipts/20260925-first-revenue-integrity/gsc-page-table.json`):
  351 impressions, 0 clicks, avg position 78.0.
- GSC query-level export (same capture, `gsc-query-table.json`): "pipedrive
  alternatives" 75 imp / pos 71.1; "pipedrive alternative" 47 imp / pos 80.5;
  "pipedrive competitors" 29 imp / pos 82.8; plus 10+ more real query rows
  (crm like pipedrive, better than pipedrive, pipedrive vs trello, freshworks
  vs pipedrive, pipedrive vs freshsales, trello vs pipedrive, freshsales vs
  pipedrive, pipedrive vs airtable, alternatives to pipedrive, pipedrive
  alternative for client/real-time feedback) — full list in
  `../../../.gsc-work/queries.json` (not committed; private Mac export).
- **Live GSC URL Inspection (performed directly this session, 2026-09-26):**
  status "Crawled - currently not indexed" (נסרק - לא נכלל באינדקס כרגע).
  Last crawl 2026-08-30T19:22:52Z, crawl allowed: yes, crawl succeeded: yes,
  indexing allowed: yes, Google-selected canonical = the page's own URL
  (no canonicalization conflict). Discovered via Sitemaps, the homepage, and
  `/software/copper`.
- Sitewide indexation coverage (live GSC, same session): 1,705 pages not
  indexed vs. 218 indexed. Of the 1,705, breakdown by reason: 58 "alternate
  page with proper canonical tag" (fine), 2 "page redirects elsewhere"
  (fine), 820 "crawled but not indexed", 825 "crawled - currently not
  indexed". **1,645 of 1,705 (96.5%) are Google choosing not to index
  despite successful, permitted crawls** — not a technical/crawlability
  problem. Pipedrive and Wrike are both in this majority bucket.
- Internal link audit (real, computed from `data/software/*.json`,
  `data/comparisons.ts`, `data/seo/alternative-guides.ts`,
  `data/guides/registry.ts` via `getRoleGuidesForSoftware`): Pipedrive has
  **22 real inbound edges** (7 other products list it as an alternative, 12
  published head-to-head comparisons, 3 AlternativeDecisionGuide mentions),
  plus 3 `data/guides/registry.ts` role-guide appearances. Combined rank:
  **#6 of 354 products site-wide, #2 of 10 in the CRM category** (only
  behind HubSpot). Full detail: `pipedrive-wrike-link-audit.json` in this
  directory.
- Affiliate status (re-verified directly against `data/affiliate/active-
  partners.ts` and `data/affiliate/canonical-ledger.ts`, not assumed from
  the earlier wave2 receipt): ACTIVE, decision 2026-08-19, issued URL
  `https://aff.trypipedrive.com/ajtcgyu06e7i`, 90-day cookie window,
  PartnerStack. No `current-affiliate-truth.ts` override exists (none
  needed).
- No SERP title/description override exists for Pipedrive
  (`data/seo/serp-overrides.ts` has zero `pipedrive:` entries). The
  generated defaults (`lib/generators.ts`) are Title: "Best Pipedrive
  Alternatives", H1: "Best Pipedrive alternatives" — **already
  alternatives-led, matching the dominant measured query intent.**

### DIAGNOSIS (evidence-backed hypothesis, not a claim about Google's algorithm)
Given: (a) the page is not indexed despite a technically clean, permitted,
successful crawl, (b) internal link equity is already strong (top 2% of the
whole catalog), (c) the title/H1 already lead with "alternatives", the
0%-CTR/position-~78 pattern shown in the performance report is best
explained by **the page not being in the index at all for most of the
measured window**, not by a snippet, internal-linking, or title problem.
Position/CTR optimization at this stage would very likely have been the
wrong lever — the real blocker is index selection, not on-SERP presentation.
The wave2 sprint's content improvements (removing a pricing-unit bug, adding
4 sourced cons, a decision FAQ with FAQPage JSON-LD, 2 new comparison
alternatives) are exactly the kind of change that could plausibly move a
"crawled but not indexed" decision on a fresh crawl — but Google's last
crawl (2026-08-30) predates every one of those fixes.

### CHANGED
1. **Two unsupported/stale claims in `data/guides/registry.ts` fixed** (see
   `changes.md` for the commit). Scoped to Pipedrive's own entries in two
   role guides; the rest of this large shared file was left alone.
2. **Indexing requested directly via live Google Search Console** for
   `https://miloosh.com/software/pipedrive` — confirmed "Indexing request
   received" (2026-09-26). This is a single, evidence-backed request for a
   real Tier A page, not a mass submission, per the mission's own explicit
   Section 11 guidance.
3. **No internal-link changes were made to or from Pipedrive's page.**
   Evidence showed linking is already strong (#2 in category); adding more
   links was not editorially justified.
4. **No title/meta/H1 change.** The existing generated defaults already
   match measured intent; Pipedrive also sits in
   `scripts/growth/gsc-opportunity-miner.ts`'s hardcoded
   `LEGACY_PROTECTED_COHORT`, a conservative legacy safety list (not backed
   by any currently-live "MEASURING" experiment receipt for this exact
   page, which was checked directly — see `changes.md`), so on-page
   copy/title changes were held to the same standard wave2 already applied
   ("No title or SERP override").

### NOT VERIFIED
- Whether the indexing request actually results in inclusion in the index —
  Google does not guarantee this, and outcomes take real time to observe.
- Any ranking, click, or conversion change from this session's work.
- Merchant page load, signup, sale, or commission.

## Wrike — `/software/wrike`

### OBSERVED
- GSC page-level: 238 impressions, 0 clicks, avg position 88.4 (same
  2026-09-25 capture).
- GSC query-level: "wrike alternatives" 71 imp / pos 91.3; "wrike
  alternative" 50 imp / pos 91.9; "alternative to wrike" 24 imp / pos 93.6;
  "wrike competitors" 11 imp / pos 89.3; "wrike vs zoho projects" 7 imp;
  "alternatives to wrike" 6 imp; "best wrike alternative for remote teams"
  6 imp; "wrike vs workfront" 3 imp; "wrike alternatives free" 3 imp.
- **Live GSC URL Inspection (performed directly, 2026-09-26):** status
  "Crawled - currently not indexed". Last crawl **2026-08-16T12:59:50Z —
  before the wave2 content fixes (2026-09-26) AND before the currently
  running measurement experiment's own intervention (2026-09-10)**.
  Discovered via Sitemaps, the homepage, and `/software/smartsheet`.
- **Wrike is under an active, real measurement experiment**:
  `docs/work-revenue-experiment-receipt-2026-09-10.json`, id
  `work-revenue-20260910-wrike`, decision `MEASURING`, baseline 187
  impressions / 0 clicks / position 90.9, 28-day window, PRIMARY checkpoint
  due **2026-10-08**. Its own `internalLinksChanged` field lists
  `/software/wrike` — i.e. the intervention itself touched links on that
  page; this is not an instruction to add more.
- Internal link audit: Wrike has 14 real inbound edges (2 alternative
  mentions, 11 comparisons, 1 guide mention), 1 role-guide appearance.
  Combined rank **#93 of 354 site-wide, #8 of 12 in project-management** —
  genuinely weaker than top project-management tools (ClickUp #3, Asana #4,
  Monday #9), unlike Pipedrive.
- Affiliate status (re-verified): ACTIVE since the PartnerStack welcome
  2026-08-25; commission rate not disclosed by the network. Payout rail
  `partnerstack-personal`: OWNER_ACTION_REQUIRED (no payment provider, no
  tax location on file) — real, pre-existing, unrelated to this session.

### CHANGED
1. **Indexing requested directly via live Google Search Console** for
   `https://miloosh.com/software/wrike` — confirmed "Indexing request
   received" (2026-09-26). This does not touch page content or internal
   links (the two things the live experiment protects), and arguably
   *protects the experiment's own validity*: its 28-day measurement is
   supposed to detect whether the 2026-09-10 content change affected
   ranking, but Google had not yet crawled that changed page at all
   (last crawl predates the intervention by 25 days). Requesting a fresh
   crawl only accelerates Google's own natural discovery of a change that
   already happened.

### NOT CHANGED (respecting the active experiment)
- No content, copy, title, meta, or internal-link change was made to or
  from `/software/wrike` this session. Its own weaker relative link
  position (#93/354) is a real, evidence-backed finding worth acting on
  after 2026-10-08, not before.

### NOT VERIFIED
- Whether the fresh crawl will land before or after the 2026-10-08 primary
  checkpoint, or what it will show.
- Any ranking, click, or conversion outcome.
