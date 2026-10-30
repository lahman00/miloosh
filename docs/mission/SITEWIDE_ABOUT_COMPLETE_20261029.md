# Full Miloosh About design adoption — engineering candidate, October 29, 2026

> Updated October 30: the all-route candidate below is superseded by the protected rollout in `ABOUT_PROTECTED_ROLLOUT_20261030.md`. Protected routes now retain production presentation. The original October 29 description is preserved as history.

## Scope and principle

Consolidates the **approved** 2026-10-28 About visual language across the entire public site. This is not a new creative direction: warm canvas `#f8f9f4`, ink `#173b2c`, citrine accents `#e4f267`, Manrope, 1120px inner reading content, restrained 1px lines, 16px cards and modest editorial headings. Homepage retains its independently approved BuyerDesk layout and hero; home section typography and card primitives now participate in the shared design layer.

Uses **one** shared stylesheet `app/design-system.css`, global brand tokens already in `app/globals.css`, and reusable `components/ReadingLayout`, `Card`, `Badge`, `SectionHeading`, `Breadcrumbs`, `Container`, FAQ, ComparisonTable and button styles. The previous phase-one `app/_design` duplicate modules are retired in this full-adoption branch. All legal, research and About reading pages render the same shared reading layout.

## Families visually covered

- Homepage and BuyerDesk (approved layout, shared tokens and card/section primitives)
- Software detail templates and their 355 pages
- Comparison index, 1348 comparison templates and results
- Categories and guides
- Recommend / BuyerDesk results
- Contact, About, newsletter, research, cost calculator, legal/policy pages and 404s
- Desktop 1440, tablet 768 and mobile 390 viewport targets

## Protected content and release rule

No product facts, prices, affiliate URLs, vendor/source records, SEO text, canonical, robots, indexing settings, JSON-LD, ranking algorithms, conversion logic, analytics or experiment assignments may be changed for visual purposes. The protected pages **do receive a visual redesign in this candidate**, so it is intentionally **NOT deployable** under the existing Guardian policy without explicit, independently reviewed proof that the experiment/observation protections can be maintained. A 2,835-test pass or clean semantic diff alone does not override that rule.

PR #107 safely shipped the first unprotected wave; this branch completes the code for the remaining public templates. Keep the complete redesign as preview until Release Guardian returns `RELEASE_ALLOWED` for the exact new candidate SHA with all constraints met. Never mark an experiment closed by elapsed calendar time alone, lower a gate, or force an unauthorized production deploy.
