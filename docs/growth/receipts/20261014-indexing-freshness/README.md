# Miloosh indexing freshness: online source check and 21-day forecast

**Checked:** October 14, 2026. **Scope:** development branch only; no production publication or Google indexing request performed.

## Evidence from the live website

- Production `https://miloosh.com/robots.txt` and `/sitemap.xml` returned HTTP 200.
- Current production sitemap contained 692 URLs, of which 672 had `lastmod`.
- The existing SEO candidate deployment sitemap contained 703 URLs, 699 with `lastmod`, adding four qualified software pages (Slack, Obsidian, Freshsales, Nutshell) and seven qualifying comparisons.
- Six premium software profiles (Slite, Google Analytics, Bitbucket, Sketch, Clockify, Wiz) were all already in production's sitemap.
- Search Console's detailed Page Indexing and URL Inspection reasons were not accessible through the automated Google sign-in flow; do not describe any exclusion cause as confirmed.
- Historic GSC prioritization data (`data/seo/priority-snapshot.json`) was captured on September 24; it is not current performance or indexing data.

## Evidence-backed freshness update (editable profiles only)

These five vendor sites were fetched live on October 14 and their key claims checked against their official product, features, help and/or pricing pages. No source date was changed for any other profile.

| Page | Official sources checked | Changes |
|---|---|---|
| Slack | https://slack.com, https://slack.com/features, https://slack.com/downloads, https://slack.com/pricing | Content reviewed; `accessed_at` = October 14. The separately verified October 12 pricing date was not altered |
| Obsidian | https://obsidian.md, https://obsidian.md/download, https://obsidian.md/pricing | Content reviewed; `accessed_at` = October 14; pricing date left at October 12 |
| Freshsales | https://www.freshworks.com/crm/sales/, https://www.freshworks.com/crm/pricing/, https://www.freshworks.com/crm/features/, and two official Freshsales mobile help articles (check-in/out and voice/image-to-text notes) | Content reviewed; three additional official sources recorded for two already-listed mobile features; `accessed_at` = October 14; pricing date left at October 12 |
| Nutshell | https://www.nutshell.com, https://www.nutshell.com/pricing | Product and prices reviewed; `accessed_at` = October 14; pricing date left at October 12 |
| Tidio | https://www.tidio.com, https://www.tidio.com/pricing/ | Content and visible US pricing verified; `accessed_at` and `pricing.last_verified` = October 14; added official pricing source; corrected the Starter plan's 50 Lyro AI conversations from incorrectly recurring **monthly** to **one-time**; removed an unsupported recurring-AI-quota claim from the Growth plan |

All changes were limited to editable software profiles; protected pages remain subject to the separate mandatory `check:held-pages` verification.

## Forecast and intervention window

Run:

```bash
npm run seo:indexing-forecast -- --as-of 2026-10-14 --days 21
```

At October 14, both before and after the source refresh, **268 software pages and 354 comparisons** satisfy the candidate sitemap quality/discovery gates (622 routes total; plus 81 other static/category/guide/legal routes = 703 candidate sitemap URLs).

Without the five source refreshes, the 21-day projection to November 4 was **234 software + 278 comparisons**, a loss of 110 potential sitemap URLs. After the five truthful source refreshes, the projection is **239 software + 282 comparisons**, reducing this projected loss to 101. The source refresh preserved **nine** additional candidate sitemap entries in that future build (five profiles and four comparisons), not nine newly indexed Google pages.

**29 software profiles and 72 eligible comparisons** remain at risk of losing sitemap eligibility by November 4 if their evidence is not refreshed. All 29 affected product profiles are in the protected cohort until November 4. They were **not** changed. Priority should be determined from fresh official sources and, when available, current Search Console Page Indexing and Performance reports, not guessed.

This forecast does **not** predict actual Google deindexing. Leaving a sitemap is not a directive to Google to remove a page from its index.

## Release discipline

- Keep `claude/miloosh-audit-fixes-20261012` as a draft/review-only candidate until separate release approval.
- Run full `npm test`, `npm run lint` in a clean checkout (generated `.next-miloosh-qa` must not be linted), `npx tsc --noEmit`, `npm run validate:data`, production build, all site audit gates and `check:held-pages` before release.
- Do not alter held page facts or dates before their protection window ends; prepare official-source verification rather than backdating or extending thresholds.
- Google Search Console data requires authenticated access to the user's property. A valid public sitemap and HTTP 200 are prerequisites, **not** indexing guarantees.
