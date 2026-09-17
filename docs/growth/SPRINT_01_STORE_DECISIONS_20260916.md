# Sprint 01 · Small-store software decisions

Created September 16, 2026. These are 30 bounded content improvements, NOT 30 new URLs and NOT a publication-per-day promise. 24 decision-led + six supporting tasks is a starting mix, not a ranking formula. New URLs planned in this sprint: zero unless a later intent audit establishes a genuine gap.

## Evidence and constraint
The read-only Blob baseline found 20 outbound records: nine explicitly test, ten explicitly non-test and one without a test marker. The ten explicit non-test records include seven Wix, one MailerLite and two official-site events. Only one Wix record came from the ecommerce guide; most Wix clicks came from website/CMS comparisons. This is a weak fit signal for a bounded merchant experiment, not evidence that ecommerce demand or revenue is proven. No record is independently established as a human conversion.

The local GSC snapshots are from August 9/13; do not present them as September performance. Current live-read access must be verified separately. Newsletter Blob prefix listing returned zero records; no verified email delivery integration is present in the current implementation. Existing site URLs were inspected locally before choosing targets. Every query below is an editorial hypothesis until current demand evidence is attached; no search volumes or difficulty scores are fabricated.

## Queue
| # | Buyer task / query hypothesis | Existing intent owner | Type | Status | Evidence or concrete output |
|---|---|---|---|---|---|
| 01 | Decision kit: repair, embed or migrate? | `/best-ecommerce-platform-for-small-business` | Decision | IMPLEMENTED_LOCAL | Ungated worksheet and four fit paths; local QA required |
| 02 | Wix versus Shopify for a website-led small store | `/compare/wix-vs-shopify` | Decision | QUEUED | Top answer by site-led versus commerce-led workflow |
| 03 | The cheapest plan that accepts the required payments | `/software/wix` | Decision | VERIFY_FIRST | Current regional entitlement, not a generic lowest price |
| 04 | When not to leave WooCommerce after a plugin problem | `/software/woocommerce` | Decision | IMPLEMENTED_LOCAL | Repair-before-replatform panel with official conflict-testing and staging guidance; no invented repair price |
| 05 | Keep the website, replace the commerce layer | `/compare/ecwid-vs-shopify` | Decision | QUEUED | Embedding versus rebuilding; preserve distinct intent |
| 06 | Year-one quote for a small store, not monthly marketing prices | `/best-ecommerce-platform-for-small-business` | Decision | IMPLEMENTED_LOCAL | Blank cost comparison in downloadable worksheet; no invented rates |
| 07 | Staff roles that change the payable plan | `/compare/wix-vs-shopify` | Decision | VERIFY_FIRST | Owner, editor and fulfillment access on current tiers |
| 08 | Catalog options that need a supported import path | `/compare/shopify-vs-woocommerce` | Decision | VERIFY_FIRST | Representative variations, not only product count |
| 09 | Wix migration app: installation price versus migration quote | `/software/wix` | Decision | IMPLEMENTED_LOCAL | Product CSV separated from order migration; free app install separated from paid Cart2Cart migration quote; route limits kept distinct from overall store capacity |
| 10 | Existing orders and customers: which records actually move? | `/compare/shopify-vs-woocommerce` | Decision | VERIFY_FIRST | Separate product, customer and order gates |
| 11 | Recurring subscriptions that make switching risky | `/best-ecommerce-platform-for-small-business` | Decision | VERIFY_FIRST | Provider-supported continuity; no payment credential shortcuts |
| 12 | When a managed Shopify store reduces the right workload | `/software/shopify` | Decision | QUEUED | Name responsibility removed and work retained |
| 13 | When Wix site-and-store management is the simpler fit | `/software/wix` | Decision | QUEUED | Specific workload advantage; limitations intact |
| 14 | When preserving WooCommerce customization is worth the maintenance | `/compare/shopify-vs-woocommerce` | Decision | QUEUED | Decision evidence; no automatic hosted-platform winner |
| 15 | Ecwid product-tier boundary for the actual catalog | `/software/ecwid` | Decision | VERIFY_FIRST | Recheck current catalog and variation rules before publishing |
| 16 | Regional payment support as an elimination gate | `/compare/wix-vs-shopify` | Decision | VERIFY_FIRST | No universal country/payment assertion |
| 17 | Physical store plus online checkout: required POS fit | `/compare/wix-vs-shopify` | Decision | VERIFY_FIRST | Region, hardware and inventory requirements; no guessed prices |
| 18 | Digital downloads versus physical delivery | `/compare/wix-vs-shopify` | Decision | VERIFY_FIRST | Required file delivery, tax configuration and fulfillment tests |
| 19 | A tiny catalog that should not trigger a full rebuild | `/compare/ecwid-vs-shopify` | Decision | QUEUED | Embed/stay path as a real alternative |
| 20 | Mandatory apps that change the Shopify quote | `/software/shopify` | Decision | VERIFY_FIRST | Only needed apps, current terms and explicit assumptions |
| 21 | Trial limitations before committing to a store platform | `/best-ecommerce-platform-for-small-business` | Decision | IMPLEMENTED_LOCAL | Source-backed paid-plan/test-mode caveat added, no test transaction made |
| 22 | Important product URLs and the cost of a migration | `/best-ecommerce-platform-for-small-business` | Decision | QUEUED | Redirect and internal link gates; no ranking guarantee |
| 23 | Small-store support workflow after replatforming | `/best-help-desk-for-ecommerce` | Decision | QUEUED | Adjacent store-workflow decision, not a new helpdesk cluster |
| 24 | Store events that must survive an email-platform change | `/best-email-marketing-for-ecommerce` | Decision | QUEUED | Adjacent post-migration validation; no new tool ranking |
| 25 | How to run a safe pre-purchase checkout test | `/best-ecommerce-platform-for-small-business` | Support | QUEUED | Documented procedures; no live test-mode disruption |
| 26 | How to reconcile a sample catalog after import | `/compare/shopify-vs-woocommerce` | Support | QUEUED | Add a practical section, not a duplicate article |
| 27 | How to document an app-dependent requirement | `/software/shopify` | Support | QUEUED | Requirement, quoted plan, evidence and owner |
| 28 | How to keep opt-out status during a store migration | `/best-email-marketing-for-ecommerce` | Support | VERIFY_FIRST | Preserve suppression; verify each provider workflow |
| 29 | How to make a stay-or-switch decision sheet | `/best-ecommerce-platform-for-small-business` | Support | IMPLEMENTED_LOCAL | Eight checks, blank cost model and unresolved-gate fields |
| 30 | How to assign a cutover and rollback owner | `/best-ecommerce-platform-for-small-business` | Support | QUEUED | Operational checklist only; no false migration guarantees |

## Shared enabling work (outside the 30 content items)
- Complete, non-misleading outbound ledger, with partial/unavailable states and separate visitor metrics.
- Newsletter persistence must succeed before signup confirmation and its analytics event.
- Clear pre-launch interest-list messaging; do not promise an email that is not sent.
- Quick comparison above long evidence sections, preserving disclosure and tracking URLs.

## Finish criteria and first checkpoints
A task completes only when the planned improvement actually exists, vendor-specific claims are sourced, page QA passes and publication state is explicit. Multiple tasks may improve the same canonical page; don't double-count them as separate published articles.

At the first 14/28-day review with readable data, inspect the changed canonical pages, non-test versus unresolved outbound records, actual optional signups and partner-confirmed conversions. Record source, dates and denominators. No A/B winner or revenue lift claim is allowed from this small baseline. If no demand appears, revise the avatar/intent and distribution, not just the article count.

Local evidence: `~/Desktop/Miloosh/03-Research-and-Reports/growth-20260916/baseline.json` is outside the public site; see the execution report for verified paths and later deployment status.
