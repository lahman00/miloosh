# Miloosh organic recovery cohort — 2026-10-26

Branch `work/organic-recovery-cohort-20261026`, base = production head `6d74bec` (PR #98). Skill: `miloosh-google-recovery-director` (phases 1–4, read-only) with `verified-delivery`.

Status: **IMPLEMENTED_LOCAL + TESTED locally** for one diagnostic improvement. **No page, data file, sitemap, robots, canonical or shared template was changed.** Nothing deployed, pushed, merged, submitted or requested.

Labels: OBSERVED = measured by me today from a file or a read-only GET; GSC-CAPTURE = authenticated Search Console data captured by the owner session and stored outside git or in `docs/growth/receipts`; HYPOTHESIS / UNKNOWN as written.

## 1. Bottom line

1. **There is no editable, demand-backed page today.** Every page with real historic demand is PROTECTED, inside an observation window, or on the price-label hold (to 2026-11-04). The seven strongest candidates are listed in section 3; none may be edited now. The two pages the repository's own mechanism calls editable (`/software/auth0`, `/software/tidio`) are, respectively, weak (107 impressions) and held. A content edit proposed today would be blocked by the protection rules, so section 6 holds drafts only.
2. **The "orphan comparison" explanation does not describe the demand cohort.** All seven cohort pages are in the sitemap and have 12–78 crawlable inbound links (OBSERVED, section 4). They sit at average positions 61–86 and are still not indexed or not shown. Missing internal links are therefore not what holds these pages back. The 325 zero-inlink comparisons are a separate, real graph weakness, but none of them has page-level GSC demand in this evidence.
3. **Time-sensitive: the build-time quality gate will remove cohort pages from the sitemap** on a rebuild after these dates (OBSERVED from product records, section 5): airtable 2026-10-30, intercom 2026-10-31, semrush 2026-11-03. `app/sitemap.ts` has no `revalidate`/`dynamic` export, so the gate appears to be evaluated at build time (source reading; Vercel runtime behaviour not verified). A production deploy between 10-30 and 11-04 would silently shrink the sitemap for exactly the pages with the most demand, and the same pages cannot be re-verified until their protection ends.
4. **Source transparency finding:** `/software/semrush` cites `https://sproutsocial.com` (a competitor's site) among its `sources`. It may be an intentional reference or a copy error; it needs a human check after the hold. No other cohort page cites a foreign host.
5. Causality remains **UNKNOWN**. Nothing here shows a penalty. The September 2026 spam update window (2026-09-24 – 10-08) overlaps the decline; the page-level data shows the collapse began 2026-08-20/21 (largest one-day fall 2,087 → 46 impressions, `dates-historical.csv`), which predates it.

## 2. Evidence base and denominators

| Evidence | Window | Denominator | Location |
|---|---|---|---|
| Property totals | 3 months to 2026-10-24 | 28.5k impressions, 11 clicks, avg position 74.2 | owner-authenticated GSC (task brief) |
| Pages table (complete, 487 of 487 rows) | 2026-07-23 – 08-19 (data from 08-07) | property 25,646 impressions; row sum 25,780 | `docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009/pages-historical.csv` |
| Pages snapshot (537 rows) | 2026-08-07 – 09-21 | 28,459 impressions | `data/seo/priority-snapshot.json` |
| Queries (**top 1,000 rows only**, anonymised queries absent) | 2026-08-07 – 10-24 | property-wide, not page-attributed | private: `/tmp/miloosh-gsc-queries-20261026.json` (not committed) |
| Page-attributed query tables | historical | five pages only: clickup, activecampaign, mulesoft, sprout-social, confluence | `.../gsc-ui-capture-20261009` (private query files) |
| URL Inspection | semrush 08-18, airtable 09-25 (2026-10-26); mattermost, jenkins 08-10 (2026-10-17 receipt) | per URL | task brief; `~/MilooshReceipts/20261018-ten-priority-gsc-closeout.md` |
| Crawl graph (1,784 pages, honest UA) | 2026-10-26T14:51Z | all published software + comparisons + sitemap | `docs/mission/organic-recovery-cohort-20261026/crawl-graph-focus-20261026.json` |
| Protection, hold, gate, source facts | 2026-10-26, checkout `6d74bec` | repository's own `loadProtectionSnapshot` | `.../cohort-evidence-20261026.json` |

**Query-to-page rule.** A "query name match" below is the sum of top-1,000 query rows that contain the product name. It says the query mentions the product, **not** that it landed on this page. Different products can match the same row, so match totals must never be added. Page-level numbers come only from the pages tables.

The independent re-run of the crawl reproduced the earlier aggregate exactly (1,784 pages, all 200, 693 sitemap URLs, comparisons 1,348 / 347 in sitemap / 325 zero-inbound / 459 ≤1 inbound), which corroborates both runs.

## 3. Ranked cohort (7 URLs)

Ranking input: page-row impressions in the complete 2026-07-23 – 08-19 table (the only unfiltered, page-attributed demand measure), then query name-match evidence, then the buyer intent being distinct. All seven are "alternatives / competitors" intent.

| # | URL | Page impressions / clicks / pos (Jul 23 – Aug 19) | Query name match (Aug 7 – Oct 24): queries / impr / clicks / pos | Google URL Inspection | In sitemap · inbound links (comp / sw / cat / other) | Protection at `6d74bec` | Price-label hold | Gate would fail on (content / pricing) |
|---|---|---|---|---|---|---|---|---|
| 1 | `/software/semrush` | 1,655 / 0 / 77.2 | 29 / 1,900 / 0 / 77.3 | not indexed, last crawl 2026-08-18 | yes · 16 (10/3/1/2) | PROTECTED (legacy cohort) + observation to 11-04 | yes | 11-03 / 11-21 |
| 2 | `/software/intercom` | 1,603 / 1 / 86.1 | 44 / 1,690 / 1 / 86.1 | no inspection on file | yes · 49 (37/7/1/4) | PROTECTED (legacy cohort) | yes | 10-31 / 11-22 |
| 3 | `/software/freshdesk` | 1,545 / 0 / 80.1 | 18 / 768 / 0 / 82.4 | no inspection on file | yes · 78 (57/15/1/5) | PROTECTED (legacy cohort) + observation to 11-04 | yes | 2027-01-06 |
| 4 | `/software/clickup` | 428 / 0 / 85.2 | 16 / 382 / 0 / 85.6 | no inspection on file | yes · 78 (52/20/1/5) | page editable, but **14 derived comparisons PROTECTED** (comparison-quality cohort) | no | 11-19 |
| 5 | `/software/airtable` | 303 / 1 / 78.5 | 13 / 183 / 1 / 79.3 | not indexed, last crawl 2026-09-25 | yes · 72 (61/7/1/3) | PROTECTED (first-revenue cohort); 3 derived comparisons protected | yes | 10-30 / 11-22 |
| 6 | `/software/jenkins` | 128 / 0 / 69.5 | 7 / 50 / 1 / 72.9 | not indexed, last crawl 2026-08-10 | yes · 12 (9/1/1/1) | observation to **11-05** | yes | 2027-01-07 |
| 7 | `/software/mattermost` | 117 / 1 / 60.9 | 5 / 70 / 1 / 61.4 | not indexed, last crawl 2026-08-10 | yes · 47 (34/10/1/2) | observation to **11-05** | yes | 2027-01-07 |

Together the seven pages account for 5,779 of the 25,646 property impressions in that window (22.5%; page rows and property totals are different denominators, shown for scale only). Four of seven show zero clicks.

Why this order and these pages:

* **semrush, intercom, freshdesk** carry 83% of the cohort's page impressions and the clearest repeated "X alternatives / competitors" intent (for semrush: *alternative semrush* 317, *semrush competitors* 287, *competitors semrush* 243 impressions, all 0 clicks at positions 72–83). They are the highest-value recovery targets and the most protected.
* **clickup** is the one page here with a page-attributed query table (37 rows, declared total 428 equals its page row), so its demand is verified at page level rather than inferred.
* **mattermost, jenkins, airtable** are the only cohort pages whose queries produced a click (*mattermost* 46 impressions / 1 click at 55.9; *jenkins alternatives* 10 / 1 at 66.7; *airtable competitors* 20 / 1 at 85.2). Better rank where a click happened is the only visible relationship between position and clicks in this data; it is correlation on single clicks, not a finding. The bare query *mattermost* is largely navigational and cannot be converted into a buyer-decision page.
* Mattermost has one of the freshest records in the cohort (pricing verified 2026-10-08, four sources on `mattermost.com` / `docs.mattermost.com`, gate-ready until 2027-01-07; freshdesk and jenkins are similar) and is the only one of those with a click at a rank near 56, which makes it the best first candidate once its window ends. It has no alternatives decision guide, unlike semrush, intercom, freshdesk, airtable and clickup (`data/seo/alternative-guides.ts`).

### Original value and source transparency (OBSERVED from records, not a quality score)

* Every cohort record has `pricing.status = verified` (jenkins: `free_only`) with an official pricing/governance source and a `lastVerified` date, two to four `sources`, and two to three documented constraints. Five of seven have an alternatives decision guide with its own `evidenceSources`.
* None has a buyer checklist (`data/seo/buyer-checklists.ts`) and none carries first-hand test results; the pages are documentation-based research. They must not be described as hands-on tested.
* The only foreign-host source is semrush → `sproutsocial.com` (section 1.4).
* Whether this is enough original value for Google is **UNKNOWN**; the evidence cannot separate "thin vs competitors ranking at position 1–10" from "not yet recrawled".

### Considered and excluded

| URL | Reason |
|---|---|
| `/software/miro` | Held to ≥ 2026-11-04 by the owner; not touched. |
| `/software/tidio` (282 impressions, 6 name-match queries / 257 impr) | Repository says editable and nothing derived is protected, but tidio is on the price-label hold. Not modified. |
| `/software/auth0` (107 impressions, pos 72.1) | Only page that is editable and unheld, but demand is weak (4 name-match queries / 44 impr) and the record has no pricing, no constraints and one source, so an edit needs vendor research. Draft D3. |
| `/software/front`, `buffer`, `help-scout`, `ecwid`, `pipedrive`, `zoho-crm`, `smartsheet` | PROTECTED (legacy/first-revenue cohorts). |
| `/software/mulesoft`, `sprout-social`, `n8n`, `basecamp`, `whimsical`, `scribe`, `umbraco`, `zapier`, `github`, `activecampaign` | Observation window to 2026-11-04 and on the hold. |
| `/software/salesforce` | IN_FLIGHT in another worktree. |
| `/software/confluence` | Page editable, derived comparisons protected. |
| `/compare/umbraco-vs-wordpress` (query *umbraco vs wordpress*, 116 impressions) | No page row in the complete pages table: the query was not shown to be served by this URL (`/software/umbraco`, 265 impressions, is more likely). Also derived page `umbraco` is under observation and on the hold. |
| `/compare/slack-vs-mattermost`, `microsoft-teams-vs-mattermost`, `semrush-vs-ahrefs`, `airtable-vs-notion` | The earlier doc suggested these from product names. Page evidence does not support them: `slack-vs-mattermost` had 4 impressions at position 35; the others have no page row. They stay suppressed from the sitemap and are link-graph probes only (inbound 15–25, almost all from other comparisons). `airtable-vs-notion` is a protected experiment page. |
| The 325 zero-inlink comparisons | No page-level demand in any capture. Not re-enabled; no mass link or sitemap change. |

## 4. Link-graph diagnostic (the code change)

New and read-only:

* `analyzeFocusPaths` in `lib/seo/crawl-graph-diagnostic.ts`: per-URL inbound detail (status, in-sitemap, distinct linking pages by family, capped sample) for a chosen list, using the same link definition as the existing aggregate. A path that was not crawled is reported `crawled: false`, never as a measured orphan. The existing `analyzeCrawlGraph` output is unchanged (test pins it).
* `growth:crawl-graph crawl --focus /a,/b | --focus-file list.txt` adds a `focus` array to the JSON.
* `lib/seo/cohort-evidence.ts` + `scripts/growth/organic-cohort-evidence.ts` (`npm run growth:cohort-evidence`): prints protection of the page **and every page that re-renders from its data**, price-label hold, sitemap membership, quality-gate reasons, the exact dates the 90-day gates will fail, source transparency, and query name-matches. `--aggregate-only` strips per-query rows so the output can be committed.

Measured result for the cohort: 12–78 crawlable inbound links each, all in the sitemap. Control probes: `/compare/1password-vs-wiz` 0 inbound (consistent with the earlier orphan finding; Google crawled it 2026-08-28 and did not index it), `/compare/semrush-vs-ahrefs` 15 (14 from other comparisons, 1 software), `/compare/microsoft-teams-vs-mattermost` 16 (all comparisons, 0 software).

Interpretation (SUPPORTED HYPOTHESIS, not proof): link starvation does not explain why high-impression, well-linked, sitemap-listed pages with successful Googlebot crawls are not indexed. Leading remaining candidates are content-quality or site-level evaluation, stale crawls (semrush 2026-08-18 predates the 10-07 product update), and the very large catalog. These cannot be separated with the current data.

## 5. Dates that matter

| Date | Event |
|---|---|
| 2026-10-30 | airtable content gate fails on rebuild (accessedAt 2026-07-31). |
| 2026-10-31 | intercom content gate fails (accessedAt 2026-08-01); also auth0, wordpress. |
| 2026-11-03 | semrush content gate fails (accessedAt 2026-08-04); also umbraco, tidio. |
| 2026-11-04 | price-label hold ends; observation windows of semrush, freshdesk, mulesoft, sprout-social etc. end (the formal clock starts at the first observed recrawl, not the date). |
| 2026-11-05 | mattermost and jenkins windows end (commit `b74c241`, 2026-10-08). |
| 2026-11-19 – 22 | pricing gates fail for semrush (11-21), intercom, airtable, clickup, tidio. |

Legacy-cohort protection (semrush, intercom, freshdesk) and first-revenue protection (airtable) do not expire by date; the owner must lift or keep them explicitly.

## 6. Draft proposals — NOT applied

Each would touch a protected, observed or held page, so each stays a draft until the date above and an explicit owner decision. None is written into any file in this branch.

* **D1 mattermost (earliest 2026-11-05).** Add an alternatives decision guide in the existing `alternative-guides.ts` mechanism, using only official Mattermost documentation and pricing already on the record, with comparison links to pages that exist. Measure from the first observed recrawl; 14- and 28-day finalized windows, equivalent GSC windows only. Note `alternative-guides.ts` is a shared SEO input file, so it needs a Guardian pass with rendered-diff proof for unrelated pages.
* **D2 semrush source check (after 11-04 and owner lift of legacy protection).** Confirm what `sproutsocial.com` supports; remove it if it supports no Semrush claim; re-verify pricing against `https://www.semrush.com/prices/` before the 11-03 content-gate date if a release is planned.
* **D3 auth0 (editable and unheld, but weak).** Needs official pricing, plan limits, constraints and a second source from auth0.com. No facts were fetched or written. Recommend skipping in favour of D1 unless the owner wants a no-risk test page.
* **D4 release hygiene.** Before any production deploy between 2026-10-30 and 11-04, run `npm run growth:cohort-evidence` and `npm run growth:crawl-graph -- gate` to see which cohort pages the rebuilt sitemap would drop. Fixing the cause (re-verification of protected records, or making the gate date-stable) is a separate, reviewed change to `lib/indexing-quality.ts`/`data/seo` shared files.

## 7. PR #99 (RSC prefetch experiment) — inspected, not touched

* Branch `experiment/rsc-prefetch-compare-20261026` is based on `9130c2c`, two commits behind production `6d74bec` (merge-base `9130c2c`). Its `git diff` against `6d74bec` shows deletions of the crawl-graph files only because it predates PR #98; a rebase is needed before any release.
* The functional change is one prop, `prefetch={false}` on the 72 `CompareGrid` cards (`components/CompareGrid.tsx`), a shared component; Release Guardian blocking it is the documented policy and is not bypassed here.
* Its guard test asserts source text (`toContain("prefetch={false}")`), not rendered behaviour; rendered proof comes from the documented preview comparison (69 → 11 background RSC requests in one headless-Chrome session, 72 anchors unchanged).
* It is **not indexing recovery**: it removes no link, adds none, and changes no URL's crawl eligibility. Crawl Stats (97% refresh, `_rsc` examples from 09-16 – 10-03, true `_rsc` share of the 74.7k "Other" requests unmeasured) justify measuring it, not expecting more impressions from it. The cohort pages above are unaffected by it.

## 8. Measurement contract

* T0 per URL = first observed Googlebot recrawl after a future release (URL Inspection last-crawl date), not deploy date.
* Baseline per URL: the pages-table rows in section 3, clicks, position, coverage state, last-crawl date.
* Review at 14 and 28 finalized days after T0, equivalent GSC windows only; the property is at 12 impressions per 28 days, so any change smaller than a few hundred impressions is noise. Keep deployment, crawl, indexation, impressions, clicks, sessions and revenue as separate facts.
* Recent state to beat: 12 impressions / 0 clicks in the latest 28 days, 0 in the latest 7 (to 2026-10-24).

## 9. Reproduce

```
npm run growth:crawl-graph -- crawl --focus-file paths.txt --out out.json     # ~1,784 GETs, default concurrency 4
npm run growth:cohort-evidence -- --paths /software/semrush,/software/mattermost \
  --queries-file <private GSC query export> --crawl-file out.json --today 2026-10-26 --aggregate-only
```

## 10. QA (this checkout, local)

* `eslint` on changed files: clean. `tsc --noEmit`: clean. Targeted Vitest `tests/seo`: 19 files / 97 tests pass (6 new focus-path tests, 9 new cohort-evidence tests). `npm audit`: 0 vulnerabilities.
* **Independent QA retest after Claude handoff (2026-10-26):** replaced the `node_modules` symlink with a real `npm ci --no-fund --no-audit` install from this exact checkout, using a disposable local npm cache. Full Vitest **2,732 of 2,732 tests PASS** across **265 files**. `npm run lint`, `npx tsc --noEmit`, `npm run validate:data` and `npm audit --audit-level=moderate` all passed (zero vulnerabilities). The one earlier `braces-free-lint` failure disappeared without a code change, confirming that it was caused by symlinked install provenance. The clean QA was run before this documentary receipt update; no runtime or test code was changed after it.
* No `next build` (disk; no runtime or app code changed). Vercel preview only after push by the supervising agent.
* The crawl was 1,784 GETs against the public site with an honest user agent at concurrency 4; no indexing request, sitemap action, partner link or write.
