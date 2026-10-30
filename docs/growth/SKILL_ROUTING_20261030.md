# Miloosh — reviewed skill routing and non-duplicative product intelligence

**Scope:** project integration for the new October 29–30, 2026 skill additions. No live-site changes, new npm/pip dependencies, additional analytics pipeline or automatic publishing. This guide is shared by Claude Code via `.claude/skills/miloosh-skill-integration` and Codex via `.agents/skills/miloosh-skill-integration`.

## Verified sources and lifecycle

- **Activated, reviewed:** `~/.agents/skill-library/growth-intelligence` — 20 installed skills (17 upstream, 3 local), automatically routed by `~/.agents/skills/growth-skill-router/SKILL.md` for the five business projects. The 13 Marketing Skills are pinned to Corey Haines `820ad2c1...` (MIT), four Claude SEO skills to AgriciDaniel `6be93f45...` (MIT). Local router, indexing-truth-guard and Etsy specialist are original bounded skills. Manifest and source/hash audits live under that library. No automatic updates; SEOmator is deliberately excluded. The Claude SEO Python runner is not considered ready until its doctor passes.
- **Already approved:** existing Design Intelligence / `design-skill-router`, `better-accessibility`, design QA and Verified Delivery. Preserve the About-derived warm design system and shared Miloosh Growth Director / Google Recovery / Premium Page / Affiliate / Release Guardian skills.
- **Local prototypes ONLY:** Product & Revenue Intelligence workbench at `~/AI/1. פרוייקטים/Brain/Company/Playbooks/product-revenue-intelligence`. Five prototypes (`pri-funnel-intelligence`, `pri-conversion-lab`, `pri-buyer-journey-qa`, `pri-performance-visual-qa`, `pri-customer-research-pricing`) are **NOT_INSTALLED**, **SYNTHETIC_ONLY**, with 61 passing local unit tests as of October 30, 2026. They are not global skill-discovery entries and are not approved to ingest real accounts, customer notes, production endpoints or Search Console data. Original local code with external sources referenced, not bundled; unsupported/unclear upstream licenses stay excluded.

## Use the smallest specialist set

1. Search Console indexing / coverage problem: start Miloosh Google Recovery and read `indexing-truth-guard` as an adjunct. Verify exact property, report date, URL states, observations vs hypotheses; no mass requests or automatic indexability changes. `seo-technical` only if actual render/crawl evidence is needed.
2. New comparison or buyer decision content: route through Miloosh Growth Director, current sources and existing intent owner. `content-strategy` or `site-architecture` for a real gap, `customer-research` only with permissible evidence. No scaled thin pages or copied competitor claims.
3. Conversion of **Decision Room** (`/decision-room`) and **Switching Lab** (`/decision-room/switching-lab`): use `cro` for a concrete reader friction and one hypothesis, one primary metric and guardrail. Optionally check a fixture with `pri-conversion-lab`; it is not an actual A/B test or uplift measurement.
4. Funnel metrics: source only from current existing first-party events and canonical reporting (`lib/growth/daily-revenue-report.ts` and documented Decision Room event contract). Distinguish observed qualified visits, CTA clicks, brief generation, human test sessions, vendor click and **network-attributed** payout. Use `analytics` / `attribution` for definitions, optionally the *synthetic* `pri-funnel-intelligence` contract. No joins across separate networks without verified IDs. Zero/missing/partial data != buyer activity.
5. Buyer journey QA: use the existing project test harness and browser screenshots for **actual** product behavior (search → shortlist → criteria → compare → costs → brief → switching trial). The synthetic `pri-buyer-journey-qa` contract may flag missing proof; never test paid affiliate clicks, manufacture signups, run live checkout or claim actual purchases.
6. Performance & accessible UI: Design Intelligence + `better-accessibility` / verified delivery remain the actual source of browser evidence. The synthetic `pri-performance-visual-qa` checks **stated** budgets only. Actual LCP/INP/CLS require measured browser/field data; a fixture PASS is not a measured Core Web Vital. Respect mobile, tablet, desktop, keyboard and reduced motion.
7. Pricing claims: use verified vendor record, currency, per-seat basis, billing term and verification date. Unknown stays unknown. `pricing` may help frame offers; the synthetic `pri-customer-research-pricing` validator can test arithmetic but cannot recommend a real vendor price or forecast.

## Routing matrix for the seven Miloosh work areas

Pick the row by the task, not by the skill's name. **Order of choice:** the Miloosh expert in column 2 is read first; the global specialist in column 3 is added only when the Miloosh expert leaves a real gap. Never more than one primary and one secondary. The synthetic `pri-*` contracts are never a primary and never run on live data.

| Work area | Primary (Miloosh expert first) | Secondary (at most one, only for a real gap) | Hard limits |
| --- | --- | --- | --- |
| Decision Room (`/decision-room`) | `miloosh-growth-director` | `cro` for a named reader friction | Evidence statuses and cost basis stay as built; no invented score or confidence. |
| Switching Lab (`/decision-room/switching-lab`) | `miloosh-growth-director` | `pricing` for plan, seat or billing assumptions | Browser-local evidence only; no server analytics, no private notes in URLs. |
| Google SEO & Indexing | `miloosh-google-recovery-agent` | `indexing-truth-guard`, or `seo-technical` only when render or crawl evidence is needed | Read-only; no Request Indexing, no sitemap, canonical or robots change, no protected page. |
| Conversion Optimization | `miloosh-premium-page-agent` | `cro` | One hypothesis, one primary metric, one guardrail; affiliate URLs, rel and disclosure unchanged. |
| Buyer Journey QA | `verified-delivery` with the project's real browser test harness | `better-accessibility` | Never click a live affiliate link, create signups or run checkout. |
| Funnel & Revenue Intelligence | `miloosh-growth-director` (reads `lib/growth/daily-revenue-report.ts` and `docs/decision-room/EVENTS.md`) | `analytics` for definitions, or `attribution` for source reconciliation, not both | Existing first-party events and the outbound ledger only; no new analytics pipeline; a click is never a conversion. |
| Performance & Accessibility | Design Intelligence (`design-skill-router`) | `better-accessibility` | Measured browser or field data only; a synthetic `pri-performance-visual-qa` pass is not a Core Web Vital. |

Every release-bound change in any row also goes through `miloosh-release-guardian`; that is a gate, not the secondary specialist.

## Optional bounded local pilot (no live input)

Run ONLY when the task is to validate a **synthetic fixture contract**, not on customer or analytics exports:

```bash
WORKBENCH="$HOME/AI/1. פרוייקטים/Brain/Company/Playbooks/product-revenue-intelligence"
cd "$WORKBENCH"
python3 -m unittest discover -s tests -q
python3 src/pri.py --fixture fixtures/funnel.json
```

All paths and outputs must stay within its `fixtures/` and `evidence/` restrictions. A local test does not grant access to production, an account, a checkout or project secrets. Never install or run remote scripts without additional review. The workbench remains **NOT_INSTALLED**; only this documentation is activated for project selection.

## Privacy, indexing and measurement guardrails

The local pilot must never collect, send or copy personal notes, names, emails or other private user content. Decision Room and Switching Lab browser-local evidence is not server analytics. Preserve each route's current `noindex` state and do not make an indexation change because a skill suggested a growth opportunity; the canonical Search Console and Release Guardian workflow decides whether a separate SEO release is eligible. Use aggregated, privacy-safe evidence only after explicit authorization and verified access; fixture-based NOT_RUN/UNKNOWN must not be replaced by invented values.

## Authority and rollout

User request > existing project instructions > Miloosh Growth Director / named specialists > Release Guardian for releases > reviewed global growth router > staged pilot advice. One primary plus at most one non-overlapping specialist. The adapter cannot authorize indexing, publishing, posting, spending, commercial partner changes, experiment closure or production deploy. Do not change protected software/comparison pages or SEO observation windows. Keep a clear report: exact input, provenance, missing data, checks run, conclusions, next action, PR/Preview/Production status. No fabricated sales, revenue, rankings or A/B outcome.

## Acceptance / rollback

- Cross-project scope excluded: this adapter applies ONLY to Miloosh. Do not alter Gefen, Eyal Coach, Brain/Private or unrelated businesses.
- `docs/growth/MILOOSH_GROWTH_OS_2026.md`, analytics events, React code, website copy and protected SEO data remain unchanged in this documentation-only integration.
- Global Growth Intelligence and Design Intelligence manifests, licenses and symlinks are not edited. Remove only this commit's added project adapter and routing paragraph to roll back; do not undo other agents or skills.
