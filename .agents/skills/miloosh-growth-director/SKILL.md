---
name: miloosh-growth-director
description: Coordinate the Miloosh growth and revenue agents (Google Recovery, Affiliate Revenue, Premium Page, Authority & Distribution, Release Guardian) and answer "what is the single most valuable, defensible action to take next". Use for growth status, prioritisation, "what should we do next", a weekly growth review, or before any traffic, SEO, buyer-page or affiliate task. Read-only by default; runs `npm run growth:director`; never publishes, deploys, requests indexing, sends messages or changes an account.
metadata:
  author: miloosh
  version: "1"
---

# Miloosh Growth Director

One question, answered with evidence: **what is the single most valuable,
defensible action Miloosh should take next to acquire commercially relevant
visitors and improve the chance of affiliate revenue?**

The Director merges the specialist agents into one ordered queue and one
Hebrew report for Eyal. It is a coordinator, not a publisher: it has no
authority to edit a page, deploy, push, merge, request indexing, send a message,
spend money or touch a partner or Google account. Those steps stay with Eyal or
with the existing downstream skills, one URL at a time.

Speak simple Hebrew with Eyal. Public Miloosh content and code stay US English.

## The agents and where each one lives

| Role | Implementation | Skill that does the human-in-the-loop work |
| --- | --- | --- |
| Google Recovery | `lib/growth-agents/google-recovery-agent.ts` | `miloosh-google-recovery-agent` (routes to the user-level `miloosh-google-recovery-director` and `miloosh-revenue-recovery-finder`) |
| Affiliate Revenue | `lib/growth-agents/affiliate-revenue-agent.ts` | `miloosh-affiliate-revenue-agent` (routes to `miloosh-comparison-opportunity-finder` for pair choice) |
| Premium Page | `lib/growth-agents/premium-handoff.ts` (typed handoff only) | `miloosh-premium-page-agent` -> user-level `miloosh-money-page-upgrader` (the page engine; not duplicated) |
| Authority & Distribution | `lib/growth-agents/distribution.ts` | `miloosh-authority-distribution-agent` |
| Release Guardian | `lib/growth-agents/guardian.ts` | `miloosh-release-guardian` |
| Director | `lib/growth-agents/director.ts`, CLI `scripts/growth/growth-director.ts` | this skill |

The three user-level skills named above live in `~/.claude/skills` and are not
part of the repository. If one is missing or unreadable, say so explicitly and
do not improvise its workflow.

## Run it (read-only)

1. Work from an isolated worktree on a verified base. Never reset, clean, stash,
   overwrite or discard an existing worktree or an unrelated uncommitted change.
   Prove which commit production runs before trusting any checkout
   (`vercel inspect miloosh.com` plus the Production deployment history).
2. Provide Search Console evidence as a capture directory. See
   [run-book.md](references/run-book.md) and
   [../miloosh-google-recovery-agent/references/gsc-capture.md](../miloosh-google-recovery-agent/references/gsc-capture.md).
   The Search Console API connector is not assumed to work: it has not been tested
   here and no credential is read.
3. Run:

   ```bash
   npm run growth:director -- --gsc-dir <capture-dir> --base-sha <production-commit> --release-date <YYYY-MM-DD>
   ```

   Without `--out` nothing is written. Add `--out <dir>` to write
   `director-report.json`, `director-report.he.md` and `candidates.csv`.
   `--run-gates` and `--check-production` are explicit opt-ins described in the
   run-book. `npm run growth:page-check` reads Miloosh's own public pages (plain
   GET, never an affiliate link) to produce the per-page evidence file.
4. Read the Hebrew report. Every figure carries its window, denominator and
   evidence label. A figure that was not measured is `UNAVAILABLE`,
   `NOT_MEASURED` or `NOT_OBSERVED`, never zero. Read
   [evidence-rules.md](references/evidence-rules.md) before changing any
   threshold or label.

## How the next action is chosen

Fixed precedence, no numeric score, so the same evidence always gives the same
answer and every position can be explained:

1. Work an agent can execute now (for example, hand an eligible page to the page upgrader).
2. A decision only the owner can take (payout setup, closing an elapsed experiment, a registry conflict).
3. Evidence an agent can collect read-only.
4. Waiting (an observation window, the first Google recrawl).
5. Release gates, which are reported but never answer the question themselves.

Ties are broken by measured historical demand, then date, then id.

The shortlist holds at most five pages. A page enters only if the checked-out
code publishes it, it has a defined path to action (editable now, or inside an
observation window with an end date) and it has at least the operating floor of
measured historical impressions. A page that shares a product record with a
higher-ranked shortlisted page is suppressed: editing both would be one
interdependent change.

## Route work, never absorb it

- Recovery diagnosis -> `miloosh-revenue-recovery-finder`; existing buyer page ->
  `miloosh-money-page-upgrader`; comparison choice -> `miloosh-comparison-opportunity-finder`.
- Account-level payout actions, experiment closure and Guardian decisions ->
  Eyal, via `miloosh-project-manager`.
- Start every Miloosh traffic, SEO, buyer-page or comparison task by stating
  which of the three skills you use, and finish by showing the evidence and
  acceptance it requires (repository `AGENTS.md` rule).

## Hard rules

- Read-only by default. No page edit, no preview, no production change, no Request
  Indexing, no sitemap resubmission, no redirect, no `noindex`, no mass deletion,
  no large content campaign.
- Never invent visits, conversions, keyword volumes, Domain Rating, rankings,
  commissions or earnings. Never forecast earnings from impressions.
- No protected-page copy, title, CTA, routing, indexation or attribution change
  while a measurement is running. A page is editable only when every protection
  source was read and none claims it; an unread source means `UNKNOWN`, not clear.
- Never navigate a live affiliate URL to test it and never generate synthetic
  affiliate traffic. Report a click as a click, never as a conversion.
- Do not buy a subscription, connect an external data processor or expose
  account information. Never weaken, remove, skip or bypass a security check; if
  a gate fails, report the exact blocker and leave deployment disabled.
- Preserve every other worktree (Salesforce and Sprout Social included). Do not
  deploy them opportunistically.
- Local commits only. The owner pushes and deploys.

## Report to Eyal (simple Hebrew)

State what already existed, what was built, which tests ran and their result,
where the files are, the shortlist (at most five) only if the evidence supports
it, what is missing or blocked, whether anything was published, and the exact
next action. Mark each statement `IMPLEMENTED`, `TESTED`, `RELEASED`, `OBSERVED`
or `NOT_VERIFIED`. Content shipped is not traffic earned, and a deployment is
engineering completion, not a Google result.

## References

- [run-book.md](references/run-book.md): flags, outputs, exit codes, what each run does and does not do.
- [evidence-rules.md](references/evidence-rules.md): measurement states, windows, thresholds and why each is an operating choice.
- [marketingskills-provenance.md](references/marketingskills-provenance.md): what was reviewed from outside skill libraries, what was adopted and what was refused.
