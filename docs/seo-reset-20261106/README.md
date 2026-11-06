# SEO reset 2026-11-06

`index-decisions.csv` holds one row per `/compare/*` and `/software/*` URL (1,703 rows) and is the evidence behind `data/seo/index-allowlist.ts`. It includes 3-month Search Console impressions, clicks and average position for every URL (www and apex aggregated) and the repo quality-gate result.

Columns:
- `decision`: `INDEX` or `NOINDEX`.
- `reasons`: why the page got that decision.
- `gsc_impressions_3mo`: Search Console impressions, 2026-08-07..2026-11-03, read from the authenticated UI on 2026-11-06.
- `unique_text_ratio`: the share of the page's 6-word shingles that appear on no other built page.
- `gsc_clicks_3mo`, `gsc_avg_position_3mo`: clicks and impression-weighted average position for the same window.
- `crawlable_inbound_links_before`: crawlable internal links into the page, from the production build `1791b9f` before the reset.
- `repo_quality_gate`: `PASS` or `FAIL` from `lib/discovery-continuity.ts` on 2026-11-05.

Rule (a page must also pass the repo quality gate):
- Comparison: kept if it had at least 10 impressions, is a v2 verified-template page, or is a hand-built partner decision page.
- Software: kept if it had at least 50 impressions, is an active affiliate partner, or is a product in a v2 comparison.

Pages marked `NOINDEX` stay live as `noindex, follow`, are left out of the sitemap, and are no longer linked from hubs. Re-admit a page only after it gains first-hand, page-specific content. Owner-facing plan: `01-Command-Center/SEO-BREAKTHROUGH-2026-11-06/PLAN_HE.md` in the Miloosh project folder.
