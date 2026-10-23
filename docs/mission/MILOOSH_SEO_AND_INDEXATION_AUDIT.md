# SEO and indexation audit (2026-10-23)

Method: static analysis of a complete production build of branch `claude/mission-55min-20261023` (1,786 prerendered pages, Next.js 16.4.2) plus the build's own `sitemap.xml`. **No Search Console, GA4 or live crawl data was available**, so nothing below says what Google has indexed; the last authenticated GSC capture is from 2026-10-09 and the next authenticated check is planned for 2026-10-24. Canonical host was not tested (local build uses the fallback site URL); only paths were compared.

## Checks that found no defect (evidence)
| Check | Result |
|---|---|
| Canonical present and equal to the page path | 1,785 of 1,785 content pages; 0 mismatches (the only page without a canonical is the not-found shell) |
| Sitemap URLs that are `noindex` | 0 of 693 |
| Duplicate URLs in the sitemap | 0 |
| Sitemap URLs with no built page | 1 (`/recommend`, a dynamic page, expected) |
| `noindex` pages in the build | 2 (the not-found shell and an internal route) |
| JSON-LD blocks that fail to parse | 0 (Organization 1,785, BreadcrumbList 1,778, ItemList 1,737, FAQPage 389, CollectionPage 27) |
| Duplicate `<title>` values | 0 across 1,786 pages |
| Pages with no `<meta name="description">` | 1 (the not-found shell) |
| Pages with no `<h1>` | 0 |
| Internal links that resolve to no built page or redirect | 0 real defects. The scan flagged `/resources/ecommerce-platform-decision-checklist.html`; it is a static file in `public/resources/` and returns 200 live |

Intentional exclusions were respected: 1,093 built pages are not in the sitemap (693 listed) and none was added or changed; no robots, noindex, canonical or sitemap setting was touched.

## Findings
1. **Every content page links to a redirecting URL.** The shared navigation links to `/research`, which permanently redirects to `/research/saas-pricing-pressure-index-2026` (`next.config.ts`). 1,785 pages carry that link. Impact: a redirect hop on every footer or menu click and a weak internal-link signal to the final URL. The fix is a one-line href change in a shared component, which would re-render **every page including the protected and held ones**, so it was not made. Owner decision: bundle with the post-2026-11-04 release, or accept the redirect.
2. **Stale pricing claims exist where data cannot be edited yet.** GetResponse's stored record (last verified 2026-08-20) says a 30-day trial, a "Free Plan" and tiers "Email Marketing $15.58 / Marketing Automation $48.38 / Ecommerce Marketing $97.58" billed monthly. GetResponse's own pricing page read on 2026-10-23 shows a **14-day** free trial and plans Starter, Marketer and Creator at **$19, $59 and $69 monthly and $15.58, $48.38 and $56.58 per month on yearly billing (-18%)**. So the stored "monthly" figures are the annual-billing prices and the trial length is wrong. GetResponse's pages share data with held pages, so the record is not editable until the 2026-11-04 release.
3. **A heuristic scan found 41 verified records stored as monthly whose own notes mention annual billing** (for example Notion, ClickUp, Close, Monday, Airtable, Basecamp, GetResponse). Many are correct (notes give both prices); the true cases cannot be separated without reading each vendor page. The site's price-label convention (`lib/pricing-display.ts`, `data/seo/price-label-hold.json`) governs what is shown for held pages; this is a candidate list for a verified batch after the hold, not a defect list.
4. **Thin or near-duplicate content, internal-link gaps, intent cannibalization and search snippet quality were not measured** (they need GSC query data that was unavailable). Not assessed, not assumed fine.

## Security finding that affects SEO delivery
`npm audit` reported a critical advisory set for the pinned Next.js 16.4.0 (unauthenticated remote code execution in the image optimization API with SVG, remote code execution in `use cache` functions, and a Server Actions denial of service), fixed in 16.4.2. This branch updates to 16.4.2. Exposure was not proven: the repository has no `use cache`, one Server Actions file (`lib/revenue/affiliate-pipeline-actions.ts`) and no SVG optimization setting. Treat as: production still runs the affected version until this is released.

## What was changed for SEO
Nothing in robots, canonical, noindex, sitemap or structured data. The only page-level change is the vendor-link row on the eight v2 comparison pages (conversion, not indexation).
