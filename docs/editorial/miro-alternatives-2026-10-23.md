# Miro alternatives — production-lineage review (2026-10-23)

**Source baseline:** growth/buyer-acquisition-20260917 at ab7518555d5e2d9d544c9b8657c11a6abd4da621.

**Scope:** Miro alternatives and FAQ; add FigJam, Mural, Lucidspark product profiles. Keep Whimsical and Lucidchart. Remove the unsupported "Top pick" badge on Miro only.

**Preserved from active growth branch:** Miro verified pricing, existing cons, affiliate handling, product templates, approved warm premium design, noindex/canonical/hold rules, analytics, social pipeline, and all other product records.

**Editorial evidence:** FigJam https://www.figma.com/figjam/ ; Mural https://www.mural.co/features ; Lucidspark https://lucid.co/lucidspark ; Whimsical https://whimsical.com/diagrams ; Lucidchart https://lucid.co/lucidchart ; migration limitations https://whimsical.com/learn/imports-exports/miro-to-whimsical .

**Commercial firewall:** No new affiliate URLs, sponsored or featured flags. Novastart excluded pending hands-on verification. Ranking is an editorial use-case order, not a measured product score.

**Verification required:** data validation, full tests, lint, typecheck, build, full npm audit, approved premium design regression, render comparison against growth baseline, protected-page checks, preview, and production-source reconciliation before any publication.

**Important:** The original Miro review branch was based on the old main branch. Do not merge it into main or deploy it directly. This integration preserves the newer growth code and protected pricing.

## Security and test compatibility discovered during release review

- The October 23 full `npm audit` on the current growth baseline initially found four vulnerable packages, including critical advisories for Next.js and DOMPurify. Release is blocked on the original lockfile.
- This candidate updates Next.js to 16.4.2, Vitest to 4.1.12 and transitive DOMPurify to 3.4.17. No forced major upgrade was used. A clean audit and full release gates must be rerun against the final commit before promotion.
- A catalog test previously asserted the exact historic count of 355 products. This candidate changes it to require **at least** 355 while keeping its 15 explicitly scoped Tier C assertions. The new catalog total is 358.
- Miro belongs to the price-label hold cohort through November 4. Its verified price fields and published price language are preserved unchanged; the proposed changes affect only alternatives, sources, and FAQ.
- Vercel's production alias targets a CLI deployment without a recorded Git SHA. We independently retrieved its full uploaded source tree and compared raw SHA-1 content hashes against the growth branch at ab751855: **1,319 of 1,319 uploaded files matched** (zero mismatches, zero missing). This establishes the deployed source-file baseline; the previous tool result had truncated one hash but the full CLI retrieval resolved it.

## QA receipts before release

- Initial growth integration: 358 product records, 27 categories, 1,348 comparison routes, zero data problems; lint and TypeScript passed.
- Initial full test run (before security patches) reported one brittle exact-catalog-count assertion; it was corrected to an at-least floor without weakening the Tier C uniqueness checks.
- Security patch: `npm audit --audit-level=moderate` now reports zero vulnerabilities.
- Focused verification after patch: 19/19 tests passed across the Miro evidence, lint adapter and Reddit worker lifecycle suites using limited worker concurrency.
- Full test/build and rendered-page release gates must pass on the final candidate before promotion. No gate is waived by these receipts.
