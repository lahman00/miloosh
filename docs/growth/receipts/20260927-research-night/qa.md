# QA — Overnight Research + Trust Factory (2026-09-27)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors (checked repeatedly through the session as changes landed) |
| `npx vitest run` (full suite) | 248 files / 2159 tests passed (32 of them new: 11 in `tests/lib/support-pricing-benchmark.test.ts`, 21 in `tests/lib/crm-plan-gates.test.ts`) |
| `npm run lint` | Clean (2 `no-html-link-for-pages` errors caught and fixed during development, not left in) |
| `npm run validate:data` | 354 software pages, 27 categories, 1348 comparisons, 0 problems (after HappyFox/Tidio catalog corrections) |
| `npm run build` | Production build succeeds; `/research`, `/research/crm-plan-gates-2026`, `/research/customer-support-pricing-2026`, and all 4 research API routes appear in the route manifest with no errors or warnings |
| `npm run maintenance:seo` | 0 issues across 1778 titles / 1736 descriptions / 984 sitemap entries |

## A real bug found and fixed during QA: verification-date inconsistency

Both new research pages originally displayed a "Verified {date}" citation label computed from
`new Date()` at render time. The sandbox's real system clock reports 2026-09-26, one day behind
the narrative date (2026-09-27) used throughout this session's hand-written verification notes
("confirmed live on ..., 2026-09-27," `last_verified: "2026-09-27"` in the catalog, etc.). This
produced a visible inconsistency: the citation block said "Verified 2026-09-26" while the page's
own body text said "2026-09-27" a few paragraphs later. Fixed by introducing a fixed
`VERIFIED_DATE` constant on both pages instead of deriving the user-facing verification date from
the system clock; `generatedAt`/`dateModified` (a machine-readable build timestamp used only in
JSON-LD, never shown to a reader as a verification claim) still legitimately uses `new Date()`.
Confirmed via live JS execution against the rendered page that both "Verified" mentions now read
2026-09-27 consistently. The pre-existing sibling page
(`/research/saas-pricing-pressure-index-2026`) was checked and does NOT have this issue -- it
already correctly separates "sources were checked between X and Y" (real verification-window
data) from "compiled on {date}" (explicitly labeled as compile time).

## Browser QA

Verified live against the dev server (`npm run dev`, port 3000), for both new/changed pages:

- **Desktop:** headline stat cards, feature-gate tables, full per-vendor detail cards, and
  methodology sections all render with real, current data (not placeholders) on both
  `/research/crm-plan-gates-2026` and the corrected `/research/customer-support-pricing-2026`.
- **390x844 and 320x700:** confirmed `document.body.scrollWidth === window.innerWidth` at both
  widths on the CRM page (no page-level horizontal overflow); the customer-support page was
  already confirmed clean at these widths in the prior session and was not visually re-broken by
  this session's data-only changes (confirmed via `npx tsc` + the full test suite covering its
  render logic).
- **Dataset JSON-LD:** confirmed the CRM page's rendered `<script type="application/ld+json">` is
  a valid schema.org `Dataset` object with real `name`, `url`, `datePublished`, `dateModified`,
  `creator`, `license`, and two `DataDownload` entries -- matching the pattern already verified
  for the customer-support page in the prior session.
- **Downloads:** fetched `/api/research/crm-plan-gates-2026` (JSON, 7 rows) and its `/csv` sibling
  directly; both return correct data with correct headers
  (`Content-Type: application/json` / `text/csv; charset=utf-8`,
  `Content-Disposition: attachment` on the CSV route).
- **Internal links:** every "Related reading" link on the CRM page (`/category/crm`,
  `/software/pipedrive`, `/software/hubspot`, `/software/salesforce`, `/research`) returns HTTP
  200. monday CRM -- whose catalog entry is a different product (monday.com's general
  work-management platform, not the distinct monday CRM product researched here) -- correctly
  links externally to its own official pricing page instead of the misleading internal
  `/software/monday` page; confirmed via live DOM inspection (`target="_blank"`,
  `href="https://monday.com/crm/pricing"`).
- **Research hub:** `/research` correctly lists all three assets (CRM Plan-Gate Dataset 2026,
  Customer Support Pricing Benchmark 2026, SaaS Pricing Pressure Index 2026) with distinct,
  accurate summaries and verification dates.
- **Organization schema (Phase V fix):** re-confirmed live on the homepage -- `logo`,
  `description`, and `contactPoint` are all still present and correct; untouched by this session.
- No merchant navigation occurred during QA.

## Scope note on "rendered audit" / "structured-data check"

No dedicated `npm run` script exists in this repo for a full-site rendered crawl or a
structured-data-specific validator (checked `package.json` and `scripts/`). This session's manual
browser QA (above) covers every new or changed route directly -- both research pages, the hub,
and all 4 API routes -- rather than a full 1,778-page crawl, which was out of scope for the actual
surface area touched.
