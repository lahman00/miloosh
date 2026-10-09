# Search Console capture notes, 2026-10-08/09

How this capture was made, what was cross-checked and what is not in it. The data
files sit beside this note; `manifest.json` is the machine-readable description.

## Method

- Property `sc-domain:miloosh.com`, search type Web, no filters unless a table says so.
- Read from the property owner's signed-in Search Console (Hebrew interface) in the
  Claude desktop built-in browser. Tables were read from the rendered page and written
  in the layout of the Search Console "Export" download.
- **Read-only.** No export download, no Request Indexing, no "Test live URL", no
  sitemap action, no saved filter, no property or account setting touched. Report
  filters live in the page address and were discarded by navigating away. One
  mis-click applied a transient "query is not ..." filter to the report view; it was
  not saved anywhere and was removed by loading the next address.
- The Search Console API connector was not used and is not claimed to work; the
  repository's own Search Console agents are disabled here because their service-account
  credential is not readable on this machine.

## Windows

| Table | Window | Notes |
| --- | --- | --- |
| historical | 2026-07-23 to 2026-08-19 | The property has data only from 2026-08-07: 13 observed days of 28. |
| recent | 2026-09-08 to 2026-10-05 | 28 days, finalised under the three-day rule. |
| daily (context) | 2026-07-23 to 2026-09-07 | One row per day; used for the daily series and the cliff. |
| daily (recent) | 2026-09-08 to 2026-10-08 | 2026-10-06 to 2026-10-08 are shown as zero by the UI but lie after `dataThrough`: they are **not final**, and the importer marks them so instead of reading them as measured zeros. 2026-10-05 is the last final day. |

`dataThrough = 2026-10-05` is capture date (2026-10-08, Pacific) minus three days, the
processing delay the repository's date helper also assumes. Search Console does not
print a final-data date, so this is an assumption, not a Google statement.

## Cross-checks

- **Historical pages table:** 487 rows of 487 reported (below the 1,000-row display
  limit), merged to 480 canonical pages (seven www/apex pairs). Row-sum clicks 9 equal
  the report header. The header shows impressions only as "25.6K"; the exact total
  25,646 is the sum of the 13 daily rows from 2026-08-07 to 2026-08-19. The row sum is
  25,780 because a result can list several of the site's URLs.
- **Daily series:** largest one-day fall 2026-08-20 (2,087 impressions) to 2026-08-21
  (46). Reported as timing only; no cause is asserted.
- **Recent pages table:** 6 rows (sum 44 impressions). The daily series sums to 39 and
  the header says 1 click, 39 impressions; the 5-impression difference is the same
  multi-URL effect.
- **Queries:** the property-wide historical query table lists 1,000 rows; only the
  first 10 were read (the rows-per-page control was unreliable), so it is a partial
  table and is marked so. Recent queries: 2 listed, the rest anonymised.
- **Page-level query tables** (five pages, historical window, filter "Page contains
  /software/<slug>"): clickup 37 rows, activecampaign 28, mulesoft 51, sprout-social 33,
  confluence 32. Each table's declared impression total (428, 233, 479, 383, 338)
  equals that page's row in the historical pages table, which is how the importer
  decides to attribute it. Listed rows cover 304, 155, 420, 343 and 289 impressions;
  Search Console does not list anonymised queries, so the rest are not in the rows.
- **Exact-page checks:** the same five pages, recent window, the same filter: 0 clicks
  and 0 impressions each.
- **Cannibalization probes (partial):** for the leading query of each of the five pages,
  the report filtered to that exact query (historical window, page breakdown) listed
  exactly one Miloosh page, the page itself: "clickup alternatives" (123 impressions)
  and "activecampaign alternatives" (80), "mulesoft vs wso2" (44) and "mulesoft
  alternatives" (19) and "sprout social alternatives" (88) and "confluence alternatives"
  (98). So no overlap was measured for those six queries. This is six probes, not a
  site-wide measurement: cannibalization stays `NOT_MEASURED` as a general statement.

## Indexation and crawl evidence

- **Sitemap report:** `https://miloosh.com/sitemap.xml`, submitted and read 2026-10-08,
  Success, 692 discovered pages. The live file read on 2026-10-09 (HTTP 200,
  last-modified 2026-10-08 11:07:52 GMT) holds 692 unique URLs.
- **Page indexing report** (last updated by Google 2026-10-04, before the 2026-10-07
  and 2026-10-08 releases): 211 indexed, 1,325 not indexed. Reasons: crawled, currently
  not indexed 844 (validation failed 2026-10-05); alternate page with proper canonical
  58; page with redirect 2; a second "crawled but not indexed" group of 421 whose
  sampled rows show no last-crawl date (English name of that group not verified).
- **Crawl stats** (updated 2026-10-06): 83.6K requests in 90 days, 98 ms average
  response, no host issues; per-URL samples show crawls as late as 2026-10-03/04.
- **URL Inspection, indexed version only,** for eight URLs (`url-inspections.json`).
  All eight: "URL is not on Google", crawled but not indexed, crawl and indexing allowed,
  page fetch successful, Google canonical equals the URL. Last crawls fall between
  2026-08-08 and 2026-10-07, every one before the 2026-10-08 release.
  The per-URL "Sitemaps" row says "none detected" or "temporary processing error" for
  URLs that the live sitemap lists; it reflects Google's stored discovery data, not the
  current file, and no sitemap defect is asserted.

## Not in this capture (NOT_MEASURED or NOT_VERIFIED)

- Query-by-page rows for every page, so cannibalization is `NOT_MEASURED` (six probes above aside).
- A daily crawl-stats series, and Google's crawl dates for pages outside the samples.
- Search Console's manual-actions and security-issues pages were not read in this run.
- Any figure for rankings, difficulty or authority beyond Search Console's own average position.

## Interface notes for the next capture

- URL parameters that work: `start_date`, `end_date` (`YYYYMMDD`), `breakdown`
  (`query|page|date`), `metrics=CLICKS,IMPRESSIONS,CTR,POSITION`, the page filter
  `page=*<path>` ("contains"), and the exact-query filter `query=!<text>`. A full-URL
  `page=` value is ignored.
- The rows-per-page control is unreliable and text read right after a change can be
  stale. Open the listbox through its reference and choose the 250 option, or paginate.
- When the page-text reader returns the cached main view, read `document.body.innerText`.
- Query-level files are private: this repository is public and keeps them outside git
  (`~/MilooshReceipts/20261009-growth-agent-system/`). The manifest lists them with
  `visibility: private`, so a run without them warns instead of failing.
