# Passive-link prefetch reduction — 1 October 2026

Status at commit: local release candidate, not yet promoted. This record covers application transport behavior, not Google indexing or revenue.

## Small change

Set `prefetch={false}` only on SoftwareCard, CategoryCard, CompareGrid cards, and Footer links. Native anchor destinations and Next client navigation remain available. Main navigation, primary CTAs, affiliate URLs, text, prices, SEO metadata, canonical, sitemap, robots and experiment/protection registries are unchanged. No RSC request rewrite or resource block was introduced.

Installed Next.js 16.3.8 documentation describes viewport-triggered production prefetching and explicitly documents disabling it for secondary/footer links. Sources: `node_modules/next/dist/docs/01-app/02-guides/prefetching.md` and `01-app/03-api-reference/02-components/link.md`. Public reference: https://nextjs.org/docs/app/guides/prefetching

## Measured local browser result

Fresh isolated contexts, 1440 by 1000 viewport, same scroll path and waits, production-mode build. All API writes and external requests were intercepted. The count is observed RSC requests, not elapsed navigation time, Google crawl requests, traffic or ranking improvement.

| Route | Before | After |
| --- | ---: | ---: |
| Homepage | 169 | 38 |
| Comparison index | 119 | 9 |
| Close software page | 71 | 37 |
| Total across those cases | 359 | 84 |

The measured reduction is `(359 - 84) / 359 * 100 = 76.6017%` across the three local cases. Do not extrapolate this percentage to all users, Google crawling or search impressions.

## Release evidence

- 2,573 tests across 279 test files pass, including eight new JSX-AST policy tests.
- Lint, TypeScript, data validation, production build and 11 static-audit unit tests pass. Dependency audit reports zero vulnerabilities at the check.
- All 1,786 public HTML routes retain equal normalized visible text, anchor href/rel/CTA identities, metadata, canonical, H1 count and JSON-LD. Changed script/payload bytes are expected and excluded from editorial parity.
- 53 existing desktop/mobile browser cases pass with exact affiliate assets, disclosures and test-event matching. Requests never traverse affiliate networks and production analytics is not written.
- 12 additional internal-navigation cases pass: product and category cards, footer policy links, filtered comparisons, show-more and back navigation, on 390px and 1440px viewports.
- A first local test run expected localhost canonical URLs incorrectly. Its ten failures were retained, the harness expectation was corrected to the production canonical, and all 53 cases then passed. No product canonical was altered to satisfy the test.

The shared-surface guard flagged SoftwareCard for review. Review was completed with whole-site rendered equality; the guard and cohort registries were not disabled or edited. This is a resource-efficiency intervention, not a declaration of root cause for search performance.

Private analytics exports and account screenshots remain outside this public repository. Production promotion and post-release proof must be recorded separately; a local test receipt is not proof that the change is live.
