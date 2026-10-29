# Site-wide About design system port — October 29, 2026

Branch `design/about-system-sitewide-20261029`, based on production head `9ca469f` (PR #104). Presentation only; local commit, nothing pushed or deployed.

## What this is
The About page's design language (title 2.25–3.5rem/1.12/650, 62ch muted intro, 1px separators, 1120 width, sticky "On this page" nav, 44px targets) translated to every inner route through a small shared layer rather than a copied sidebar. Home (`.home-design`) is untouched.

## Files changed
- New: `app/design-system.css` (page-shell, page-title, intro/meta, weight/tracking, legacy-utility → token settling, link/focus rules), `components/ReadingLayout.tsx` + `.module.css` (sticky TOC reading layout), `tests/brand/sitewide-design-system.test.ts`, this doc.
- Shared components: `Container` (default and new `wide` = 1120px), `Card`, `Badge`, `SectionHeading`, `Breadcrumbs`, `FaqSection`, `LegalContent` (now ReadingLayout), `LegalPageLayout` (page-shell, wide container, TOC), `ComparisonTable` and `ComparisonVerdictCard` (`decision-surface` soft shadow), `lib/button-styles.ts` (8px control radius, token secondary/ghost).
- `app/layout.tsx`: one CSS import.
- Route templates (class swaps only: `<main class="page-shell">`, `<h1 class="page-title">`): about, software/[slug] (+not-found), compare, compare/[comparison] (+not-found), category/[slug] (+not-found), [guide], guides, recommend (+results), tools/saas-cost-calculator, research/saas-pricing-pressure-index-2026, contact, newsletter (+unsubscribe), root not-found. About page itself now uses the shared ReadingLayout (copy unchanged from the reference).

## Route families
1. Legal/editorial (11 legal pages via LegalPageLayout, About): reading layout with sticky TOC.
2. Software, 3. Comparison, 4. Category/guides/search/recommend/tools/research: page-shell hero typography, white 1px-line cards, soft-surface chips, stage-tone tints replacing dark emerald tints, token buttons.
5. Home: unchanged. 6. Header/footer unchanged except shared Breadcrumbs/Container.

## Design rules
Tokens only (canvas, surface, surface-soft, stage, ink, muted, citrine, line). No gradients/glass (asserted by test). Cards: white, 1px line, radius 16; soft shadow only on verdict and comparison surfaces. Unlayered rules in `design-system.css` intentionally override legacy `border-white/*`, `bg-white/[…]`, `bg-emerald-*/…` utilities under `.page-shell` only.

## Not touched
data/software, data/seo, lib/indexing-quality, affiliate logic, pricing/copy, canonical/robots/JSON-LD, sitemap, BuyerDesk, tracking components, analytics.

## QA outcomes
- `npm audit --audit-level=moderate`: 0 vulnerabilities. `validate:data`: valid (355 software, 27 categories, 1348 comparisons). eslint: clean. `tsc --noEmit`: clean.
- Full vitest: 269 files / 2835 tests pass (includes the new design contract and the existing premium-design/social regression tests). `npm run build`: succeeded.
- Semantic diff vs base `9ca469f` over 13 routes (canonical, robots, JSON-LD, main-content links and text): identical except `/privacy` and `/about`, where the only additions are the in-page "On this page" anchor nav (heading text repeated, `#` links). Host-dependent canonical/JSON-LD differences between dev and prod were normalized.
- Browser (headless Chromium, production build, 1440 and 390 widths): `/`, `/about`, `/software/salesforce`, `/software/semrush`, `/compare/wix-vs-shopify`, `/category/crm`, `/guides`, `/recommend`, `/tools/saas-cost-calculator`, `/privacy`, `/compare`, research, contact, newsletter, 404: one H1 each, zero horizontal overflow, zero JS page errors (only the expected 404 resource log).

## Known gaps
- Flagged small (<24px high) controls are unchanged from baseline on software/compare pages (inline vendor/source links, chips) and the research table (260 links); not part of this port.
- Many page-local components still carry inline dark-era utilities; they are settled by the CSS layer, not individually rewritten.
- Not checked: tablet widths, keyboard walkthrough of BuyerDesk/search by hand, real-device Safari. Supervisor release proof (production SHA, preview, live checks) still required before any deploy.
