# Next Research — dataset-gap report and backlog

## Second-asset evaluation (mission Parts 17-18) — no second asset built this session

The mission suggested four candidates. Each was checked against real catalog data before
deciding whether to build:

| Candidate | Real catalog coverage | Verdict |
|---|---|---|
| CRM pricing/plan gates | 10 products in `category: "crm"`, 7 with verified pricing, 6 multi-tier | **Insufficient scope for this session.** "Plan gates" (which tier unlocks which specific feature) needs per-feature research that doesn't exist in the pricing schema today — a real second asset, but a bigger lift than remaining session scope allowed. |
| Ecommerce migration constraints | 11 products in `category: "ecommerce"`, 9 verified | **Already claimed elsewhere.** This is Asset B in the parallel Codex/Antigravity `linkable-deep-assets.md` plan (found this session in a different worktree). Building it here would duplicate uncoordinated work on the same repo. |
| AI-voice commercial-use constraints | 16 products in `category: "ai"`, 9 verified | **Already claimed elsewhere.** This is Asset C in the same parallel plan (ElevenLabs character-cost model). Same duplication risk as above. |
| Email-marketing pricing structures | **0** — no `email-marketing` category exists in the catalog at all (checked `data/categories/categories.json`; closest real category is the much broader `marketing`, 23 products) | **Does not exist as stated.** The suggested candidate doesn't map to a real category; would need scoping work before any research could start. |

**Conclusion:** none of the four candidates clears both bars (real, sufficiently complete
data AND no duplication with the parallel authority-building work already under way) that
this asset's own build cleared. Per the mission's own "accuracy over output count" and "do
not force it" instructions, no second full page was built this session.

**Recommended actual next candidate:** CRM plan-gates, but scoped as a real research task
first — a session that reads each of the 10 CRM products' actual feature/pricing pages and
records, per product, which named features require which tier (not just price per tier,
which is already in the catalog). That per-feature gate data doesn't exist anywhere in this
repo yet and would need to be built from scratch, the same way LiveAgent/Re:amaze pricing was
built from scratch this session.

## Part 15 architecture gap (contextual internal links, not built)

The mission asked for contextual links **from** existing Intercom/Freshdesk/Crisp/Help
Scout/customer-support-category content **to** the new research page. Checked and ruled out:
software-page FAQs are generator-produced (`generateFaq()`, no per-product override),
category-page descriptions are a single sentence with no body-content slot, and
comparison-page bodies have no per-pair override beyond `serp-overrides.ts`'s title/
description fields (confirmed the same architectural constraint this whole engagement has
respected in every prior phase). Hacking a one-off exception into any of these shared
generators for 4-5 pages would risk the other ~350 pages that share the same template.

**Real, scoped fix for a future session:** add an optional `relatedResearch?: { href: string;
label: string }[]` field to the `Software` and `Category` types, rendered as a small "Related
research" card on the existing software/category page templates when present. That's a
template change affecting all pages (safe, additive, opt-in) rather than a one-off hack for
four of them. Until that exists, the two-way link relationship runs through the new
`/research` hub and the research page's own "Related reading" section instead (both built
this session).

## Other backlog

1. **HappyFox pricing remains genuinely unknown.** If a future session finds a public pricing
   page (a redesign, a new paid tier announcement), update `data/software/happyfox.json`
   with the same rigor used for LiveAgent/Re:amaze this session.
2. **Re-verify the 11 catalog-trusted (not re-fetched) rows** on a future pass, especially
   Front, Genesys, Help Scout, Talkdesk, Tidio, Zoho Desk, and Five9, whose `last_verified`
   dates range from 2026-08-22 to 2026-09-05 -- over three weeks old relative to this
   session's 2026-09-26 compilation date.
3. **Watch for the parallel authority worktree's `/research/saas-pricing-pressure-index-2026`
   ownership note** in its own `integration-plan.md` — it explicitly defers to this branch as
   the content owner of the `/research` route; any future merge should keep that division
   clear rather than let two branches both add pages under `/research`.
4. **Coordinate before building CRM plan-gates or any other new research asset** with whatever
   the parallel Codex/Antigravity authority pipeline has done with Assets B and C by the time
   of the next session, to avoid the exact duplication this session avoided.
