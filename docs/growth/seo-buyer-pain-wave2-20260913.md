# Wave 2 buyer-intent release receipt

Status before deployment: six canonical assets implemented and locally verified. The deployment and live receipt will be appended after independent alias verification; this heading alone is not a production-success claim.

## Scope and selection

Thirty candidates scored, fifteen current SERP/content reviews recorded, exactly six existing guides substantially improved. Full buyer/context/evidence matrix and the ranked twenty-action Wave 3 backlog are in [research](seo-buyer-pain-wave2-research-20260913.md). No new competing guide routes, design changes, global CSS changes, dependencies, affiliate assets, product-page experiments or social behavior were introduced.

| Canonical path | Selected buyer decision / original mechanism | Active products / direct products |
| --- | --- | --- |
| `/best-crm-for-sales-teams` | Seven selling reps and one manager: roles, sequences, forecast and export acceptance | Pipedrive, Close / Salesforce, HubSpot |
| `/best-help-desk-for-small-business` | Three replying agents, two advisers: permissions, channel scope, business-hours SLA and AI meter | None / Help Scout, Freshdesk, Zendesk, Intercom |
| `/best-automation-software-for-small-business` | One job, four billing ledgers; safe handling of ambiguous side effects | None / Zapier, Make, n8n, Zoho Flow |
| `/best-email-marketing-for-ecommerce` | Cart versus checkout and first-time versus returning buyer; audience and send reconciliation | Omnisend, MailerLite / Klaviyo, Brevo |
| `/best-ecommerce-platform-for-small-business` | Stay, embed or migrate; five independent data families before cutover | Shopify, Wix / WooCommerce, Ecwid |
| `/best-time-tracking-for-agencies` | Captured, billable, approved, invoiced and paid work; explicit utilization denominator | Hubstaff / Harvest, Toggl Track, Clockify |

Why these won: demonstrated local stale facts plus useful, non-overlapping decision mechanisms and current primary evidence. The automation and help-desk assets were selected despite having no active affiliate profile. Product order is editorial and does not import affiliate state. The email/store curation changes cover different buyer jobs, including non-partner Klaviyo first and WooCommerce as a stay option; the other four profile orders remain unchanged.

## What changed

- 24 complete fit profiles, each with a specific fit, a limitation, current plan context and a before-paying check; all summary fields override stale catalog fallbacks.
- 36 substantive buyer FAQs, six original decision tables and 36 buyer-run acceptance steps.
- 42 first-party source references, attached through source IDs to the relevant worksheet sections. Exact URL, check date, supported fact and cited section are also recorded in the cohort manifest.
- Six titles/H1s and descriptions aligned to the actual purchase decision; no claims of hands-on tests, bulk review analysis or guaranteed ROI.
- 12 contextual related-guide links, 24 product references, 22 ordered published comparison references and six existing category inbound paths. There are 57 unique product/comparison/related-guide target URLs in the checked set. The machine-readable per-guide link matrix is in the cohort manifest; no unused helper was mistaken for a live product-to-guide link.
- Corrected local stale Pipedrive/Salesforce/Harvest packaging, Freshdesk ten-agent-free assumption, Toggl plan-price assumptions, blanket Hubstaff minimum claims and unsupported ecommerce-email performance wording. Explicit MailerLite checkout eligibility and current Ecwid catalog tiers make buying limitations visible.
- Corrected two initially reversed email comparison URLs before release. The new test requires the exact ordered published pair, not merely the existence of its reverse.
- Date validation caught Israel-local midnight preceding UTC midnight. The existing sitemap expects a date-only UTC day, so content dates use the actual September 12 UTC update day; research receipt dates retain September 13 Israel. No future lastModified and no sitemap implementation change.

## Commercial and tracking boundaries

48 commercial placements (four profiles × two slots × six guides): **14 affiliate**, **34 direct**. Hrefs and rel values are resolved by the existing canonical registry. Active profile sources are Pipedrive, Close, Omnisend, MailerLite, Shopify, Wix and Hubstaff. Affiliate CTA rel remains `sponsored noopener noreferrer`; direct commercial and editorial source links remain `noopener noreferrer`. No new deep links were invented.

`TrackedCtaLink` remains at `role-guide-summary-table` and `role-guide-card-cta`. It records CTA location, uses visibility-based impression handling and best-effort non-blocking outbound tracking. The existing component and analytics write path were not rewritten. QA inspects the href/rel without clicking or sending a synthetic outbound event to a vendor. Browser QA URLs carry `qa=1&qaRun=buyer_wave2`; production measurement must exclude synthetic sessions. An unchanged tracker is not a new proof that partner-side conversions or all legacy events are deduplicated.

Four guides show the existing affiliate/editorial disclosure; two direct-only guides do not trigger a commercial affiliate disclosure. The catalog has 21 canonical active partners, unchanged. Payout readiness was not upgraded: inspected payout states remain unverified or owner-action-required, including the Impact address issue and pending payment-profile verification. Tracking-ready does not mean paid-revenue-ready. No affiliate relationship, payout setting, credential or PartnerStack account was changed.

## Measurement

[Cohort/T0/source/link manifest](seo-buyer-pain-wave2-cohort-20260913.json) contains all six canonical URLs and nullable metrics. The latest trusted GSC window is August 12–September 8, 2026; 2,727 is its query/page row count, not guide impressions. Exact pre-publication guide impressions, clicks, CTR and position are unavailable. They are null, never fabricated zeroes.

The manifest records 7/14/28-day checks for authenticated GSC and indexing evidence, classified-human visits, visible CTA impressions, unique outbound/affiliate clickers, confirmed newsletter signups and verified partner conversions. Publication time and exact deadlines will be filled from the verified deployment. This is a **manual measurement cohort**, not a registered numeric-baseline SEO Factory experiment or an enabled automation. Private Blob and the existing experiment registry are untouched; autonomy stays Level 0 and mass publishing stays OFF. Hold major rewrites for 28 days, with factual/technical/legal/trust corrections excepted.

## Distribution

[Prepared packet](seo-buyer-pain-wave2-distribution-20260913.md): six LinkedIn Company Page drafts, six Facebook Company Page drafts, six resource-pitch drafts and six community-answer angles. Seven additional discovery/resource routes were investigated, with explicit access, recipient, eligibility and policy gates. Practical Ecommerce's no-unsolicited-guest-post policy is respected. No social post, community answer, outreach message, directory submission, signup or duplicate ledger action was made in this task. PREPARED is not PUBLISHED.

## Reproducible QA

From the isolated Wave 2 worktree:

```sh
npx tsc --noEmit --incremental false
npm run lint
npx vitest run tests/guides tests/lib/sitemap.test.ts tests/seo-factory
npm test
npm run validate:data
npm run affiliate:audit
npm run maintenance:seo
npm run report:links
npm run build
git diff --check
node --import tsx scripts/growth/verify-buyer-pain-wave2.ts https://miloosh.com
```

The HTTP verifier uses GET only, rejects redirects and accepts only known Miloosh/local origins. It checks the actual rendered copy, metadata, one H1, six FAQ schema answers matching visible content, eight CTAs, source-link rel values, anchor targets, 57 related routes, category inbound links and sitemap inclusion. It never follows vendor destinations, calls an API write route or claims to prove Google indexing.

Local browser: all six pages rendered at 390×844 and 1280×900, one H1 and six FAQ controls each, no missing in-page targets or page-level horizontal overflow. Both table types use their existing scroll containers. Screenshots inspected for all six at both widths; comparison-anchor and mobile FAQ expansion verified. No browser error logs were returned in the point-in-time check. No layout/template changes were made.

Final pre-release suite: **164 test files / 1,472 tests passed**, including 12 new Wave 2 tests. TypeScript, lint, data validation and whitespace checks passed. Targeted guide/sitemap/SEO Factory run before the final manifest test: 65 tests passed. Production build generated all 3,532 pages. Local HTTP/content/CTA/link verification passed at 2026-09-12T22:20:23.282Z. A direct GET source check returned 200 for 36 of 42 cited URLs; six rejected that client with 403 (Pipedrive, two Brevo help pages, Shopify migration, Ecwid import and Harvest approvals). Those sources were inspected through the research browser/search retrieval; a 403 probe is an access limitation, not proof of a dead link. No 404 cited-source URL was found. The n8n reference was updated to its observed canonical documentation destination.

Known pre-existing warnings remain explicit: SEO maintenance reports the homepage 72/354 direct-link policy; the link report finds nine weak cross-linked products; affiliate audit returns 101 research/follow-up findings. Local zero pipeline/click counts without credentials are not production measurements. [Separate infrastructure remediation](seo-wave2-infrastructure-remediation-20260913.md) records the critical Next.js and high Sharp advisory groups on the unchanged lockfile; no dependency patch is hidden inside this editorial release.

## Delivery constraints

GitHub account suspension / HTTP 403 is an existing remote synchronization blocker. Do not bypass it or claim a successful push. The authorized local commit and direct Vercel deployment path remain usable. Unrelated dirty work in the main checkout and all protected Wave 1 content are preserved.

## Next SEO action

Collect the first complete, exact-page GSC and classified-human outbound window at the seven-day checkpoint, retaining null for unavailable measurements and allowing reporting lag. Use that evidence before another rewrite or the next publication cohort.
