# Search Console capture format

The importer (`lib/growth-agents/gsc-import.ts`) is credential-free. Evidence
enters as a **capture directory**: `manifest.json` plus CSV tables in the layout
of the Search Console "Export" download. A capture can come from an export file
or from tables read off the owner's signed-in Search Console; the manifest says
which. A worked example, with real data, is
`docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009/`.

Nothing here reads files or the network. A bad capture throws `GscImportError`
listing **every** problem at once, so it is fixed in one pass.

## Tables

| Kind | First column | Required columns |
| --- | --- | --- |
| `pages` | `Top pages` | `Clicks`, `Impressions` (`CTR`, `Position` optional) |
| `queries` | `Top queries` | same |
| `dates` | `Date` (`YYYY-MM-DD`) | same |

Counts must be exact whole numbers. Rounded display values such as `25.6K` are
rejected. Clicks may not exceed impressions; a row with zero impressions may not
carry a position; a URL or date may not appear twice; a page URL must be a
Miloosh page.

## `manifest.json`

```jsonc
{
  "schemaVersion": 1,
  "captureId": "gsc-capture-YYYYMMDD",
  "property": "sc-domain:miloosh.com",
  "searchType": "web",
  "filters": {},                          // {} means no filters, never "unknown"
  "timezone": "America/Los_Angeles",      // Search Console days are Pacific days
  "capturedAt": "2026-10-08T22:25:00Z",
  "capturedVia": "ui-table-capture",      // or "ui-export-csv" | "api"
  "dataThrough": "2026-10-05",            // last day Google had finalised
  "dataThroughRule": "how dataThrough was derived and that it is an assumption",
  "tables": [
    {
      "id": "pages-historical",
      "role": "historical",               // "historical" | "recent" | "context"
      "kind": "pages",
      "file": "pages-historical.csv",     // bare file name; no path separators
      "window": { "start": "2026-07-23", "end": "2026-08-19" },
      "firstDataDate": "2026-08-07",      // first day the property had data; earlier days are "no data", not zero
      "rowsReported": 487,                // the pager's total ("1-N of M" gives M)
      "complete": true,                   // true only if every reported row is in the file
      "zeroIfAbsentJustification": "why a missing page means no impressions (complete, unfiltered, finalised)",
      "propertyTotals": { "clicks": 9, "impressions": 25646, "position": 74.4 },
      "visibility": "committed"           // "private" for search queries: kept outside git
    }
  ],
  "exactPageChecks": [],                  // {url, window, result: "NO_DATA"|"DATA", checkedAt, method}
  "notes": []
}
```

Rules the importer enforces:

- The historical and recent windows of one kind may not overlap, and the
  historical window must end before the recent one starts.
- `complete: true` needs exactly `rowsReported` rows; `complete: false` needs
  fewer. A partial table is a warning, never a silent zero.
- A window that ends after `dataThrough` is not final (warning); its days after
  `dataThrough` are marked non-final and left out of property totals.
- A private table that is not provided is a warning (`query-level evidence is
  NOT_MEASURED`), a committed table that is missing is an error.

## Reading the tables from the UI (when no export exists)

- Use the date range controls or the URL parameters `start_date`, `end_date`,
  `breakdown`, `metrics=CLICKS,IMPRESSIONS,CTR,POSITION`.
- The rows-per-page control can be unreliable and the text returned right after a
  change can be stale: read again after waiting, or paginate. When the page text
  shows the cached main view, read `document.body.innerText` instead.
- Record the pager total, then confirm that the captured rows add up to the
  report header's clicks. The header impressions may be rounded ("25.6K"); take the
  exact figure from the daily series sum and say so in the capture notes.
- Read only. No export download, no Request Indexing, no URL live test, no
  sitemap action.
- The repository is public and keeps query-level data outside git: write query
  tables to a private folder (for example `~/MilooshReceipts/<run>/`) and point
  `--gsc-private-dir` at it.

## Indexation sidecars (all optional, all read-only)

Each is a small JSON file in the same directory with `schemaVersion: 1`, a
`kind`, `property`, `capturedAt` and `source`. An absent sidecar is
`NOT_MEASURED`, never a clean bill of health.

| File | `kind` | Holds |
| --- | --- | --- |
| `sitemaps.json` | `sitemaps` | submitted, last read, status, discovered pages |
| `page-indexing.json` | `page-indexing` | indexed and not-indexed totals, reasons, validation state, `reportLastUpdated`, sampled last-crawl dates |
| `crawl-stats.json` | `crawl-stats` | total requests, average response time, per-host status, `reportLastUpdated` |
| `url-inspections.json` | `url-inspections` | per URL: coverage state, last crawl, canonicals, with `indexedVersionOnly: true` |

A report Google last updated before a release says nothing about that release.
`url-inspections.json` accepts **indexed-version** readings only: a live test or an
indexing request must never be recorded there, and the schema rejects the file if
`indexedVersionOnly` is not `true`.

## Per-page evidence (`--extras-file`)

A JSON array of `{ "url": "...", "live": Measured, "rendered": Measured, "intent": Measured, "contentGapConfirmedAgainstVendor": boolean }`.
Several entries for one URL are combined. Leave a field out when it was not checked.

- `live` is `{status, canonical, robotsMeta, xRobotsTag, indexable}` and `rendered`
  is `{sponsoredLinkCount, partnerSlugs, unmatchedAnchorTexts}`. Produce both with
  `npm run growth:page-check -- --urls <url,...> --out <file>`; it makes plain GET
  requests to Miloosh's own pages only and never requests the links it finds.
  `indexable` means nothing on the page or in its response blocks indexing and the
  page names itself as canonical; it says nothing about whether Google indexed it.
- `rendered` is the ground truth for the monetisation path: the registry says which
  partner calls to action a page should carry, the rendered page shows which it does.
  A mismatch keeps the gate `UNKNOWN`.
- `intent` is `{queries: [{query, impressions}], commercial}`, read from the Search
  Console queries table filtered to this exact page and the historical window.
  `commercial` is a judgement that the queries describe a purchase decision (best,
  alternatives, pricing, versus, review); say so in the capture notes.
- A content gap is confirmed only against current official vendor documentation.
