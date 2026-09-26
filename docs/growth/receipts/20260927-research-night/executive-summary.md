# Overnight Research + Trust Factory — Executive Summary (2026-09-27)

Continuation of `claude/miloosh-master-google-war-20260926`. Mandate: by morning, have one
production-ready research asset package, a second citable asset if the data genuinely supports
it, stronger public trust surfaces, a clear Antigravity handoff, and zero invented claims.

## What happened, in order

1. **Re-verified the Customer Support Pricing Benchmark line by line.** All 16 vendor rows were
   independently re-fetched live (a 16-way parallel research pass) and diffed against the
   committed dataset. Found that the headline finding was **undercounted**: 5 of 16 vendors
   disclosing a separate AI-usage price should have been **9 of 16** -- 4 vendors' AI pricing
   (Front, HappyFox, Help Scout, Tidio) was missed in the original research, and HappyFox's entire
   pricing record (previously entirely unreachable/UNKNOWN) is now fully verified and priced. This
   is disclosed transparently on the live page itself, framed correctly as a correction to
   incomplete original research, not vendors changing prices overnight. See `dataset-audit.json`.
2. **Built the second research asset: the CRM Plan-Gate Dataset 2026.** Researched all 7 CRM
   vendors named in the mission brief against primary sources and built
   `/research/crm-plan-gates-2026` -- a genuinely non-ranking, buyer-decision dataset answering
   "which plan do I actually need for email sync / automation / sequences," not "which CRM is
   best." The other three candidate second-assets (ecommerce migration, AI-voice limits,
   email-marketing) were evaluated and explicitly NOT built -- see `second-asset-decision.md` for
   why (duplication risk with a parallel worktree's own plans, and a missing catalog category,
   respectively).
3. **Built the `/research` hub to list all three assets** (CRM Plan-Gate Dataset, Customer
   Support Pricing Benchmark, SaaS Pricing Pressure Index).
4. **Audited the trust surface** (About, Editorial Policy, Sources Policy, Corrections Policy,
   Affiliate Disclosure, AI Usage Disclosure) and found it already mature -- no fake credentials,
   no fabricated ratings, an unusually honest AI-usage disclosure already in place. The one real
   gap found and fixed: neither research page linked out to these sitewide policies. Fixed on
   both new/changed research pages.
5. **Found and fixed a real bug during QA**: both new pages' "Verified {date}" citation label was
   computed from the sandbox's real system clock, which is one day behind this session's own
   narrative verification date -- producing a visible inconsistency between the citation block and
   the page's own body text. Fixed with a decoupled, hardcoded verification-date constant on both
   pages.
6. **Produced handoffs for both downstream teams**: `authority-handoff.json` for Antigravity
   (covering both the new CRM asset and the corrected customer-support figures, with an explicit
   note that any draft using the old "5 of 16" number needs updating) and `codex-handoff.json` for
   analytics wiring (reusing the existing first-party event pipeline, no new store).

## What was deliberately not done

A second full research asset beyond CRM plan gates was not forced. Two of the four suggested
candidates are already claimed by a parallel worktree's own authority-building plan (discovered
this session); a third has no matching catalog category at all. Building any of them here would
either duplicate uncoordinated work elsewhere in the same repo or require inventing a product
sample that doesn't currently exist -- both of which this mission's own "accuracy over output
count" and "do not force it" instructions argue against.

## Gate results

tsc, full vitest suite (2159 tests / 248 files, 32 new), lint, `validate:data`,
`maintenance:seo` all pass. See `qa.md` for full detail including the date-consistency bug found
and fixed during QA.

## Files

See `dataset-audit.json` for every customer-support field that changed, `second-asset-decision.md`
for the CRM go/no-go reasoning, `methodology.md` for both assets' verification standards, and the
git commit for the exact file list.
