# Miloosh approved premium design recovery — QA and release handoff
Date: 2026-10-09. Status at authorship: **LOCAL IMPLEMENTED / QA VERIFIED / NOT YET PUBLISHED**.

## Regression confirmed from real deployment evidence
- Vercel production deployed the warm premium redesign October 5, 2026, commit `20418cd` (project `flowtemplate`, domain `miloosh.com`).
- Subsequent Oct 7–8 SEO releases from `growth/buyer-acquisition-20260917` used a branch lacking the approved warm UI. Production before recovery was `80eb1e57ff73cacf563aafbe21f377f8db7673ed`, deployment `dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn`. This reintroduced the old dark presentation despite the owner's earlier design approval.
- This recovery was built on the **integrated** October 9 growth-agents/security-ready base `66e6a19`, not on the older October 5 repository snapshot. All original worktrees/uncommitted files and the Salesforce/Sprout commercial experiments remain untouched.

## Restored approved identity
- Warm canvas, Manrope, original BuyerDesk interactive home, brand wordmark, responsive navigation, footer, SaaS software directory, and color tokens from the October 5 approved version.
- Corrected the prior mobile CSS error that collapsed the full wordmark to 27px: it is now 120px wide on small screens.
- Restored the warm brand social-preview templates for root, software, comparisons, categories, X/Twitter; branded app icons and exact approved wordmark/avatar assets; bundled Manrope font weights for image response. Original per-vendor data and SEO metadata remain the same.
- Regression tests protect the approved public design and social branding, preventing future SEO-only releases from silently restoring the old visual system.

## Evidence from local QA
- Existing full tests on the pre-social candidate: 2,556 passed, 0 failed, with 6/6 clean gates tied to `d8f29c3` (audit/tests/validate-data/lint/typecheck/build). The final candidate **must** rerun these gates after the social preview and documentation commits.
- npm dependencies: official Next.js 16.4.0; targeted lint-only alias of Next's vulnerable `fast-glob` to official `glob@13.0.6` with a strict, version-locked compatibility adapter. Fresh unmodified Next 16.4.0 baseline verified 75/75 directory-root cases, 22 unchanged Next rule source files, identical effective ESLint configuration across six contexts, and identical real negative diagnostics. The adapter aborts for unknown API callers/versions. **Complete `npm audit`: 0 findings**. No waiver, disabled gate, dev omission, `--force`, published runtime change or outdated framework downgrade.
- Exact-content comparison: 1,785 static HTML pages compared to the existing integrated Next 16.4.0 baseline. Only `index.html` changed in `main` text/heading/internal navigation as expected; **1,784 non-home pages retained exactly the same primary text, headings, main links, canonical/robots/descriptive metadata and JSON-LD**. No missing HTML paths.
- Chromium browser QA: 27 checks, including 13 homepage viewport widths from 320 to 1920px and 12 representative commercial/help pages at desktop and mobile. All HTTP 200, warm canvas and Manrope, no horizontal overflow, no framework/JavaScript errors, 120px legible phone wordmark, one H1 and zero missing image alts in examined primary content. Mobile menu/keyboard Escape and software search to `/software/salesforce` passed. QA did not navigate affiliate links.
- Warm brand endpoints: root `/opengraph-image`, `/twitter-image`, `/icon`, `/apple-icon`, Salesforce, CRM category and Wix-vs-Shopify OG images, and `/manifest.webmanifest` responded 200 with expected image sizes and warm `#f8f9f4` top-left pixel; sample images visually inspected.
- QA artifacts on the owner's machine under `/tmp/miloosh-premium-*`; no personally identifying screenshots, bank/tax files, or owner credentials committed. The comparison did not substitute generated content for live traffic.

## Release requirements and remaining verification
Do not deploy this receipt's source until a **clean exact HEAD** passes the complete Guardian gate, the preview deployment is validated, and production is promoted with verified SHA/build identity. Confirm after release: www/apex alias, route/page content and SEO invariants, icon/social previews and buyer-desk/mobile interactions. GitHub production branch must incorporate the restored design before future SEO releases; otherwise a later build can undo the approved appearance again. Record a real deployment id/commit, never infer success from a green local build.

The earlier dark website is retained only as historical Git rollback evidence. It is not the approved Miloosh design or an instruction to agents for future work.
