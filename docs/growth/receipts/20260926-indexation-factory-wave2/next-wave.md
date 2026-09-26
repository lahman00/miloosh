# Next wave — ranked queue — 2026-09-26

## 1. Submit the 30-URL indexing-request queue once the daily quota resets
See `indexing-request-queue.json` for the full ranked list. Rank 1
(directus) was attempted and blocked; ranks 2-30 were never attempted.
Submit in strict priority order, one at a time, stopping immediately on
any exhaustion signal.

## 2. Re-inspect all 84 cohort URLs (30 + 12 software, 12 comparison, plus Wave 1's 24) after 2-4 weeks
The whole point of a treatment/control design is a later comparison. This
wave adds 30 treatment + 12 control software pages and 12 comparison
pages on top of Wave 1's own 14 + 10. A future session should re-run live
GSC URL Inspection on every one of these and record: did any treatment
page move from `CRAWLED_NOT_INDEXED` to `INDEXED`? Did any control page
move on its own (which would mean something sitewide changed, not this
wave's specific edits)? Do not claim causation from a small sample.

## 3. Verify the 4 control-cohort products left unverified this session
`google-chat`, `mixpanel`, `slite`, `bitbucket` have real baseline data
but were not individually live-inspected. Confirm their indexation status
directly before using them in any before/after comparison.

## 4. Extend the same pricing+cons+guide treatment to the next-highest remediation-queue.ts tier
Re-run `npm run growth:indexation-readiness` and `scripts/growth/remediation-queue.ts`
fresh; this wave's 30 treatment products are now A-tier and will have
dropped out of the C/D-only filter, exactly as designed. The permanent
readiness tool already surfaces 25 real FAIL-verdict candidates
(`ahrefs`, `apigee`, `datadog`, `stripe`, `supabase`, `kong`, and others —
see the tool's own output) as a ready-made next-tier candidate pool,
cross-referencing both factual-depth deficiency AND zero-inbound-link
pages that `remediation-queue.ts` alone might miss if they lack cached
GSC impressions.

## 5. Investigate `flowtemplate-delta.vercel.app` and the `www.miloosh.com` referring-domain observations
Both are real findings from live GSC data this session (`systemic-fixes.md`,
sections 2-3), neither investigated to a conclusion. Worth a dedicated
technical-SEO pass: is `flowtemplate-delta.vercel.app` an old preview
deployment that should be taken down or noindexed, and does
`www.miloosh.com` correctly 301-redirect sitewide?

## 6. Reconcile with `codex/google-visibility-war-20260926`'s `lib/google-war/` system
This wave built its own independent `scripts/growth/indexation-readiness.ts`
rather than merging that branch's conceptually-overlapping `quality.ts`,
per the mission's "DO NOT blindly merge anything." A future integration
session should read both in full and decide whether to consolidate them
into one system or keep them deliberately separate.

## 7. Low-priority: `tags`, `founded`, `company` fields
Noted in `systemic-fixes.md` as unrendered but low-value metadata (8-37
products populate them) — not worth a dedicated template change on their
own, but worth folding into a future template pass if one happens anyway.

## Explicitly held (do not act on without new evidence)
- Anything touching the 9 protected experiment pages or the 24 Wave-1
  frozen slugs.
- Anything touching this wave's own 12-product control cohort or 30-product
  treatment cohort's already-shipped content (the treatment cohort's
  pricing/cons/guides are done; don't re-edit them just because a future
  session is active — that would itself contaminate this wave's own
  before/after baseline the same way editing Wave 1's cohort would).
- Requesting indexing for any URL outside a specific, evidence-backed
  ranked-queue entry, and never same-day after a quota-exceeded signal.
