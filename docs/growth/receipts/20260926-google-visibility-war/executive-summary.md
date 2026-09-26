# Google visibility war — implemented, local integration candidate

Date: 2026-09-26. Branch: `codex/google-visibility-war-20260926`.
Base: `af33baeef83f9909c24b6e610f4080a02850835b`.
Worktree: `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/codex-google-visibility-war-20260926`.

## Built and used

`npm run growth:google-war` now produces a permanent, source-labelled review queue, rendered internal-link graph, top-50 commercial queue, factual-completeness guard, intent checks, experiment protection, persistent inspection deltas and a manually reviewed indexing-request queue. See `../../GOOGLE_VISIBILITY_CONTROL.md` for commands and limitations.

The report uses 537 cached authenticated GSC page rows (491 exact canonical URLs), not estimated demand. Window: 2026-08-07 through 2026-09-23; captured September 25. Its 31 inspection records distinguish five raw authenticated UI captures from 26 reported inspections in Claude's committed evidence. UNKNOWN stays null. No new Google inspection or indexing submission was made.

The real HTML inventory contains 1,782 pages: 354 software, 1,348 comparisons, 34 guides, 27 categories and 19 hubs/other public routes. Its crawlable graph increased from 78,244 to 78,252 anchors: eight new unique source/target paths, zero removals. Rankings, product facts, titles, meta descriptions, H1s, affiliate destinations, sitemap and robots configuration were not changed.

## Actual site changes

Four existing guides now have a small server-rendered decision-navigation section. Eight links point to four existing software decision pages and three existing comparisons. No new page or client bundle was introduced.

| Target | Source pages before → after | Guide sources before → after |
|---|---:|---:|
| Jotform | 7 → 9 | 0 → 2 |
| MailerLite | 9 → 10 | 1 → 2 |
| Omnisend | 9 → 10 | 1 → 2 |
| SurveyMonkey | 8 → 9 | 0 → 1 |
| Volza | 3 → 3 | 0 → 0 |

All five remain two clicks from home. We claim a gain in relevant source diversity, **not** shorter minimum depth or measured Google authority. The export has no exact software-page row for these five: demand is UNKNOWN, not zero. Volza remains HOLD because a new unrelated web-analytics link would not solve its trade-intelligence discovery problem.

## Corrections to earlier research

- The nine reported “true orphans” are not true orphans: each has two rendered source pages, including its category/hub, and is two clicks from home. They remain contextual near-orphans. No unnecessary noindex, redirect or filler link was added.
- Notion has 3 own-page impressions and **204** across eight exact canonical comparison rows. The earlier 207 comparison total included the own-page 3. Trello has no own-page row (UNKNOWN), 35 canonical comparison impressions and a separate www comparison row with 2; do not silently sum variants into 37.
- Those aggregates do not prove same-query cannibalization. Structural intent/canonical checks found zero conflicts. No Notion/Trello URLs were merged or redirected.
- Current crawled-not-indexed observations do not prove why historical CTR was zero. Successful crawl, HTTP 200 and sitemap membership are distinct from index inclusion. Backlink/domain-authority causation was not established.

## Guards and scope

All 42 locally protected/reserved pages retain identical direct incoming/outgoing edge footprints. Wrike remains protected beyond the October 8 checkpoint until its MEASURING record is reviewed; Claude's 14 treatment and 10 control pages were not edited. The 43 high-impression A/B software completeness baselines have an automated regression test. Two repeated caution paragraphs are warnings, not failures or evidence that facts must be rewritten.

The indexing queue contains **zero READY_TO_REQUEST** entries. These are local improvements with `deployedAt: null`. Existing September 26 Pipedrive/Wrike requests are recorded, not repeated. No deployment, push, merge, social action, affiliate account change, merchant navigation, or production Blob write occurred.

## Result and limitations

Implementation and local verification passed; this is **not a production deployment receipt** and does not claim new rankings, indexation, clicks, conversions or revenue. Full QA and paths are in `qa.md`. The current architecture and protection changes are ready for deliberate integration with Claude's newer committed work, followed by release gates. Do not blindly merge worktrees or call the entire shared worktree clean.
