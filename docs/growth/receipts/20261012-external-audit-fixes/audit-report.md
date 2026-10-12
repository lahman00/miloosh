# Miloosh external audit (Part B): fixes, evidence and decisions

Date: 2026-10-12. Branch `claude/miloosh-audit-fixes-20261012`, 18 local commits on top of production `0f54439` (this report is the last).
Nothing was pushed or deployed. Skill used: `miloosh-growth-director` (read-only analysis of protection and priorities). The 40 comparisons were chosen by the deterministic data criteria below, not by running the single-pair `miloosh-comparison-opportunity-finder` workflow (no partner or Search Console evidence was used to rank them, since all 40 qualifying pairs are included).

## בקצרה (Hebrew summary)

- נבנו ובדקו שבעת סעיפי Part B. כל השינויים בקומיטים מקומיים בלבד; אתה דוחף ופורס.
- **דפים מוגנים לא השתנו:** 183 דפים מוגנים או בחלון מדידה זהים לפרודקשן (טקסט, קישורים, JSON-LD, כותרות), פרט לשני תיקונים שאישרת: קישור ה־Research בפוטר ושלמות מטא (twitter, ו־og:url/site_name/locale/type). הוכחה: `npm run check:held-pages`.
- **גרסה ישנה:** לא שוחזרה. ה־hash `dpl_E7ZUz…` הוא פריסת הפרודקשן של 29.8; הקצה בפרנקפורט מגיש רק `dpl_ELzZ…` (נבדקו 8 עמודים ב־12.10, כולם אותו build, אותו פוטר). אם זה חוזר, שמור את כותרות התגובה (`x-vercel-id`, `age`) והרץ `npm run check:live`.
- **שינוי בהיקף לעומת מה שאישרת:** ביקשת טיפול ב־325 יתומות. בפועל 383 דפי השוואה לא נגישים לזחלן (58 מקושרים רק מהיתומות עצמן). 382 קיבלו `noindex, follow`; אחד (`clickup-vs-zoho-projects`) מוגן בניסוי ונדחה ל־4.11. אם אתה מעדיף רק 325, או קישור במקום noindex, החזר את קומיט `99ee90a` בלבד.
- **40 השוואות** נכתבו מחדש (אין 50 שעומדות בקריטריון). כל מספר בטקסט נבדק אוטומטית מול נתוני המוצרים.
- **לא נמדד:** Core Web Vitals. ה־API של PageSpeed חזר 429 (מכסה יומית) והממשק באתר של גוגל לא סיים לטעון. אין מדידה, ולא המצאתי.

## What was asked and where it landed

| Item | Result | Evidence |
| --- | --- | --- |
| B1 sitemap | Policy kept (quality gate and discovery cohort untouched). Every indexable page is in the sitemap, linked from a reachable page, or has a recorded deferral. `lastmod` added for hubs, tools, legal, research (672 of 692 entries before, 699 of 703 after; about, contact, recommend and newsletter stay undated because there is no reliable date). | `check:built-site` checks `sitemap-*`, `indexable-pages-reachable` |
| B1 orphans | 383 indexable comparisons were unreachable (325 with no inbound link, 58 linked only from those). 382 now `noindex, follow` (self-lifting when a pair is promoted into the priority list), 1 deferred to 2026-11-04. | `data/seo/unreachable-comparisons.ts`, commit `99ee90a` |
| B2 two versions | Not reproduced. Footer counts are computed from data; every built page shares one footer line; live check of 8 pages: one deployment id, one footer. | `check:built-site` `footer-consistency`; `npm run check:live` |
| B3 comparison template | New template for 40 pairs (see list). Quick verdict, pricing table from verified data with check date and official page, sourced pros and cons only (block hidden when none). | `tests/seo/comparison-waves.test.ts` |
| B4 generic profile text | Generic migration and integrations FAQ answers gone from the 223 editable profiles (264 pages before, 110 held remain), closing "how to choose" sentence gone, homepage generic limitation gone. Alternatives vs decision guide: reported below, not changed. | audit `generic-text:*` |
| B5 trust | "Last reviewed <date> against the vendor's official sources" with the real data date; a person is mentioned only for pages in `data/seo/human-reviews.ts`, which is empty. The AI Usage Disclosure already says content is not fact-checked line by line. | `lib/review-status.ts` |
| B6 hygiene | Footer 404 fixed (`/research` redirects to the report). Twitter cards now match Open Graph on 1,704 pages. Disclosure next to every sponsored link on guides (419 sponsored links, 0 without). Canonicals self-referencing on every indexable page, redirects not chained. Product-level `SoftwareApplication` on editable profiles (no rating, review or price). `nofollow` deferred as decided. | audit `social-metadata`, `affiliate-disclosure`, `canonical-self`, `redirects` |
| B7 QA crawl | Internal links: 0 broken, 0 through a redirect. Duplicate titles and descriptions: 0. External links: below. | audit; `check:external-links` |

## Before and after (production build `0f54439` vs this branch)

| Measure | Before | After |
| --- | --- | --- |
| Pages whose footer links to a 404 | 1,783 | 0 |
| Pages with a Twitter card that disagrees with Open Graph | 1,704 | 0 |
| Guide pages with a sponsored link and no disclosure beside it | 23 | 0 |
| Indexable comparisons no crawler can reach | 383 | 0 (382 noindex, 1 deferred) |
| Profiles with the generic FAQ answers | 264 | 110 (all held) |
| Pages showing "We don't infer weaknesses" | 724 | 700 |
| Pages showing the generic limitation fallback | 1 | 0 |
| Sitemap URLs / with `lastmod` | 692 / 672 | 703 / 699 |
| Held pages changed relative to production | n/a | 0 of 183 |

## The 40 comparisons (wave 1)

Criteria, all re-checked by tests: same category in CRM and sales, accounting and finance, marketing or HR and payroll; page editable per the protection snapshot; verified, dated, sourced pricing on both sides; sourced pros and cons on both sides. Fifty did not qualify (131 pairs have pricing and cons on both sides, 40 also have sourced pros), so 40 were rewritten, as agreed.

Marketing (16): constant-contact-vs-brevo, brevo-vs-getresponse, constant-contact-vs-moosend, moosend-vs-brevo, moosend-vs-getresponse, mailerlite-vs-getresponse, mailerlite-vs-brevo, omnisend-vs-brevo, getresponse-vs-zoho-campaigns, mailerlite-vs-zoho-campaigns, omnisend-vs-zoho-campaigns, constant-contact-vs-zoho-campaigns, moosend-vs-zoho-campaigns, whatconverts-vs-callrail, whatconverts-vs-ruler-analytics, callrail-vs-ruler-analytics.
Accounting (10): quickbooks-online-vs-xero, quickbooks-online-vs-freshbooks, quickbooks-online-vs-wave, quickbooks-online-vs-zoho-books, xero-vs-freshbooks, xero-vs-wave, xero-vs-zoho-books, freshbooks-vs-wave, freshbooks-vs-zoho-books, wave-vs-zoho-books.
Finance (7): bill-vs-ramp, bill-vs-tipalti, brex-vs-expensify, brex-vs-navan, brex-vs-ramp, expensify-vs-navan, expensify-vs-ramp.
HR and payroll (5): bamboohr-vs-gusto, deel-vs-gusto, papaya-global-vs-remote, deel-vs-papaya-global, deel-vs-remote.
CRM and sales (2): fathom-vs-fireflies-ai, apollo-io-vs-linkedin-sales-navigator.

Every price in the new text comes from the products' stored, dated, sourced pricing data (checked between 2026-08-18 and 2026-10-07 per product); a test fails if a number in a verdict is not in that data. Wave 2 waits until wave 1 is measured.

## Profile data from official sources (checked 2026-10-12)

Slack, Obsidian, Freshsales and Nutshell now have verified pricing with a date and official page, sourced constraints and at least two sources, so they pass the indexing quality gate. No `noindex` was applied to any profile. 85 thin profiles remain (77 of them editable and not shared with a held page).

## External links (1,095 URLs on 437 hosts, 181 s, 4 in flight, 1.5 s per host; partner links never requested)

953 ok, 119 bot-blocked (reachable with a browser user agent), 23 findings. After a slow recheck:
- 1 dead: `help.make.com/how-features-use-credits` (404). Fixed in commit `2e356f2` with Make's own Academy article that states the same rule.
- 13 now redirect to another company's domain: Clari to Salesloft (merger announced, 6 URLs including pricing and security), Windsurf to Devin (2), Coda to Superhuman (`coda.io/pricing`), Segment to Twilio, Veeam store, Salesloft support, Databricks free trial. The affected pages state facts taken from the old sites; they need a fresh official check (see decisions).
- 7 not verifiable by tool: contentful.com and pandadoc.com answer 429 even at a 6 s gap, `ecom.docusign.com/plans/esignature` redirects in a loop for bots, `smartsme.co.uk` returns 403. Check by hand.

## Held pages (nothing changed)

`data/seo/template-cohorts.json` holds the protection verdict of every software page and comparison (223 and 1,296 editable; 131 and 52 held). New templates read it. `npm run check:held-pages -- --base <production build>` compares all 183 held pages with production: 183 unchanged, ignoring only the shared footer, Twitter metadata and the Open Graph keys the metadata fix completes. A first run found six held profiles (including protected Pipedrive) changing because the four completed products made new comparisons and a price line eligible; that is fixed by `data/seo/held-page-freeze.ts` (commit `e23a963`) and re-verified.

## Verification run on the final tree

- `npm test`: 2,778 tests in 262 files pass. `npm run lint`, `tsc --noEmit` and `npm run validate:data` clean.
- `npm run build` succeeds; `npm run check:built-site`: 22 checks, no failure (CI now runs it after the build).
- `npm run check:held-pages`: 183 of 183 unchanged. `npm run seo:template-cohorts -- --check-hold`: 4 product data files changed since production, none feeds a held page.
- Mutation checks: the audit rules, the noindex rule, the gating and the verdict number guard each fail when deliberately broken.

## Decisions needed

1. **Noindex scope.** 382 pages instead of the 325 you named, because 58 were reachable only from the 325. Alternative: noindex only the 325 (the audit then fails on the other 58), or link them (needs a change to pages that are held until 2026-11-04 and adds thin pages to the crawl). Undo: revert `99ee90a`.
2. **Companies that changed hands** (Clari/Salesloft, Windsurf/Devin, Coda/Superhuman, Segment/Twilio). Pages state pricing and features from the old sites. Coda and Segment are shared with held pages, so their data waits until 2026-11-04; Clari, Windsurf and Salesloft are editable now. Do you want an official re-check of these first?
3. **Published research changed.** The SaaS Pricing Pressure Index is computed from pricing data, so the four completed products moved its figures (for example the median recorded monthly starting rate $16.00 to $15.58, the CRM median $61 to $19, sample 103 to 107 records) and its "sources checked" range now ends 2026-10-12. Keep, or freeze the report to a dated snapshot?
4. **Release of held pages on 2026-11-04.** Re-run `seo:template-cohorts`, remove `data/seo/held-page-freeze.ts`, then they join the templates. After that date the audit fails on `clickup-vs-zoho-projects` until it is handled like the other 382.
5. **Alternatives vs decision guide.** 18 profiles name guide alternatives that are not in their top list; 4 are editable (clickup and confluence are shared with held pages so their lists wait; postmark and tidio need an editorial choice about which side is right).
6. **Human review.** `data/seo/human-reviews.ts` is empty. Add a slug and a date only for a review that happened.
7. **More thin profiles.** 85 remain; continue by official source in waves of your choice.
8. **Wave 2 of comparisons.** 91 more pairs have pricing and cons but no sourced pros; they need pros written from official sources first.
9. **Core Web Vitals.** Not measured (PageSpeed API quota exhausted, web UI did not finish). Retry tomorrow, give an API key, or allow a local Lighthouse run.
10. **CDN purge** stays with you; **`nofollow`** stays deferred.

## How to reproduce

```bash
npm run build
npm run check:built-site                      # 22 checks on the built HTML
npm run check:held-pages -- --base <production .next/server/app>
npm run check:external-links -- --dry-run     # then without --dry-run
npm run check:live                            # 8 own pages, one build?
npm run seo:template-cohorts -- --base <production sha> --check-hold
```
