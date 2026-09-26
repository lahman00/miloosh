# Google Crawl + Index + Rank War — Phase III Executive Summary (2026-09-26)

Continuation of `claude/miloosh-master-google-war-20260926`. This phase's mandate: preserve
Phase II's three-lane correction (crawl vs. index-selection vs. ranking), build the real
canonical dataset behind it, and use fresh evidence to test — not assume — every hypothesis
in the 43-part mission brief.

## What actually shipped (code, real evidence, committed)

**`9ea8bfa` — the Google War engine now models what Phase II discovered, permanently.**
This is the single most important thing this phase did. `lib/google-war/evidence.ts` already
had the right vocabulary (`IndexState` already distinguished `DISCOVERED_NOT_INDEXED` from
`CRAWLED_NOT_INDEXED`) — it just had almost no real data feeding it (31 of 1736 rows, ~2%
coverage, all from individual URL Inspections in prior missions). This session:

- Converted every real bulk-GSC capture from Phase II (and fresh Phase III captures) into
  1209 proper `Inspection` observations and appended them to the existing, version-controlled
  `data/growth/google-war/reported-inspections.json` evidence store — the canonical ingestion
  point this system already had, extended rather than replaced.
- Real indexation-state coverage jumped from 31/1736 rows (2%) to **1225/1736 (71%)**.
- Added two new prioritization lanes to `lib/google-war/priority.ts`, additive and
  backward-compatible (every existing test still passes unchanged): `CRAWL_RECOVERY`
  (fires on `DISCOVERED_NOT_INDEXED` — a crawl-priority signal) and
  `RANKING_STRIKING_DISTANCE` (indexed, position 8-30, real demand — Part 27's "may produce
  traffic faster than indexation recovery" case).
- The dashboard (`var/growth/google-war/latest.md`) now leads with INDEXED /
  DISCOVERED_NOT_INDEXED / CRAWLED_NOT_INDEXED / UNKNOWN as separate headline numbers, broken
  down by route type, plus real transitions since the previous capture — per Part 42,
  never collapsed back into one number again.
- 7 new tests lock in the lane-separation invariants Part 43 asked for verbatim: DISCOVERED
  ≠ CRAWLED_NOT_INDEXED, neither is INDEXED, a bare successful fetch isn't INDEXED, sitemap/
  canonical parsing alone isn't crawl evidence, impressions are never read as index-state
  evidence.

## The three biggest evidence-backed findings

1. **The DISCOVERED_NOT_INDEXED population is, overwhelmingly, a demand problem, not a
   technical one.** 100% of the 136 real DISCOVERED_NOT_INDEXED software pages and 100% of
   the 627 real DISCOVERED_NOT_INDEXED comparison pages show **zero** observed GSC
   impressions. By contrast, 95% of CRAWLED_NOT_INDEXED software pages and most
   CRAWLED_NOT_INDEXED comparison pages show at least some demand. Google isn't crawling
   these pages because, as far as this site's own data shows, nobody is searching for them.
   This directly falsified the premise behind Part 15's "discovery hub experiment" before it
   was run: there is no real-demand subset of the DISCOVERED population to select a treatment
   cohort from. **This session did not force that experiment** — running it on zero-demand
   pages would test nothing a rollback-safe architecture change could meaningfully move.
2. **Wave 1/2/3's own indexation delta tracks wave age, not treatment intensity** — and this
   is itself informative. Wave 1 (oldest): treatment 42.9% now indexed vs. control 20%. Wave 2
   (middle): 16.7% vs. 7.7%. Wave 3 (newest, last session's own work): **0% vs. 30%** — the
   opposite direction. Per Part 19-20's own caution, a page Google hasn't recrawled since a
   change cannot be called a failed treatment — Wave 3 simply hasn't had time yet. Wave 1's
   result is the first real, if small (n=14), positive signal for the whole engagement's core
   pricing/cons playbook. Recommend re-checking Waves 2 and 3 again in 2-4 weeks.
3. **DISCOVERED_NOT_INDEXED software pages are substantially newer** (median data-research
   date over a month later than indexed/crawled pages) — a real, honest confound consistent
   with finding #1, not a separate crawl-quality problem to invent.

## What was deliberately not executed, and why

- **Part 15-17 (discovery hub experiment)**: not run. See finding #1 — the evidence
  disconfirmed the premise before execution, which Part 5's own "do not invent a crawl-quality
  problem where age/demand explains the difference" instruction directly anticipates.
- **Part 36 (sitemap priority experiment)**: not run. Real supporting evidence exists (55%
  sitemap coverage of public pages; 58% of sitemap-listed known-state URLs are still not
  indexed), but Part 36's own instruction requires "rollback is easy" and strong evidence
  before touching a sitewide production surface — this session documents the finding
  (`route-type-and-inventory.json`) rather than acting on a one-shot capture.
- **Part 31 (backlink/external authority correlation)**: not attempted — this session has no
  external backlink data source (GSC's own Links report was not pulled this session; flagged
  as backlog).
- **Part 20 (per-URL crawl-timing classification)**: only done at wave-age granularity (see
  above), not per individual URL — that would need ~97 additional individual URL Inspections
  (~30+ minutes) this session did not spend, having already used a large amount of browser
  time on the bulk bucket captures that made the engine upgrade possible.
- **Parts 29-30, 32-34 (Semrush/Intercom/Freshdesk re-check, ElevenLabs, off-site,
  affiliate/HubSpot)**: GSC's own processing date (2026-09-21) is unchanged since Phase II's
  capture — reconfirmed live before starting this phase — so Phase II's classifications for
  these stand without needing to be redone. No new off-site activity occurred to reconcile.
- **Parts 25-28 (ranking war) executed as analysis, not content edits**: real striking-distance
  (7 URLs) and high-impression deep-ranking (85 URLs) candidate lists were computed directly
  from committed data (no new browser work needed). The 2 unprotected striking-distance pages
  already have good, specific snippets and already-enriched underlying data — nothing to edit
  without inventing a reason. The 85-URL deep-ranking pool (mulesoft, clickup, salesforce,
  confluence, n8n, and more, all unprotected) is real, substantial, ranked backlog for a
  dedicated ranking-focused session.

## Gate results

tsc, full vitest suite (2138 tests), lint, and build all pass clean after every change. See
`qa.md`.
