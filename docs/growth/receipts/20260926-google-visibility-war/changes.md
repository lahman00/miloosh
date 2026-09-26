# Exact changes and concurrency receipt

## Coherent implementation commits

- `ae24699736a340405f07a69a5104df71385293b2` — evidence engine, graph, protection/intent/indexation/quality gates, normalized evidence, explicit eight-path editorial mapping, focused regression tests.
- `2bccd6753db23f7e3d96c20aee499ae3eb7ae990` — render those paths on four existing guides, browser QA and graph-delta receipt generator.
- `da74b7e` — allow immutable dated future GSC imports without overwriting the seed; real importer execution/replay test.
- Documentation/receipt commit follows these commits. No push or deployment.

## Eight new paths

| Source guide | Target | Reader decision |
|---|---|---|
| `/best-email-marketing-for-small-business` | `/software/mailerlite` | Evaluate the product shortlist and tradeoffs |
| `/best-email-marketing-for-small-business` | `/compare/mailerlite-vs-moosend` | Resolve a two-product email shortlist |
| `/best-ecommerce-platform-for-small-business` | `/compare/omnisend-vs-klaviyo` | Compare store messaging separately from the store platform |
| `/best-ecommerce-platform-for-small-business` | `/software/omnisend` | Check fit before adding another subscription |
| `/best-no-code-database-for-operations` | `/software/jotform` | Distinguish intake collection from data organization |
| `/best-no-code-database-for-operations` | `/compare/surveymonkey-vs-jotform` | Distinguish feedback from structured submissions |
| `/best-lead-tracking-for-agencies` | `/software/jotform` | Separate enquiry capture from attribution |
| `/best-lead-tracking-for-agencies` | `/software/surveymonkey` | Separate customer feedback from click attribution |

No ranking order is changed. The navigation is not selected by affiliate relationship status and does not add merchant CTAs. Existing ranked shortlists, disclosure, source citations and primary money-page links remain intact. A browser check caught an initially duplicated ecommerce-to-email-guide link and replaced it with the existing Omnisend/Klaviyo comparison before finalization; the final graph asserts all eight source/target pairs are new.

## Files and reusable tools

- `lib/google-war/{evidence,graph,priority,protection,quality,deployment-proof}.ts`: independently tested evidence and policy functions.
- `scripts/growth/google-war.ts` + `package.json`: daily read-only command; invokes the existing full emitted-HTML technical gate.
- `scripts/growth/import-google-war-evidence.ts`: provenance-labelled dated imports; no overwrite, credentials or network.
- `scripts/growth/freeze-google-war-baseline.ts`: one-time, no-overwrite mission freeze.
- `scripts/growth/google-war-receipt.ts`: exact eight-edge/zero-removal/protection-footprint assertions and receipt generation.
- `scripts/growth/google-war-browser-qa.ts`: localhost-only browser verification at three widths.
- `scripts/growth/gsc-opportunity-miner.ts`, `scripts/growth/remediation-queue.ts`, `lib/seo-factory/run.ts`: share protection; preserve historical ranking data/behavior outside suppression. The older report formats are not a replacement for the new source-labelled control report.
- `scripts/growth/internal-link-graph-v2.ts`: correct misleading “true orphan” wording for its partial model.
- `data/growth/google-war/*`: immutable seed, raw-vs-reported inspection provenance, 43-page completeness baseline, request history and local-only improvement receipt.
- `data/seo/decision-paths.ts`, `components/RelatedDecisionPaths.tsx`, `app/[guide]/page.tsx`: scoped SSR navigation; no new client boundary.
- Four new test files (`tests/growth/google-war*.test.ts` and the decision-path suite): evidence, policy, real catalog baseline, importer replay and navigation.

## Parallel work preserved

The canonical checkout began at `92d084bff726f034632fc24ea37ab0b3e6da39e3`; it was not used as an edit target. Its unrelated banner and image retained their original SHA-256 values:

- `app/api/social/linkedin-banner/route.tsx`: `4da847a811a6b27a2bd75b1d96fa4d39e442d50a69ccee9020f1e3961e1fe08b`
- `Miloosh SEO Sprint.png`: `990497d74f4386cdbe7ed1471dad5e1e23930a168c43ce792d2c91b288476fc8`

A new unrelated `docs/growth/MILOOSH_OFFSITE_ATTACK_20260926.md` appeared there while other work continued; it was not touched. Claude's separate worktree advanced to `6464464457a84ac884b3c48405d8c8cd5b83b651` after this branch's base. Its later decision-guide/template commits are **not** silently included here. Likewise, the earlier foreground-engagement branch ending at `4043749` is separate and must be reconciled explicitly during integration.

No reset, rebase, stash, force push, merge, affiliate-data edit, product JSON rewrite, social edit, secret access or production state mutation was performed.
