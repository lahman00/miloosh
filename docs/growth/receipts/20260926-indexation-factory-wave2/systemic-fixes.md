# Systemic fixes and findings — Indexation Factory Wave 2 — 2026-09-26

## 1. Sourced `pros[]` never rendered on the product's own page (fixed)

The mission explicitly asked for a sitewide bug hunt modeled on Wave 1's discovery
that 176/354 products had sourced `cons[]` data rendering nowhere on their own
`/software/[slug]` page. Checking every optional field on the `Software` type
(`pros`, `faq`, `links`, `tags`, `founded`, `company`) against what the page
template actually renders found exactly one more instance of the same pattern:

- **`pros` (152/354 products have real data):** read only by `/recommend/results`
  and the `/[guide]` pages, never by `/software/[slug]` itself. Fixed with one
  shared "Why buyers choose it" section next to the existing "Watch before
  buying" cons section (`app/software/[slug]/page.tsx`). No cohort-exclusion
  guard was needed — unlike cons, no first-revenue-cohort panel touches pros at
  all, so there was no duplication risk to gate against. Verified live:
  renders correctly on a page with real pros data (6sense), correctly absent
  on a page with only cons (directus), zero console errors either way.
- **`faq` (81/354 products):** initially flagged as a possible false lead
  (a naive grep for `.faq\b` found nothing), but a closer check found
  `generateFaq()` is called and its output is rendered by `<FaqSection
  items={faqItems} />` at `app/software/[slug]/page.tsx:312` — genuinely
  fine, not a gap. Documented here so a future session doesn't re-flag it.
- **`links` (VendorLinks, 73/354 products):** already rendered via
  `<VendorLinksBlock software={software} />` — genuinely fine, not a gap.
- **`tags`, `founded`, `company`:** not rendered anywhere, but these are
  low-value metadata fields (8-37 products populate them), not buyer-facing
  decision content on the scale of pros/cons — noted as a low-priority
  follow-up, not treated this wave to keep scope proportionate.

## 2. `flowtemplate-delta.vercel.app` — an external domain as the sole discovery path for some pages

While individually GSC-inspecting the treatment cohort, several pages
(`directus`, `toggl-track`, `crazy-egg`, `drupal`, `matomo` among them) showed
**`https://flowtemplate-delta.vercel.app/...`** as their *only* recorded
referring page in Google's discovery record — no real miloosh.com internal
link was listed at all for those specific URLs, even though this session's
own static internal-link-graph analysis shows 7-19 real inbound links exist
for every one of them. This means Google's actual observed discovery path for
those pages, at last crawl, was an external preview/mirror domain, not
Miloosh's own internal links — a crawl-freshness gap, not a link-graph gap.

**Not investigated further or fixed this session** — it's an external domain
this repo doesn't own or control, out of scope to "fix," and doesn't block
indexation work. Flagged here as a genuine, real, sourced finding for whoever
owns that domain or a future technical-SEO session to look into (worth
checking whether it's an old preview deployment that should be taken down or
noindexed on its own end).

## 3. `www.miloosh.com` appearing as a referring domain

`fathom-analytics`'s GSC referring-page field showed
`https://www.miloosh.com/software/fathom-analytics` (the `www` subdomain)
rather than the canonical apex domain. Worth a follow-up check that
`www.miloosh.com` correctly 301-redirects to `miloosh.com` sitewide and isn't
serving duplicate, separately-crawlable content — not verified either way
this session, flagged as a real observation from live GSC data, not confirmed
as a bug.

## 4. Parallel, unmerged `lib/google-war/` system (reconciliation, not a fix)

`codex/google-visibility-war-20260926` (merge-base `af33bae`, this wave's own
Wave-1 first commit) contains a large (43 files, 53,288 insertions)
`lib/google-war/` module suite including `quality.ts`'s `intentOwner()` /
`intentConflicts()` / `repeatedBuyerText()` — conceptually overlapping with
this wave's own permanent `scripts/growth/indexation-readiness.ts`. Per the
mission's explicit "DO NOT blindly merge anything," this was deliberately
**not merged**; the new tool was built independently, named and located
differently (`growth:indexation-readiness` vs. `google-war`) to avoid a
collision if that branch is merged later. A future integration session should
read both and decide whether to consolidate, not this one.
