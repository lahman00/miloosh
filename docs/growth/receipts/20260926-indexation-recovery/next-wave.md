# Next wave — ranked queue — 2026-09-26

## 1. Submit the remaining 6 indexing requests once the daily quota resets
`firebase`, `vercel`, `netlify`, `contentful`, `hotjar` (fully improved,
technically ready, blocked only by quota) plus, if quota allows the same
day, the 4-product AI cluster (`jasper`, `copy-ai`, `perplexity`,
`synthesia`). Zero new content work needed — purely mechanical.

## 2. Re-inspect all 24 cohort URLs (14 treatment + 10 control) after ~2-4 weeks
The whole point of the treatment/control design (`baseline.json`) is a
later comparison. Re-run live GSC URL Inspection on every URL and record:
did any treatment page move from `CRAWLED_NOT_INDEXED` to `INDEXED`? Did
any control page move on its own (which would mean something sitewide
changed, not this session's specific edits)? Do not claim causation from a
single before/after pair — note sample size limits explicitly.

## 3. Verify the 6 control-cohort products left `UNKNOWN` this session
`knowledgeowl`, `bloomfire`, `workos`, `webflow`, `swaggerhub`, `sanity`
have real baseline data but were not individually live-inspected. A future
session should confirm their indexation status directly before using them
in any before/after comparison, rather than assuming they match the 4
verified ones.

## 4. Extend the same pricing+cons+guide treatment to the next-highest
`remediation-queue.ts` candidates (re-run the script fresh; the current
top 10 are now all A-tier and will have dropped out of the C/D-only
filter). Cross-reference the new top 10 against live GSC indexation status
before treating them, exactly as this session did — do not assume they're
also crawled-not-indexed without checking.

## 5. Investigate the sitewide "crawled but not indexed" pattern directly
1,645 pages share this status. This session's real content fixes are a
drop in that bucket. A dedicated diagnostic pass — sampling 15-20 of the
1,645 across categories/ages and looking for a common, fixable pattern
(this session's own finding: near-half the catalog had zero pricing data,
which is exactly the kind of pattern worth checking at scale) — would be
higher-leverage than treating cohorts of 10-15 pages indefinitely.

## 6. Consider the weakly-linked-active-partner fix, done correctly this time
`internal-link-delta.json` reconfirms Volza/Jotform/MailerLite/Omnisend/
SurveyMonkey are still the weakest-linked active partners (unaffected by
this session's work, since none is a real alternative to any of the 14
treatment products). The correct fix requires finding which OTHER
product's guide should legitimately list one of these as a decision
option — not writing a guide keyed to the weak product itself (a real
mechanical trap this session avoided by not attempting it under time
pressure; see the prior `20260926-google-demand-capture` receipt's
`internal-link-graph.json` for the full mechanical note).

## 7. Notion/Trello demand-fragmentation investigation
Still open from the prior mission's research: both show under 2% of their
product family's combined search impressions landing on their own page.
Neither has an `AlternativeDecisionGuide` entry despite Notion being the
single most internally-linked product on the entire site. Worth a
dedicated pass once quota/priority allows.

## Explicitly held (do not act on without new evidence)
- Anything touching the 9 protected pages listed in `changes.md`.
- Requesting indexing for any URL outside a specific, evidence-backed
  Tier-A candidate — the mission's own Section 17 restraint should
  continue to apply to all future waves, not just this one.
