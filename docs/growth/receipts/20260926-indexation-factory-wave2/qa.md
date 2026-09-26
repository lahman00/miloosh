# QA — Indexation Factory Wave 2 — 2026-09-26

## Automated gates (run after every commit, not just once at the end)
- Full suite: **240 files / 2,082 tests passed** (up from 237/2,074 at the
  starting commit — 8 new tests added: 3 for the pros-rendering fix and
  readiness/quality-floor tooling documented below, plus the existing
  anti-templating suite exercised across 30 more entries).
- `tsc --noEmit`: clean after every commit.
- `eslint` on every changed file: clean.
- `npm run validate:data`: **354 software pages, 27 categories, 1,348
  comparisons, 0 problems** — unchanged before and after all data edits.
- `npm run build` (`VERCEL=0 MILOOSH_QA_BUILD=1 BLOB_READ_WRITE_TOKEN=''`):
  clean, multiple times across the session, including the final state.

## Rendered QA (real local production server, real browser)
- `next start` on an isolated QA build (port 3911), verified via `curl`
  (server-rendered HTML, no JS) and a real browser session.
- Confirmed real, distinct pricing and cons text is present in the raw
  server-rendered HTML (not just client-rendered) for `/software/auth0`:
  the specific sourced cons sentences and tier names appear in a plain
  `curl` fetch.
- Confirmed the new "Why buyers choose it" pros section renders exactly
  once on a page with real `pros[]` data (`/software/6sense`) and is
  correctly absent on a page with only `cons[]` (`/software/directus`) —
  no duplicate section, no empty section.
- Confirmed `/compare/crazy-egg-vs-matomo`'s "Pros and cons" section shows
  real, distinct, sourced content for **both** sides (Crazy Egg and
  Matomo), and that the new SERP title override
  ("Crazy Egg vs Matomo (2026): Heatmaps vs Analytics") is live in the
  browser tab title.
- Mobile QA at three widths on the same pages
  (`document.documentElement.scrollWidth > window.innerWidth`):
  - 390px: `false` (no overflow) on `/software/auth0`.
  - 320px: `false` (no overflow) on `/software/auth0`; visually confirmed
    the pricing-tier cards wrap cleanly with no mid-word breaks or broken
    card layout via screenshot.
  - 1440px: `false` (no overflow) on `/compare/crazy-egg-vs-matomo`.
- Zero console errors on every page/width checked.
- No merchant/affiliate destination was navigated to or clicked at any
  point.

## Structured-data integrity
- Checked `/software/auth0`'s JSON-LD output directly: `Organization`,
  `BreadcrumbList`, and an `ItemList` of real alternatives — confirmed
  **no** `AggregateRating`, `Review`, `ratingValue`, or fabricated
  `offers` block anywhere in the output. No invented reviews, ratings, or
  prices were introduced by this wave's work, consistent with the
  mission's explicit prohibition.

## Live production checks (real, authenticated Google Search Console)
- Individual live URL Inspection performed for 26 of the 30 treatment
  candidates before any edit (the other 4 — ifttt, deepl,
  microsoft-onenote, auth0 — were confirmed via a live bulk export of
  Google's own "Crawled - currently not indexed" report instead of
  one-by-one inspection, equally authoritative, more efficient at this
  scale) — **30/30 confirmed "Crawled - currently not indexed,"** not
  inferred from HTTP 200.
- Individual or bulk-export live verification for 8 of 12 control
  candidates (reclaim-ai, zeplin, amplitude, keap, google-meet, snyk,
  linear, clockify); the remaining 4 (google-chat, mixpanel, slite,
  bitbucket) rely on `priority-snapshot.json` only and were **not**
  individually re-verified this session — documented explicitly rather
  than assumed, matching Wave 1's own precedent of leaving some controls
  unverified rather than spending unlimited GSC time on baseline-only
  pages.
- One candidate (`elastic`) was live-inspected and found to actually be
  `UNKNOWN_TO_GOOGLE` (never crawled), not `CRAWLED_NOT_INDEXED` — excluded
  from the control cohort rather than silently included; see
  `baseline.json`.
- 12 comparison-page candidates: all 12 confirmed `CRAWLED_NOT_INDEXED` via
  the same live bulk export.
- One live indexing-request attempt (directus, the #1-ranked candidate) to
  check quota state per the mission's own instruction — blocked by
  Google's own daily quota (still exhausted from earlier missions the
  same calendar day). No retry, no further attempts. See
  `indexing-request-queue.json`.

## Not verified (explicitly, per the mission's own success framing)
- Whether the 30 treatment pages, or the 12 comparison pages, actually
  enter Google's index, or on what timeline — that is Google's decision,
  not something this session can control or claim credit for in advance.
- Any change in ranking, impressions, clicks, or CTR as a result of this
  session's work — far too early to observe, and not claimed.
- The indexation status of the 4 control-cohort products not individually
  live-inspected this session (google-chat, mixpanel, slite, bitbucket).
- Whether `flowtemplate-delta.vercel.app` or the `www.miloosh.com`
  referring-domain observations (`systemic-fixes.md`) represent real,
  fixable issues — flagged as genuine findings from live data, not
  investigated to a conclusion this session.
- Any merchant page load, signup, sale, commission, or payout.
