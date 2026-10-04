# Miloosh Premium Production QA — 2026-10-04

## Identity
- Skills: Vercel agent-browser-verify, verification, deployments-cicd, nextjs.
- Live production observed: `dpl_6rFZURc7ygZEKSEUQw9eA9pobKrh`.
- Production SHA: `8c476c16e40fe8be1c97567a8e855d5fd829b17b`.
- QA branch/worktree: `fix/premium-qa-20261004` at `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/qa-premium-20261004`, based exactly on production SHA.
- Production changed: **false**. No push/deploy/partner click/indexing request.

## Coverage
### Live routes / SEO
- Sitemap: 988 URLs; 988/988 HTTP 200.
- 0 sitemap redirects, 0 missing titles, 0 duplicate-title groups, 0 missing descriptions, 0 canonical mismatches, 0 H1-count failures, 0 noindex URLs in sitemap.
- 1,788 unique internal targets discovered; 800 linked targets outside sitemap all resolve (799 comparisons + /resources). This is the documented suspended comparison cohort, not reclassified as a broken-link defect.

### Static production build
- 3,542 generated static pages.
- 1,786 public HTML artifacts checked by release verifier; 93,988 internal links; 0 failures.
- 1,789 HTML files inspected for metadata/schema.
- 5,719 JSON-LD blocks; 0 JSON parse errors.
- Public OG/Twitter metadata present on document artifacts except framework _global-error.

### Partners
- 32 active canonical partners.
- 32/32 live partner software pages HTTP 200.
- 32/32 rendered CTA hrefs match the canonical issued/allowed registry asset.
- 32/32 include rel="sponsored noopener noreferrer" and nearby affiliate disclosure.
- External affiliate destinations were not opened; no synthetic referral/conversion.
- Fresh network-dashboard/contract re-verification: NOT VERIFIED.

### External links
- 1,136 unique external URLs.
- 33 affiliate tracking URLs intentionally not navigated.
- 1,103 other external URLs probed.
- Six apparent HEAD 404s proved false on GET/browser.
- One confirmed dead source: `https://help.make.com/how-features-use-credits` (404), replaced locally with official `https://help.make.com/credits` (200).
- Bot-blocked/rate-limited URLs remain NOT VERIFIED, not called broken.

### Browser/functional
Chromium: 1440×1000 and 375×812.
Representative home/software/comparison/category/research/tool/contact/newsletter/recommend surfaces inspected.
- No representative horizontal overflow, one H1, zero broken images, no page errors.
- Mobile nav toggles.
- Homepage search finds Airtable and navigates correctly.
- Recommender advances to the next decision state.
- Cost calculator adds Airtable and shows seat/remove controls.
- Newsletter consent is off by default; invalid email fails native form validity; no form submitted.
- Contact mailto resolves to hello@miloosh.com.
- Real Safari/Firefox rendering: NOT TESTED.

### Performance lab
- Home: TTFB 64.2ms, FCP/LCP ~784ms, CLS 0.08; INP NOT MEASURED.
- Airtable: TTFB 65.7ms, FCP/LCP ~568ms, CLS 0.08; INP NOT MEASURED.

### Security sanity
- Sampled /internal/* dashboards: 401 unauthenticated.
- /api/internal/money-map, /api/growth/gsc-query, /api/cron/seo-factory: 401 unauthenticated.
- HSTS present.
- Root response lacks CSP, frame-control, X-Content-Type-Options and Referrer-Policy: hardening item, not a proven exploit.

## Findings
| ID | Severity | Finding | State |
|---|---|---|---|
| B1 | BLOCKER | npm audit --audit-level=high: known braces chain, 5 high findings, no safe patched release | OPEN |
| H1 | HIGH | WCAG contrast failures on light-theme legacy text, including annual-billing note | FIXED LOCAL |
| M1 | MEDIUM | Homepage shortlist aria-label on generic div with no supported role | FIXED LOCAL |
| M2 | MEDIUM | Footer h3 hierarchy failure on simple pages | FIXED LOCAL |
| M3 | MEDIUM | Fixed affiliate CTA content outside accessibility landmark | FIXED LOCAL |
| M4 | MEDIUM | Make source URL returned real 404 | FIXED LOCAL |
| M5 | MEDIUM | Unauthenticated social cron routes exposed queue counts/entry IDs in dry-run responses | FIXED LOCAL: 401 fail-closed |
| M6 | MEDIUM | Freelancer time-tracking meta claimed products were “tested” without documented hands-on evidence | FIXED LOCAL |
| M7 | MEDIUM | Affiliate audit: 103 maintenance findings (85 stale research, 17 orphaned research records plus catalog coverage gap) | OPEN |
| L1 | LOW | 18 titles >65, 20 descriptions >170, 14 titles <20, 2 descriptions <50; no duplicates | OPEN polish |
| L2 | LOW | Additional standard response-security headers absent | OPEN hardening |

Counts: **1 BLOCKER, 1 HIGH, 7 MEDIUM, 2 LOW**.

## Local fixes
Changed only the isolated QA worktree:
- light-theme contrast tokens and public annual-billing status color
- supported role for shortlist control group
- footer label semantics
- sticky decision CTA landmark
- Make source URL
- unsupported “tested” meta wording
- social publish/schedule cron unauthenticated responses now fail closed with 401
- focused QA and cron-auth regression tests

No redesign, dependency change, partner destination change, tracking rewrite or production mutation.

## Re-test
Axe confirmed violations after fixes:
- Home 0
- Airtable 0
- Pricing Pressure Index 0
- SaaS calculator 0
- Contact 0

Representative desktop/mobile after fixes:
- no horizontal overflow
- H1 count 1
- broken images 0

Local rebuilt server:
- /api/cron/social-publish unauthenticated: 401
- /api/cron/social-schedule unauthenticated: 401

Focused QA, affiliate, guide and cron-auth tests pass.

## Full release gates
| Gate | Result |
|---|---|
| git diff --check | PASS |
| full unit suite | PASS |
| static gate | PASS |
| validate:data | PASS |
| lint | PASS |
| tsc --noEmit | PASS |
| npm audit --audit-level=high | **FAIL (5 high)** |
| production build with real npm ci | PASS |
| verify:static | PASS |

An earlier build failure was environmental only: Turbopack rejected a node_modules symlink outside the worktree root. A real `npm ci` eliminated that artifact and the production build/verify gates passed.

## Other observations
- Affiliate CTA coverage command returned UNKNOWN because production analytics were unavailable to that local diagnostic. UNKNOWN is not zero.
- External partner dashboard click registration: NOT VERIFIED, deliberately not generated.
- Business conversions/commissions/payouts: NOT MEASURED by QA.
- Vercel runtime error scan: no errors observed in the inspected window.

## Final verdict
**NOT READY**

The mandatory dependency audit gate remains red, and the confirmed fixes above are local only. Under current Miloosh release policy they must not be promoted by bypassing or weakening the audit gate.

Everything else tested is substantially healthy: route integrity, active partner href rendering, unit/static/data/lint/type/build gates, structured data syntax, representative desktop/mobile rendering, and internal access controls pass.

### Launch condition
1. Obtain a policy-compliant PASS for the required audit gate.
2. Deploy this exact QA artifact to preview.
3. Re-run visual/a11y/security QA on preview.
4. Promote only that verified artifact, then repeat production smoke tests.
