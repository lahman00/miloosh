# About-approved design — safe release wave 1 (2026-10-29)

Production base: `9ca469f137bc7ed43935f10e25f262a91bf363bd` (`growth/buyer-acquisition-20260917`). Parent design proposal: PR #106 (`ed6a1bc`), deliberately **not merged** because the site's Release Guardian blocks its global shared-template changes.

## Actual rollout scope

- New **local** reusable design primitives under `app/_design/`: `premium.module.css`, `ReadingLayout`, `PremiumLegalPageLayout`. No global CSS, layout, shared component, data, SEO, affiliate, analytics or ranking changes.
- The validated About reading system and style ported to `/about`, eleven legal/policy pages, `/contact`, `/newsletter`, `/newsletter/unsubscribe`, `/recommend`, `/recommend/results`, the pricing-pressure-index research page, and the SaaS cost calculator.
- Shared brand tokens continue to come from unchanged `app/globals.css`. Header, footer and Home/BuyerDesk retain the already-matching warm premium presentation.
- Software pages, individual comparisons, category pages, guide templates and their protected experiments remain completely unchanged for this wave. The CSS module is locally imported only in the explicitly approved routes above; it cannot visually affect an unimporting route. Staged module isolation has an automated regression test.
- Long-form pages get the About `On this page` navigation and id-linked headings. Original section bodies, site facts, SEO and affiliate behavior preserved. The navigation legitimately duplicates heading labels and adds internal `#` links.

## Verified on local clean base/candidate production builds

- Production build and Search Console SEO sentinel passed (612 baseline URLs, 0 missing).
- Chromium protected-route regression comparison: 13 representative **unchanged** routes (Home, Miro, Salesforce, Semrush, Notion, Klaviyo, WooCommerce, Calendly, 3 comparison pages, CRM category, Guides) at 390/768/1440px. **39/39 byte-identical viewport PNG screenshots and identical DOM/SEO/link targets/computed top-level presentation.**
- 19 changed routes × 390/768/1440px: exact old vs staged status, document title, metadata, canonical/robots, JSON-LD, primary link destinations and `rel` checked. H1 count, console errors and overflow checked. See local QA recording for exact results; not tracked because it contains machine-specific environment and ephemeral test output.
- The *full* test suite, lint, data validation, typecheck, security audit and build must be re-run on the exact committed candidate by `growth:record-gates`. Release is conditional on **actual** `growth:director`/Guardian `RELEASE_ALLOWED`, production ancestry, Vercel Preview and final live verification. A green Vercel build is not a Guardian release decision.

## Stage 2 and remaining pages

Do not deploy PR #106 wholesale. Software, comparison, category and guide templates require independent, controlled release phases after the protected cohorts and observations legitimately conclude or a purpose-built rigorous design-only proof mechanism is reviewed and accepted. No observation windows or experiment decisions are waived. As of Oct 29, 184 unique URLs were claimed by the current protection sources; the dates Nov 4/5/12/17/24 are **earliest review dates, not automatic unlocks**, and 9 unique URLs have unresolved `MEASURING` experiment records.
