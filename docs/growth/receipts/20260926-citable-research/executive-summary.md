# Citable Research Asset Factory — Executive Summary (2026-09-26)

Continuation of `claude/miloosh-master-google-war-20260926`. Mandate: stop rewriting
already-correct pages (Phase V's finding) and instead build something the web has a real
reason to cite. Explicit non-goal: "Success is NOT another 'best software' article."

## What was found before building anything

An unpublished Antigravity draft, "2026 Customer Support Pricing Divergence Index," was
located at `docs/growth/receipts/20260926-authority-expansion-war/linkable-asset.md` (a
different, parallel worktree's uncommitted output — read-only, never staged or merged, per
that worktree's own `integration-plan.md`). The draft's methodology section claimed a
"15 customer support and helpdesk platforms" sample, but its actual data table showed
verified figures for only 3 vendors (Intercom, Crisp, Freshdesk). Per this mission's own
instruction ("do not publish the draft blindly"), the draft was not used as a source of
truth — it was treated as a topic pointer only, and the entire dataset was rebuilt from
Miloosh's own canonical catalog plus fresh primary-source verification.

## What was actually built

**`/research/customer-support-pricing-2026`** — "Customer Support Pricing Benchmark 2026."
Not called an "index": the page computes no single composite score, so "benchmark" is the
defensible term (see `methodology.md`). Sample: all 16 products Miloosh's own catalog tags
`category: "customer-support"` — not a hand-picked vendor list, so no vendor could be added
or dropped to fit a preferred conclusion.

- 15 of 16 vendors have real, sourced pricing data (13 already verified in the catalog, plus
  2 — **LiveAgent** and **Re:amaze** — newly verified live against their own pricing pages
  this session and added to the canonical catalog, since both were previously empty
  `pricing: {}` records). **HappyFox remains UNKNOWN** — its pricing page discloses no dollar
  figures at all; this was not filled in with an estimate.
- **5 of 16** vendors (Freshdesk, Gorgias, Intercom, Kayako, Re:amaze) publish a distinct,
  separately billed AI-usage price — not 1, as the original draft's framing implied. Four
  different billing-unit shapes exist among these five (per-outcome, per-resolution overage,
  per-session-block, and a seat-price-undisclosed inversion at Kayako).
- A verified crossing-point scenario is computed for Intercom only — the one vendor in the
  disclosed-AI-usage set whose seat price, AI price, and seat count are all public with no
  undisclosed allowance offsetting the arithmetic. The other four are explicitly marked as
  not computable this way, with the specific missing input named per vendor.
- The page exposes a real downloadable dataset (JSON and CSV, `/api/research/
  customer-support-pricing-2026[/csv]`), a citation block, Dataset JSON-LD (schema.org), and
  contextual links back into the relevant product and comparison pages.
- A second research asset now exists alongside the pre-existing SaaS Pricing Pressure Index,
  so a `/research` hub page was built (the mission's own conditional for building one).

## What was deliberately not built

A second full research asset. Two of the mission's four suggested candidates (ecommerce
migration constraints, AI-voice commercial-use constraints) are already in the parallel
Codex/Antigravity authority pipeline's own `linkable-deep-assets.md` plan as Assets B and C —
building them here would create duplicate, uncoordinated work on the same repo. A third
(email-marketing pricing) has no corresponding category in the catalog at all. The fourth
(CRM plan gates) has a real but thin sample (10 products, 7 verified) and would need new
feature-gate research this session did not have scope for. See `next-research.md` for the
full, evidence-based gap report — built instead of forcing a second page, per this mission's
own "accuracy over output count" instruction.

## Coordination note

A previously unknown worktree, `codex-google-command-center-20260926`
(`/Users/eyalhaimovich/Desktop/Miloosh/01-Current/codex-google-command-center-20260926`),
was found mid-session with a live Codex process attached and its own active "authority
control room" work (external-evidence registry, brand-demand tooling, editorial outreach
including a prepared SaaS Mag submission). Its own `integration-plan.md` had already merged
this branch's Phase V commit and explicitly deferred to this branch as the owner of the
`/research` route. No file in that worktree was read for anything beyond awareness, and
nothing there was edited.

## Gate results

tsc, full vitest suite (2149 tests / 247 files), lint, `validate:data`, `maintenance:seo`,
`maintenance:links`, and `build` all pass. See `qa.md` for the one pre-existing,
unrelated-to-this-session link-check finding.
