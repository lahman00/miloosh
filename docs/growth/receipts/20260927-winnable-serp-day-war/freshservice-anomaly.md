# Freshservice / Freshdesk Anomaly — Precise Remediation (2026-09-27)

## The exact queries and page

594 combined impressions across 9 real query variants (English and French), all currently
attributed by GSC's own query-to-page filter to `https://miloosh.com/software/freshdesk`, despite
`https://miloosh.com/software/freshservice` existing as its own, separate, fully-priced page:

`alternative à freshservice` (80 impr, pos 68.2), `alternative à freshservice belgique` (82 impr,
pos 60.5), `freshservice alternative` (67 impr, pos 72.4), `alternative freshservice chatbot` (75
impr), `alternative freshservice service desk` (72 impr), `alternative freshservice automatisation`
(69 impr), `alternative freshservice helpdesk` (52 impr), `alternative freshservice ia` (49 impr),
`alternative freshservice esm` (48 impr).

## Root cause, precisely diagnosed

**This is not a titles/H1/canonical/content problem. It is a crawl-priority problem.**

Re-running the `growth:google-war` engine fresh tonight (`npm run growth:google-war`) confirms:

- `/software/freshservice` indexation state: **`DISCOVERED_NOT_INDEXED`** -- Google knows the URL
  exists (it has been discovered, e.g. via the sitemap) but **has never crawled/indexed it**. This
  is sourced from a real GSC bulk Pages-report export (captured 2026-09-26, GSC processing date
  2026-09-21), not an assumption.
- `/software/freshservice`'s own **factual-depth score is 90/100 (bucket A)** -- genuinely strong,
  well-sourced content (pricing verified, 8 sources, feature depth high). **The page itself is not
  thin or low-quality.** The gap is entirely on the discovery/crawl side, not the content side.
- The engine's own classification: `groups: ["CRAWL_RECOVERY"]`, with an explicit recommended
  action: *"Investigate discovery/crawl-priority architecture (hub links, sitemap, category
  paths); do not manually request indexing for this URL."* This is the same established lane from
  Phase II of this engagement -- a DISCOVERED_NOT_INDEXED page needs stronger internal-link
  discovery signals, not a manual "Request Indexing" click (which doesn't fix the underlying
  crawl-priority cause and is explicitly warned against by the engine's own prior-session logic).
- Internal link equity is thin: **6 total inbound links, 4 of them relevant** -- one plausible
  contributing factor to low crawl priority.

Because `/software/freshservice` isn't indexed at all, Google has no choice but to serve the only
relevant, indexed page it has for anything Freshservice-adjacent -- `/software/freshdesk` (the
sibling Freshworks product, same company, overlapping "helpdesk"/"support" vocabulary).

## A mitigation already exists -- and hasn't had time to work yet

`data/seo/serp-overrides.ts` already contains a `SOFTWARE_SEARCH_INTENT_NOTES` entry for
`freshdesk`, added in commit `e9a7fa7` ("seo: focus sitemap and refresh live GSC priorities"):

> "Freshdesk and Freshservice are different products. This page covers Freshdesk for customer
> support; if you meant Freshservice for IT service management, use the Freshservice research page
> instead." -- with a real, working link to `/software/freshservice`.

Confirmed this session that the note **is genuinely rendered** on the live page (checked
`app/software/[slug]/page.tsx` lines 125 and 155-164 -- not dead code), positioned prominently
right after the intro paragraph, above the fold. This is exactly the right kind of fix: it gives a
confused visitor a way out, and it gives Google one more internal link into the DISCOVERED page.

**This fix is not new -- it predates tonight's session.** Given `DISCOVERED_NOT_INDEXED` pages
typically take weeks (not days) to get crawled and re-evaluated once new internal-link signals
appear, and this note is very recent, the honest conclusion is: **give it time, don't duplicate or
escalate the fix yet.**

## Precise remediation (no page was edited tonight)

1. **Do not create a new page.** Freshservice already exists, is well-sourced (score 90/100), and
   simply hasn't been crawled.
2. **Do not manually click "Request Indexing"** in GSC for this URL -- the engine's own
   established guidance (from Phase II) is explicit that this does not fix a crawl-priority root
   cause and can even reset useful signals.
3. **The real lever is internal-link discovery**, not content or metadata. A future session could
   add 1-2 more genuine, contextually relevant internal links to `/software/freshservice` from
   already-indexed, topically relevant pages (e.g. the `it-operations` category page, if
   Freshservice isn't already prominently linked there) -- but this needs its own verification pass
   (is it already linked from the category page? how many category-page inbound links does it
   have today?) before adding anything, which was not completed tonight given the time budget.
4. **Re-check in 3-4 weeks**, not 3-4 days. Re-run `npm run growth:google-war` and re-pull the
   exact-query GSC filter for `alternative à freshservice` to see whether indexation state has
   changed to `CRAWLED`/`INDEXED` and whether page attribution has shifted.

## What NOT to change

- Freshdesk's own content, title, or the existing search-intent note -- it is correctly built and
  correctly rendered.
- Freshservice's pricing, features, or alternatives content -- already scores 90/100; this is not
  a content-quality problem.
