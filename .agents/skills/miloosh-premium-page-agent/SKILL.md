---
name: miloosh-premium-page-agent
description: Prepare the typed handoff from the Google Recovery and Affiliate agents to the existing money-page upgrader for one Miloosh buyer page. Use only after a page has passed every recovery gate, or when Eyal names one exact editable URL. A thin router, not a page engine: it builds and checks the handoff, then the user-level miloosh-money-page-upgrader does the work. Never edits a protected, observed or in-flight page and never releases.
metadata:
  author: miloosh
  version: "1"
---

# Miloosh Premium Page Agent

There is no new page engine here and none is needed. The engine is the
user-level `miloosh-money-page-upgrader` skill (it improves one existing,
unprotected buyer page with official pricing and product evidence, a relevant
comparison path and verified partner tracking, then verifies the rendered
output). This skill only guarantees that the page deserves the upgrader's time and
that the upgrader receives a complete, typed brief.

If `miloosh-money-page-upgrader` is not available, say so explicitly and stop;
do not rebuild its workflow from memory.

## The handoff

`buildPageUpgradeHandoff` (`lib/growth-agents/premium-handoff.ts`) returns
`READY` with a schema-checked brief, or `NOT_READY` with every reason. It builds
the brief only when:

- every recovery gate passed (`eligible`), including protection, derived pages,
  live technical state, Google coverage, buyer intent, a vendor-confirmed content
  gap and a verified monetisation path;
- the page and every page it would re-render are `EDITABLE`;
- demand is measured on both sides (historical and recent windows).

The brief carries: exact URL and checkout SHA, one measurable hypothesis (a
hypothesis about this page only, never a ranking promise), baseline impressions
and windows, the protection verdict and derived-page count, the partner slugs
and their payout readiness, what must be preserved (tracked CTA components and
sponsored rel, affiliate disclosure, canonical and robots directives, every
protected or observed page's rendered output), acceptance checks, the Release
Guardian verdict and the measurement clock (14 and 28 days from the first
**observed** Google recrawl, not from deployment).

## What the upgrader must still do

Re-check protection at the implementation SHA, verify the gap against current
official vendor documentation, make one local change, compare the rendered
output of every derived page with the base build and keep production release a
separate, owner-approved step. A no-partner page is visibility-only work; the
owner chooses that objective.

## Hard rules

- One URL at a time. No bulk edits, no new URLs unless a distinct intent, evidence
  and an internal-linking path exist, no filler length.
- No fabricated reviews, testing, authorship, usage data or search metrics.
- Partners may influence which valid options get deeper coverage, never the
  winner, a fabricated strength or a hidden limitation. Keep the disclosure,
  `rel=sponsored` and non-partner options.
- No Product or FAQ schema that visible content does not support.
- A page in a measurement window is not touched until the window ends.
