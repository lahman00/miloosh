# QA — Citable Research Asset Factory (2026-09-26)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors (run twice, once after the research page + API routes, once after the hub page) |
| `npx vitest run` (full suite) | 247 files / 2149 tests passed (11 of them new, in `tests/lib/support-pricing-benchmark.test.ts`) |
| `npm run lint` | Clean (2 `no-html-link-for-pages` errors and 1 unused-var warning were found and fixed during development, not left in) |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems (run after adding LiveAgent/Re:amaze pricing) |
| `npm run build` | Production build succeeds; `/research`, `/research/customer-support-pricing-2026`, and both new API routes all appear in the route manifest |
| `npm run maintenance:seo` | 0 issues across 1778 titles / 1736 descriptions / 984 sitemap entries |
| `npm run maintenance:links` | 148 pre-existing issues out of 1060 URLs checked — see note below. None involve any of the 16 customer-support vendors, LiveAgent, or Re:amaze. |

## Link-check note

`maintenance:links` reported 148 non-OK outcomes sitewide: 104 `bot_blocked` (anti-automation
pages, not real breakage), 36 `cross_domain_redirect` (benign vendor domain moves), 4
`client_error`, 2 `redirect_chain_too_long`, 1 `connection_failure`, 1 `not_found`. The 8
genuinely concerning ones were individually inspected and all belong to unrelated products
(Contentful, DocuSign, PandaDoc, Shopify, Webflow, Close) untouched by this session -- a
pre-existing sitewide condition, not something this session introduced or was scoped to fix.

## Browser QA

Verified live against the dev server (`npm run dev`, port 3000):

- **Desktop (1440-equivalent / pane default):** headline stat cards, AI-usage-pricing table,
  crossing-scenario table, full 16-row dataset table, methodology, buyer implications, and
  related-reading links all render correctly with real data (not placeholders).
- **390×844 and 320×700:** confirmed `document.body.scrollWidth === window.innerWidth` at
  both widths (no page-level horizontal overflow); wide tables scroll independently within
  their own `overflow-x-auto` containers, matching the existing SaaS Pricing Pressure Index
  page's pattern.
- **Dataset JSON-LD:** confirmed the rendered `<script type="application/ld+json">` on the
  page is a valid schema.org `Dataset` object with real `name`, `description`, `url`,
  `datePublished`, `creator`, `license`, and two `DataDownload` distribution entries.
- **Downloads:** fetched `/api/research/customer-support-pricing-2026` (JSON) and its `/csv`
  sibling directly; both return the full 16-row dataset with correct headers
  (`Content-Type: application/json` / `text/csv; charset=utf-8`,
  `Content-Disposition: attachment` on the CSV route). CSV has 17 lines (header + 16 rows)
  with correct quoting on fields containing commas.
- **Internal links:** every "Related reading" and vendor-name link on the new page (category,
  4 product pages, 2 comparison pages) returns HTTP 200.
- **Organization schema (Phase V fix):** re-confirmed live on the homepage — `logo`,
  `description`, and `contactPoint` are all still present and correct; untouched by this
  session's changes.
- No merchant navigation occurred during QA.

## Scope note on "rendered crawl"

No `npm run` script for a full-site rendered crawl exists in this repo (checked
`package.json` and `scripts/`); prior sessions' mentions of one referred to ad hoc manual
browser checks, which this session performed for every new/changed route specifically
(listed above) rather than a full 1,778-page crawl, which was out of scope for the two pages
and two API routes actually added.
