# Miloosh Google visibility collapse: technical forensics, 2026-10-26

Branch `work/gsc-recovery-20261026`, baseline `9130c2c` (deployed). Skill used: `miloosh-google-recovery-director` (read-only phases 1-3; no cohort handed to an editor). Status of everything below: **IMPLEMENTED_LOCAL + TESTED locally. Nothing is deployed, pushed, submitted or requested.**

Labels: OBSERVED = measured by me today; GSC-REPORTED = supplied by ChatGPT from the authenticated UI (not re-verified by me); HYPOTHESIS = not proven.

## 1. Bottom line

1. **No crawl-blocking or indexing-control defect exists on the live site.** OBSERVED, see section 2. A technical-block explanation for the collapse is falsified for everything I could test from outside.
2. **A verified technical weakness is loss of crawlable discovery and re-crawl pathways for ~1,000 comparison URLs**, created by deliberate changes on 2026-09-24 (`e9a7fa7`, `c7e7148`):
   * 1,001 of 1,348 comparisons are out of the sitemap (347 remain).
   * Those same URLs also lost their software-page links. `app/software/[slug]/page.tsx:109-122` filters its "compare" links through the same `shouldSubmitComparisonToSitemap` function. Only 59 of the 1,001 still get a link from any software page.
   * `/compare` server-renders only the first 72 entries (`components/CompareGrid.tsx:17`, the rest need a JS "Show more" click). Only 72 comparisons are linked from the hub in HTML.
   * Result (OBSERVED, crawl of 1,784 pages): **325 comparison URLs have zero crawlable inbound links and are not in the sitemap; 459 have at most one; 406 are reachable only from other comparison pages.** Median inbound links: 6 for sitemap comparisons, 2 for the rest.
   * **Correction using 2026-10-26 authenticated GSC URL Inspection:** The Hebrew 905-group label must not be assumed to mean "Discovered but never crawled." Three URLs with that *exact displayed reason*—`/software/semrush`, `/software/airtable`, and an orphan comparison `/compare/1password-vs-wiz`—show successful Googlebot smartphone crawls on 2026-08-18, 2026-09-25, and 2026-08-28, respectively. These URLs WERE crawled and are still not indexed. Their current lack of crawl paths could hinder future re-crawling, but cannot explain why they were not indexed after those earlier crawls. The 905 URL set was not exported, so no numeric equivalence to the orphan set is justified.
3. **A second, independent time bomb:** the sitemap and the software-page links call `isSoftwareIndexingReady(software, new Date())`, so the gate shrinks with the build date even if nothing changes. Offline projection (reproduces production exactly today: 265 ready software, 347 eligible comparisons):

   | build date | ready software | eligible comparisons |
   |---|---|---|
   | 2026-10-26 | 265 | 347 |
   | 2026-11-09 | 235 | 278 |
   | 2026-11-25 | 190 | 160 |
   | 2026-12-25 | 78 | 43 |

   Not the cause of the Aug-Oct collapse (today the freshness reasons block 0 pages by themselves; the 90 blocked software pages fail `pricing-evidence`, which is not date-based). It will accelerate the same discovery problem if left alone.
4. **The site-wide 3-month average position is 74.2; past high-impression pages often ranked in the 70s–80s** (GSC-REPORTED, avg position 74.2 over 28,500 impressions / 11 clicks). The collapse to 12 impressions might represent loss of deep-rank appearances, failure to re-crawl after content changes, reduced visibility around an algorithm update, or site-quality evaluation. The available evidence cannot distinguish these causes. I cannot tell whether Google dropped pages or simply stopped showing deep-rank results. Do not call this a penalty (Manual Actions: none, GSC-REPORTED).

I did **not** change which pages are linked, in the sitemap or noindexed. Reasons in section 6.

## 2. What was checked and found healthy (OBSERVED, 2026-10-26 ~09:50 UTC, Googlebot UA string and a plain UA)

| Check | Result |
|---|---|
| `/`, `/robots.txt`, `/sitemap.xml` | 200 for both UAs. `x-vercel-cache: HIT`, `cache-control: public, max-age=0, must-revalidate`. |
| `robots.txt` | `Allow: /`, `Disallow: /internal/`, sitemap line present. Nothing else blocked. |
| Host/scheme | `www.` → 301 to apex; `http://` → 308 to https. Single canonical host. |
| All 1,784 public routes crawled (sitemap + all 1,348 comparisons + 355 software) | **1,784 / 1,784 status 200, 0 with a robots-meta `noindex`**, canonical equals own URL on a 30-page sample. No `X-Robots-Tag` on the home or sitemap headers. |
| Sitemap | 693 `<loc>` (GSC read 692 on Oct 8; +1 since is consistent with code changes after Oct 8). 673 carry `lastmod`; 374 share `2026-10-07` (a constant, `COMPARISON_TEMPLATE_UPDATED_AT`); newest `lastmod` is Oct 8. |
| Source indexing controls | `noindex` exists only on `/recommend/results`, `/newsletter/unsubscribe`, `/internal/*`. Software and comparison pages never emit it. `tests/seo/sitemap-vs-noindex-policy.test.ts` pins that. |

Interpretation: the "some pages deliberately noindex" in the brief does not apply to software/comparison routes in this baseline; sitemap exclusion is not noindex.

## 3. Timeline (git, not Google)

* 2026-08-07: 221 software JSON files. By 2026-09-23: 358 (catalog +~60%; `e6ab23d` on 09-07 added curated expansion comparisons; comparisons reached 1,348).
* 2026-09-24: sitemap focused to proven pages (`e9a7fa7`, `c7e7148`), after the previous sitemap carried ~1,526 entries (per `app/sitemap.ts` history comment). Same day `0c415fb` normalised non-canonical hosts.
* 2026-10-07/08: site-wide quality audit and premium audits (`828c569`, `b74c241`, `80eb1e5`); sitemap submitted 10-08, last read 10-08 (GSC-REPORTED). **Nothing indicates Google re-read the sitemap in the 18 days since.**
* 2026-10-16: `/research` permanent redirect (`912378b`).

These dates are correlation only. Falsifier for the discovery hypothesis: if URL Inspection shows an orphan comparison was already successfully crawled before links were removed, initial discovery failure is not its problem. **This falsifier was observed for `/compare/1password-vs-wiz` (last crawled 2026-08-28); the question shifts to re-crawl frequency and content quality, not initial discovery.**

## 4. Why I did not blame the sitemap alone

Google documents the sitemap as a discovery hint, not an index-control. Excluding URLs from a sitemap does not by itself remove them, but removing both the sitemap entry and the internal links leaves Google no fresh signal that a URL matters. The existing code comment claiming that suppressed routes "retain contextual links from their two software pages" is misleading. Its correction is documented here without editing the shared SEO source file to avoid unintentionally triggering a protected shared-template release.

## 5. Unknowns and what would settle them

* **Which URLs are in the 905 / 357 / 58 buckets.** Individual URLs were not exported. Export the three lists from GSC Page indexing (Export → CSV) and compare them with `crawl-graph-20261026.json` orphan/in-sitemap sets. This would measure how the URL sets overlap, but alone would not prove why Google did not index the pages.
* **Whether Googlebot is crawling at all.** Crawl Stats (Settings → Crawl stats): requests/day, by response and host, since Aug 1. Not accessible to me. If requests stopped around Oct 8-19, the cause is demand/quality-side, not link-graph-side.
* **The 58 "alternate page with proper canonical".** Not investigated. Likely duplicates by trailing slash or query parameters, but UNKNOWN. Inspect 3 of them.
* **GA page views are not Search impressions.** Do not use first-party/GA sessions to confirm or deny the GSC drop. Clicks (11 in 80 days) are also not revenue; no revenue inference is made here.
* The four reported groups are 905 with Hebrew label "נסרק - לא נכלל באינדקס כרגע", 357 with "נסרק אך לא נכלל באינדקס", 58 alternate canonical, and 2 redirected. **Do not translate either 905 or 357 to the English Discovered/Crawled categories without independent confirmation.** URL Inspection proves that sample URLs in the 905 group have successful historical crawls.

## 6. Decisions deliberately NOT taken (owner to decide)

* Re-linking all ~1,000 suppressed comparisons (software pages or `/compare` full SSR list) reverses the 09-24 "focus" decision and mass-adds internal links to pages whose own cohort file records zero visibility. That may be right or wrong; it needs a cohort proposal, not an automatic mass edit. It also touches the shared software template (protected-page and Guardian risk).
* No removal of the 90-day freshness gate (it is an editorial quality rule) and no mass re-verification: pricing facts must come from vendor pages, not from this task.
* No noindex/canonical changes, no sitemap resubmission, no Request Indexing, no Miro edits (held until 2026-11-04).

**Smallest evidence-backed next experiment (needs owner approval, one change at a time):** first export the indexing groups and Googlebot Crawl Stats, THEN (only if evidence supports it) pick 5-10 suppressed comparisons that match demonstrated GSC queries (e.g. query `mattermost` → `/compare/microsoft-teams-vs-mattermost`, `semrush competitors` → `/compare/semrush-vs-ahrefs`; page-level mapping is NOT verified, only inferred from names), restore a software-page link to just those, then watch URL Inspection last-crawl from the first observed recrawl (T0 = recrawl, not deploy).

## 7. GSC triage list (URL Inspection, indexed version only; do NOT Request Indexing)

Run in this order. Record Coverage, Last crawl, Google-selected canonical, Referring sitemaps/page.

| Group | URL | Why (OBSERVED crawl data) |
|---|---|---|
| Control, should be healthy | `/software/linear`, `/compare/wix-vs-shopify`, `/compare/ecwid-vs-shopify` | In sitemap, inbound 6-17 |
| Orphan (0 inbound, not in sitemap) | `/compare/1password-vs-wiz`, `/compare/ahrefs-vs-buffer`, `/compare/acuity-scheduling-vs-motion`, `/compare/affinity-vs-framer`, `/compare/asana-vs-wrike` | Test whether still crawled and last crawl date; 1password-vs-wiz was crawled 2026-08-28 |
| Suppressed, linked only from comparisons | `/compare/microsoft-teams-vs-mattermost` (16 inbound, 0 from software), `/compare/slack-vs-mattermost` (17, 0), `/compare/semrush-vs-ahrefs` (15, 1), `/compare/airtable-vs-notion` (25, 1) | Names match top GSC queries (mattermost, semrush competitors, airtable competitors); page mapping unverified |
| Software excluded by `pricing-evidence` gate | `/software/discord`, `/software/ahrefs` | Out of sitemap yet 56 / 18 inbound links, so they are discovered; contrast with the orphans |
| Survivor candidates (in sitemap) | `/software/mattermost`, `/software/semrush`, `/software/airtable`, `/software/jenkins` | Match queries with impressions |
| Canonical anomaly | any 3 URLs from the "alternate with proper canonical" export | Section 5 |

Validated steps:
1. GSC → Settings → Crawl stats: capture daily requests since 2026-08-01 (export). Compare to the dates in section 3.
2. GSC → Page indexing: export the 905 and 357 Hebrew-labeled indexing groups without assuming their English classification. Compare with `docs/mission/gsc-recovery-20261026/crawl-graph-20261026.json` (`orphanSample` is capped at 25; rerun the command with a larger sample via code if needed).
3. Inspect the table above. Update section 1.2 with the measured outcome.
4. Re-run `npm run growth:crawl-graph -- gate` before every deploy until the freshness gate is addressed.

## 8. Reproduce

```
npm run growth:crawl-graph -- gate                       # offline, no network
npm run growth:crawl-graph -- crawl --ua googlebot --out out.json   # ~1,784 GETs, concurrency <=6, default 4
```
Read-only: only GETs of the site's own public routes. `--base` defaults to `https://miloosh.com` explicitly (the project's `SITE_URL` resolves to localhost outside production; my first run failed on that and was fixed). Evidence file: `docs/mission/gsc-recovery-20261026/crawl-graph-20261026.json` (crawled 2026-10-26T09:57Z).

## 9. Official guidance (read-only reference)

* Sitemaps overview: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
* Block indexing (noindex): https://developers.google.com/search/docs/crawling-indexing/block-indexing
* Crawlable links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
* Large-site crawl budget: https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget
* Page indexing report: https://support.google.com/webmasters/answer/7440203
* Spam policies (scaled content): https://developers.google.com/search/docs/essentials/spam-policies

(Links recorded from the project's existing sources and Google's documentation structure; not re-fetched today.)

## 10. Changes in this branch and QA

* `lib/seo/crawl-graph-diagnostic.ts` (pure analysis), `scripts/growth/crawl-graph-diagnostic.ts` (CLI), `npm run growth:crawl-graph`.
* `tests/seo/crawl-graph-diagnostic.test.ts`: 10 tests (href normalisation, orphan/same-family/non-200/noindex accounting, gate matches `isSoftwareIndexingReady`, gate is date-dependent, comparison eligibility rules).
* No edit to `data/seo/gsc-sitemap-comparison-cohort.ts`; its misleading comment is documented for a future reviewed change. The shared source file stays byte-identical to production.
* No change to `app/`, `data/`, sitemap output, robots, canonicals or any page.

QA (local, this checkout): `eslint` on changed files clean; `tsc --noEmit` clean; `vitest run` 264 files / 2,717 tests passed. `next build` NOT run (no runtime or app code changed; ~3 GB free disk). Live readback done by the crawl only; not deployed.

## 11. Verified Search Console follow-up, 2026-10-26 (ChatGPT using owner-authenticated Safari session)

This addendum corrects the initial "Discovered" assumption. These are the property's actual UI reports, not inferences from site HTTP checks. All inspections were **read-only**; no indexing submission or request was made.

- Performance report through 2026-10-24: 28,500 impressions, 11 clicks, average position 74.2 (three months); 12 impressions, 0 clicks in the latest 28 days; **0 impressions and 0 clicks in latest 7 days**, 2026-10-18 through 24.
- Page indexing last updated 2026-10-19: 154 indexed, 1,322 not indexed, with groups 905, 357, 58 alternate canonical and 2 redirects. The 905 and 357 original Hebrew labels must be kept verbatim unless the English taxonomy is independently verified.
- Manual Actions: "No issues detected." Security Issues: "No issues detected." Sitemap submitted/read 2026-10-08 with status Success, 692 URLs discovered. The live sitemap presently emits 693 URLs.
- `/software/semrush`: **not indexed**, last successful smartphone-Googlebot crawl **2026-08-18**, crawling/indexing permitted, self-canonical, Google-selected canonical matches inspected URL. The site later updated this product's data after the last known crawl.
- `/software/airtable`: **not indexed**, last successful smartphone-Googlebot crawl **2026-09-25**, permitted, self-canonical. Inspection says no referring sitemap detected, even though today's XML includes the URL.
- `/compare/1password-vs-wiz` (currently 0 internal inlinks and not in sitemap): **not indexed**, last successful smartphone-Googlebot crawl **2026-08-28**, permitted, self-canonical. Google's recorded referring pages `/compare` and `/category/security` reflect historical links; the current snapshot found no links to this URL. This supports lost recrawl signals but **contradicts initial discovery starvation as the explanation for this URL's original non-indexing**.
- Homepage `https://miloosh.com/`: URL Inspection reports **indexed**.
- Google Search Status Dashboard shows a globally applied **September 2026 spam update** from 2026-09-24 through 2026-10-08 (https://status.search.google.com/incidents/XhUDXP7A67iHCD2kmbVu). The date overlaps the visibility decline but is **not proof of a spam penalty or causal impact on Miloosh**.

**Revised inference:** An unusually large programmatic catalog, a September decision that simultaneously removed 1,001 comparisons from sitemap and many internal links, stale successful crawls, and the September spam update are all candidates to investigate. No single cause is yet established. Google explicitly prioritizes original value and warns against scaled low-value content; do not add 1,001 pages back to sitemap or remove noindex without a carefully measured quality review (https://developers.google.com/search/docs/essentials/spam-policies, https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
