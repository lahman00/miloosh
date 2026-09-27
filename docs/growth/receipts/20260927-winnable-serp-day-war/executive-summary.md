# Daytime Winnable SERP + Research Moat War — Executive Summary (2026-09-27)

Continuation of `claude/miloosh-master-google-war-20260926`, run alongside the release lane
(Codex's `codex-miloosh-master-release-20260927` branch -- not touched, not even read). Mandate:
build a repeatable Miloosh advantage in SERPs the domain can actually win, without mass rewrites,
without duplicating Codex's measurement work or Antigravity's outreach, and without touching any
experiment control.

## The single most important thing this session found

**A significant fraction of last night's "winnable target" list turned out to be under real
experiment protection that a stale cached report had obscured.** Re-running `npm run
growth:google-war` fresh (rather than trusting the machine-generated snapshot from the prior
session) surfaced a genuine discrepancy: Ecwid is under an **actively measuring** revenue
experiment (`docs/work-revenue-experiment-receipt-2026-09-12.json`, running until 2026-10-10);
Adyen is a **control** page in a frozen cohort; Drupal is an already-**treated** page in a
different cohort; and Freshdesk, Help Scout, RingCentral, and Front carry legacy conservative
reservations. Discovering and respecting this -- rather than editing any of these pages tonight --
is this session's most consequential finding, and it directly prevented several would-be
protection violations (most acutely, adding pricing data to Webflow, which is also a frozen-cohort
control).

## What was built

1. **The CMS Buying Decision Matrix 2026** (`/research/cms-buying-decision-2026`) -- Miloosh's
   fourth research asset, built from a fresh 8-agent research pass across WordPress, Umbraco,
   Craft CMS, Drupal, Joomla, Webflow, Contentful, and Storyblok. Its headline finding: only 1 of
   8 platforms (WordPress) documents a vendor-supported migration path both INTO and OUT of the
   platform -- every other platform documents one direction but not the other. This asset cites
   public facts about all 8 products **without modifying any of the 6 protected products' own
   `/software/[slug]` pages**, including sourcing Webflow's pricing (absent from the catalog)
   directly in the new asset rather than writing it back to a page that is a protected control.
2. **A refreshed, richer 29-family winnable-SERP map** (`serp-map.json`) with index state,
   experiment protection, and affiliate readiness added as real fields -- not just impressions and
   position.
3. **A precise, evidence-based remediation for the Freshservice/Freshdesk anomaly**
   (`freshservice-anomaly.md`): re-running the growth engine found `/software/freshservice` is
   `DISCOVERED_NOT_INDEXED` with a strong 90/100 content score -- this is a crawl-priority problem,
   not a content problem, and the engine's own established guidance explicitly warns against
   manually requesting re-indexing. A mitigation (a search-intent note on the Freshdesk page) was
   already shipped days ago and needs weeks, not days, to show effect.
4. **Confirmation the Umbraco/WordPress anomaly is unchanged and exactly on schedule**
   (`umbraco-anomaly.md`) -- the Phase IV title fix is 1 day old; no change was expected, none was
   found, and no further edit was made.
5. **20 real, spot-checked link-earning candidates** (3 of 20 independently re-verified live) for
   Antigravity, split across the Customer Support Pricing Benchmark and CRM Plan-Gate Dataset.
6. **25 numerical claims audited**, 0 published errors found, 3 uncertain claims explicitly kept
   out of the new asset rather than asserted.

## What was deliberately not done

- **No content edit to any of the 8 targets initially assumed actionable** beyond the 2 already
  executed last night (Help Scout, WordPress pricing) -- 5 of the remaining candidates turned out
  to be protected, and the other 3 (Webex, Confluence, and the two newly-added Front/Sprout Social
  targets) were not yet given a specific, evidenced weakness to act on.
- **No further edits to Umbraco or Freshdesk/Freshservice** -- both anomalies already have
  mitigations in flight that need time, not more changes.
- **No fifth research asset** -- the other three candidates remain blocked by an unresolved
  duplication question (now flagged for a third consecutive session) or a missing catalog
  category.

## Gate results

tsc, lint, full vitest suite, `validate:data`, and `build` all pass -- see `qa.md` for the exact
run detail, including the fresh `growth:google-war` regeneration that resolved the protection-registry
discrepancy.
