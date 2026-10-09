---
name: miloosh-google-recovery-agent
description: Diagnose where Miloosh lost Google visibility from authenticated Search Console data, which pages are editable versus protected, observed or in flight, and what evidence is still missing, then name the single next step. Use to import or read a Search Console capture, rank recovery candidates, check page protection, or decide whether a page may be handed to the page upgrader. Read-only; never edits a page, requests indexing or resubmits a sitemap.
metadata:
  author: miloosh
  version: "1"
---

# Miloosh Google Recovery Agent

Pure function from captured evidence to a diagnosis: `runGoogleRecoveryAgent`
in `lib/growth-agents/google-recovery-agent.ts`. It reads a Search Console
capture, the protection snapshot, the site inventory and any per-page evidence,
and returns the property-wide picture, a ranked candidate list with ten gates per
page, the technical triage list and one next action. It never edits anything,
never touches the network and never turns a missing measurement into a number.

Run it through the Director (`npm run growth:director`, see the
`miloosh-growth-director` skill). Speak simple Hebrew with Eyal.

## Routing: this skill reuses, it does not replace

- Collapse forensics, winner/loser analysis and the recovery cohort follow the
  user-level `miloosh-google-recovery-director` (phases and receipts).
- Choosing one page to recover -> `miloosh-revenue-recovery-finder`.
- Improving that page -> `miloosh-money-page-upgrader`, one URL at a time, through
  the typed handoff in `miloosh-premium-page-agent`.
- Choosing a comparison pair -> `miloosh-comparison-opportunity-finder`.

If a user-level skill is missing, say so; do not reconstruct it from memory.

## Workflow

1. **Prove the lineage.** Which commit does production run? `vercel inspect
   miloosh.com`, then the Production deployment history. Do not trust a folder's
   name. A protection verdict computed on the wrong lineage is `NOT_VERIFIED`.
2. **Get the evidence.** Follow [gsc-capture.md](references/gsc-capture.md):
   a Pages table and a Dates table for a finalised historical window and a
   finalised recent window, same property, Web, no filters. An authenticated
   export is the best source; a read of the owner's signed-in UI is acceptable
   and must say so in the manifest. Do not assume an API connector works: test
   it, or do not claim it.
3. **Run the agent.** Missing capture -> `NEEDS_DATA` with the exact way to
   provide it. Nothing is ranked and nothing is reported as zero.
4. **Read the barriers.** Each is labelled `OBSERVED`, `SUPPORTED_HYPOTHESIS` or
   `NOT_VERIFIED`. "Crawled - currently not indexed" is a symptom to explain, not a
   root cause. Do not invent a penalty. A daily fall is reported as timing only.
5. **Close evidence gaps read-only.** Collect, for the page that leads, a live
   response check (`npm run growth:page-check`: status, canonical, robots meta,
   `X-Robots-Tag` and the sponsored links the page actually renders), a URL
   Inspection **indexed-version** lookup (never a live test, never an indexing
   request), an exact-page query table and a vendor-source gap check. Pass them
   in as sidecars or `--extras-file`, then re-run.
6. **Hand off or wait.** Only an all-gates-pass page is handed to the page
   upgrader. Otherwise the next action is evidence collection, an owner decision
   or waiting for an observation window to end.

## The ten gates

`PROTECTION_CLEAR`, `DERIVED_PAGES_CLEAR`, `PUBLISHED`, `DEMAND_MEASURED`,
`POSITIVE_LOSS`, `LIVE_TECHNICAL`, `GOOGLE_COVERAGE`, `BUYER_INTENT`,
`CONTENT_GAP`, `MONETIZATION_PATH`. `UNKNOWN` blocks exactly like `FAIL`:
unverified is not cleared. A page whose only gap is the monetisation path is
visibility-only work, and choosing that objective is the owner's decision.

## Protection

A page is editable only when every source was read and none claims it:
legacy experiment cohort, MEASURING experiment receipts, first-revenue cohort,
comparison-quality cohort, decision money pages (28-day window), recent
release commits (28-day window), and unfinished work in other worktrees. A
shared record that would also re-render a protected page blocks the edit
(`DERIVED_PAGES_CLEAR`). An unread source is `UNKNOWN`. A MEASURING record whose
declared window ended still protects the page until the owner closes it.

## Hard rules

- No page copy, title, CTA, routing, indexation or attribution change on a
  protected, observed or in-flight page.
- No Request Indexing, no repeated sitemap resubmission, no batch inspection
  requests, no redirects, no `noindex`, no mass deletion, no large content campaign.
- Zero current impressions is never by itself a reason to delete or `noindex`.
- Never select a page merely because it is unindexed.
- One owner page per intent. Overlap needs page-by-query rows; without them
  cannibalization is `NOT_MEASURED`. Never delete, redirect or `noindex` a page with
  demand without the owner's approval.
- Keyword difficulty and Domain Rating are `NOT_VERIFIED` unless a real source
  was supplied. Search position is a measurement of this site, not of competitor
  strength.
- The 14/28-day clocks start at the first **observed** Google recrawl of the URL
  (URL Inspection last-crawl date after release), not at deployment.

## Output to Eyal

Which pages lost demand (with windows and denominators), what is still earning
impressions, which pages are held and why, the single next step, and what is
`NOT_VERIFIED`. Show the evidence and acceptance the downstream skill requires.
