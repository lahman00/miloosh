# Measurement Plan — Umbraco Comparison SERP Overrides

## What to check, and when

| Window | What to check |
|---|---|
| Day 0 (2026-09-26, this receipt) | Baseline recorded in `baseline.json`: umbraco-vs-wordpress at 0 own impressions/clicks, CRAWLED_NOT_INDEXED, generic title. |
| Day 7 | Re-check indexation state for all 3 comparison URLs via the GSC Pages report (same live-check method used throughout this engagement). Re-check /software/umbraco's own query mix for any shift in the "umbraco vs wordpress" share. |
| Day 14 | Same checks. If umbraco-vs-wordpress has been recrawled (a real last-crawl-date check, not assumed), record whether its state changed. |
| Day 28 | Full re-check: indexation state, any new impressions/position/clicks of its own, and whether /software/umbraco's "umbraco vs wordpress" query impressions have declined (which would suggest the comparison page is starting to compete for/win that intent). |

## What NOT to do

- Do not manually request indexing for these 3 URLs this session or in the next few days — no
  quota was spent, and per the standing discipline, a page that hasn't been given time to be
  naturally recrawled after a change should not be manually pushed and then judged.
- Do not declare success or failure before Day 14 at the earliest. A snippet change does not
  cause an overnight ranking or indexation shift.
- Do not add more content, links, or schema to these 3 pages before the Day 28 check — Part 38's
  "change one primary thing per URL" discipline means this specific intervention (SERP metadata)
  should be evaluated on its own before layering anything else on top.

## Success metrics (Part 40)

Primary: umbraco-vs-wordpress transitions from CRAWLED_NOT_INDEXED toward INDEXED, or begins
recording its own impressions/clicks for "umbraco vs wordpress"-family queries (currently 0).
Secondary: /software/umbraco's share of "umbraco vs wordpress" impressions declines (suggesting
Google is starting to prefer the more specific page). Revenue is downstream of both and not
directly measured this cycle -- no conversions are claimed or invented.
