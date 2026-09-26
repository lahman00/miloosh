# Changes — Indexation Recovery Attack — 2026-09-26

Branch `claude/indexation-recovery-20260926`, isolated worktree, built on
`claude/gsc-demand-20260926` (this same day's prior mission, whose receipt
this mission was instructed to read first). Local commits only. **Nothing
pushed, merged, or deployed.**

## Safety checks before any edit
- `git worktree list` showed 12 active worktrees/branches across Claude and
  Codex lanes. Checked `git log --oneline` on every branch touched or
  created the same day.
- Found and read `codex/funnel-final-verification-20260926` (analytics/
  engagement fixes, unrelated to indexation — not merged in, not touched).
- Confirmed via `docs/work-revenue-experiment-receipt-*.json` that
  `/software/wrike`, `/software/klaviyo`, `/software/smartsheet`,
  `/software/ecwid`, `/software/zoho-crm`, `/software/calendly`,
  `/software/woocommerce`, `/software/teamwork`, `/software/doodle` are all
  under active `MEASURING` experiments — excluded from cohort selection
  entirely, not just from edits.
- No `reset`, `rebase`, or force-push used anywhere this session.

## Commits (4)
1. **`af33bae` — `seo(content): deepen 14 crawled-not-indexed pages with
   real sourced pricing and cons`** — added real, live-vendor-sourced
   pricing to 12 of 14 products that had none at all (2 already had it),
   and 3 real, sourced cons to all 14 (all had none). Factual-depth score:
   39–75 → 80–95 for all 14.
2. **`5016dbd` — `seo(differentiate): add real decision guides for 14
   crawled-not-indexed pages`** — added an `AlternativeDecisionGuide`
   entry per product, each using the product's own real alternatives and
   an already-published comparison. The existing anti-templating test
   caught two genuinely too-similar pairs (vercel/netlify, jasper/copy-ai)
   on first pass; both were rewritten with real, distinct framing rather
   than loosening the test. See `similarity-before-after.json`.
3. **`e5586c5` — `seo(hubs): render sourced cons on the general software
   page template`** — real finding: 176 of 354 catalog products (this
   session's 14 included) had sourced `cons[]` data that never rendered
   on their own `/software/[slug]` page, only on a comparison page if one
   existed. Added a "Watch before buying" section to the shared page
   template, gated to skip the 5 first-revenue-cohort pages that already
   show this via `FirstRevenueSoftwarePanel`. One template change,
   affecting many pages at once — not a per-page edit.
4. **This receipt.**

## External (non-code) actions
- 5 live Google Search Console indexing-request attempts, 4 confirmed
  received, 1 blocked by Google's own daily quota. See
  `indexing-requests.md` for the exact URLs and outcomes. Not a code
  change; recorded here for a complete account of everything done.

## Explicitly not changed, and why
- **All 9 protected pages** (see safety checks above) — content, links,
  and indexing requests all withheld.
- **The other ~160 catalog products with cons[] now newly rendering** on
  their own page thanks to commit 3 — a real, positive side effect of the
  template fix, not something individually edited or verified product-by-
  product this session.
- **The 6 remaining planned indexing requests** (firebase, vercel,
  netlify, contentful, hotjar, plus the 4-product AI cluster) — blocked by
  Google's quota; not retried. See `indexing-requests.md`.
- **The sitewide 1,645-page "crawled but not indexed" problem** — this
  session treated 14 real, evidence-backed pages plus one architecture
  fix benefiting ~160 more; it did not and could not attempt a full
  sitewide remediation in one pass, consistent with the mission's own
  "do NOT mass rewrite 1,600 pages" instruction.
