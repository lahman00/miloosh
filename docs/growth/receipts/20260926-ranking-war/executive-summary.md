# 85-URL Google Ranking War — Phase IV Executive Summary (2026-09-26)

Continuation of `claude/miloosh-master-google-war-20260926`. Mandate: stop investing in the
zero-demand DISCOVERED_NOT_INDEXED population (Phase III's own finding) and turn real,
observed Google demand into actual traffic instead.

## The master ranking table (Part 3)

Rebuilt from the now-71%-real-coverage canonical dataset (Phase III's engine upgrade). One
finding required correcting the mission's own premise before proceeding, exactly as Part 0
asks ("classify every URL before touching it"):

**136 of the 463 candidates with real position/impression data are contradicted by fresher
evidence** — they show historical impressions during the Aug-Sept measurement window but are
now confirmed CRAWLED_NOT_INDEXED by this session's own live bulk capture. These are pages
that *lost* their indexation, not pages ranking poorly while indexed. They were excluded from
the ranking pool and belong to Lane B (INDEX_SELECTION), not this mission's ranking lane. The
clean **327-URL true ranking pool** was segmented: 22 in striking distance (8-20), 17 near
opportunity (21-40), 144 mid-deep (41-70), 132 deep (71+).

## What the research found (Parts 6, 9, 10)

Real query-level data was pulled live from GSC's Performance report (filtered by exact page
URL) for the 15 highest-impression, unprotected Tier-A candidates plus Intercom (for
comparison). Result: **13 of 15 were already correctly aligned** to their real search intent
(mostly "X alternatives/competitors" queries matching the existing page structure exactly) —
no safe, evidence-backed title or content fix exists for these without inventing a problem
that isn't there. Two genuine mismatches were found:

- **MuleSoft**: top query is "mulesoft vs wso2" (90 combined impressions) — a real comparison
  intent the generic alternatives page can't fully serve. **Not fixed**: WSO2 doesn't exist in
  Miloosh's catalog, and adding it would mean new-product research plus a new comparison page
  — exactly the "mass URL generation" this mission's own instructions prohibit. Documented as
  backlog.
- **Umbraco**: top query is "umbraco vs wordpress" (116 impressions — the single largest
  individual query found in this entire pass), and unlike MuleSoft, **the comparison page
  already exists**, is unprotected, and already has the internal link from the software page.
  **This was fixed**: real, factually-grounded SERP title/description overrides for
  umbraco-vs-wordpress, umbraco-vs-joomla, and umbraco-vs-drupal, built on Umbraco's actual
  documented distinguishing fact (.NET-based, unlike these PHP alternatives) rather than a
  generic template. Commit `5514726`.

## Why only one page was materially changed, not 15-25

Part 50 explicitly permits this: "If a candidate turns out to be... already optimal... skip it
and move down the queue. Do not force the count." The research found that this cohort's real
bottleneck for most pages isn't intent misalignment or a fixable snippet problem — it's
competitive authority at very deep SERP positions (70-100+) for highly contested head-terms
("clickup alternatives," "salesforce alternatives") that a single session's on-page work cannot
credibly move. Forcing edits onto 13 already-correct pages to hit a target count would have
been exactly the "SEO theater" this mission's own closing order explicitly forbids.

## Gate results

tsc, full vitest suite, lint all pass (one test file, `tests/reddit/worker-lifecycle.test.ts`,
showed transient failures under resource contention during this session but passed cleanly in
isolation both before and after this session's changes — confirmed unrelated to this session's
work; see `qa.md`).
