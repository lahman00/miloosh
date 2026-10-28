# Salesforce source review — 2026-10-26

Purpose: Improve an existing CRM decision page with current, source-backed migration and mobile caveats while keeping the release isolated from unrelated and protected pages.

Search Console evidence: From the owner-authenticated three-month query data, Salesforce-related terms accounted for 325 impressions among 31 query rows and no clicks (Aug 7–Oct 24). These are QUERY aggregates, not measured landing-page traffic. Separately, the complete historical page table recorded 429 impressions for /software/salesforce in Jul 23–Aug 19. Recent page demand was zero in the later capture. The content refresh has no predicted ranking benefit.

URL Inspection: /software/salesforce was NOT indexed, last successfully crawled by mobile Googlebot on 2026-08-10 with indexability allowed and a self-canonical. The old referring Vercel URL now redirects 301 to the canonical Miloosh domain, so no active duplicate-host defect was observed.

Official vendor sources independently checked on 2026-10-26:
- https://www.salesforce.com/crm/ (CRM product scope and audience)
- https://www.salesforce.com/products/mobile/ (iOS and Android app support)
- https://www.salesforce.com/crm/free-crm/ (two-user Free Suite, without credit card)
- https://www.salesforce.com/crm/pricing/ (Starter $25/user/month, Pro $100/user/month annually, contract/transaction fee caveats)
- https://help.salesforce.com/s/articleView?id=000383962&language=en_US&type=1 (edition-based export schedule and limited availability of exported files)
- https://help.salesforce.com/s/articleView?id=000383363&language=en_US&type=1 (mobile admin/reporting/layout limitations)

Exact changes: Add four official sources, replace the vendor-centered buyer-fit copy with independent sourced buying criteria, and add two useful limitations relevant to CRM data export and mobile setup. The existing short description is intentionally left unchanged because that field is reused in alternative cards across other CRM pages, including protected or observed pages. Leave all pricing keys and values, affiliate URLs, schema and existing title unchanged because Salesforce is held under the price-language freeze until November 4 at the earliest. No new URL, page, canonical, robots, sitemap or noindex edits.

Important scope decision: the source review really occurred on 2026-10-26, but this release deliberately does NOT change the shared `accessed_at` field from 2026-07-31. Full-build review showed that changing this overloaded field updates the dataset-wide footer freshness date and also changes ranking/order logic across dozens of unrelated pages, including protected pages. The true 2026-10-26 review date is therefore recorded in this receipt only until the freshness model can represent a product review without causing unrelated render changes. This is conservative under-reporting, not a fabricated fresh date.

Release safety: This changes one existing product record and may re-render pages that display Salesforce. Before publication, check exact protected-page impact, Guardian and full HTML diff. If any protected or unrelated substantive change remains, keep the branch in draft. A live change alone does not prove recrawl or indexing; record T0 only when Google Search Console shows a new crawl.
