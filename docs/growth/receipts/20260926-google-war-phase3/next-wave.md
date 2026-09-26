# Next Wave — Google Crawl + Index + Rank War Phase III backlog

1. **Ranking-focused wave on the 85-URL high-impression deep-ranking pool**
   (`route-type-and-inventory.json`'s `part27_28_rankingWar` section) —
   mulesoft (511 impr), clickup (468), salesforce (466), sprout-social (387),
   confluence (371), n8n (296), basecamp (293), tidio (282), umbraco (265),
   and more, all unprotected, all indexed, all ranking 50-100. This is the
   single most concrete, ready-to-execute backlog item: investigate content
   intent, authority, and competitive SERP factors per Part 28, distinct
   from the indexation work this and the prior phase did.
2. **Re-check the Wave 1/2/3 indexation delta again in 2-4 weeks.** Wave 3's
   0%-vs-30% result is very plausibly a "not yet recrawled" artifact; a
   second check with more elapsed time would meaningfully sharpen the
   picture on whether the pricing/cons treatment mechanism actually helps.
3. **Per-URL crawl-timing classification** (Part 20) for the 64 Wave 1/2/3
   treatment URLs — this session only reached wave-age granularity. A
   session with time for ~64 individual URL Inspections could classify each
   into NOT_RECRAWLED_SINCE_CHANGE / RECRAWLED_STILL_EXCLUDED /
   INDEXED_AFTER_CHANGE for a much sharper per-page answer.
4. **Pull GSC's own Links report** for Part 31's backlink/external-authority
   correlation — not attempted this session, real and directly available
   inside the same GSC property this session was already working in.
5. **A real sitemap-priority experiment** (Part 36) — real supporting
   evidence exists (55% sitemap coverage, 58% of sitemap-listed known-state
   URLs still not indexed) but this session did not act on it given the
   production-surface risk and the need for an easy rollback plan and a
   longer observation window than a single session affords.
6. **Given the inventory-saturation finding, reconsider Part 12's
   indexable-surface classification exercise directly** — this session
   found the evidence (100% zero-demand DISCOVERED population) but did not
   build the full CORE_INDEX_TARGET / SECONDARY_INDEX_TARGET / ... /
   NOINDEX_CANDIDATE classification Part 12 asks for. That classification
   is now much better-supported than it would have been before this
   session's findings, and is a natural next step -- but remains a
   classification exercise, not permission to mass-noindex, per Part 12's
   own explicit caution.
7. **Continue treating the software-level lever** (real pricing/cons
   enrichment) for the real CRAWLED_NOT_INDEXED software pool (175 total
   sitewide per Phase II's count, only a subset individually enriched so
   far across Waves 1-3 and Phase II's Group 1) -- this remains the
   best-evidenced lever for the CRAWLED_NOT_INDEXED (index-selection) lane,
   separate from the DISCOVERED_NOT_INDEXED (crawl) lane this phase showed
   is predominantly a demand problem, not a content or architecture one.
