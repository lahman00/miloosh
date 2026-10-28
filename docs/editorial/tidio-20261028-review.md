# Tidio source review — 2026-10-28

Purpose: Add original buyer-decision value to the existing `/software/tidio` page (one product record, no new URL) using official quota and trial documentation, and replace a vendor-statistic "best for" line with a neutral buyer-fit criterion.

## Demand: historic versus current
- Historic: the Jul 23–Aug 19 Search Console page capture recorded 254 impressions for `/software/tidio`, average position about 86.8. That is a deep-ranking page, so the impressions are mostly appearances far from page one.
- Current: 0 impressions in the later recent capture. Missing recent demand is an observation, not a forecast; this refresh does not claim to restore it.
- The 2026-10-26 organic cohort file lists 257 impressions for six queries that name Tidio. Those are query aggregates, not landing-page traffic, and are not added to the 254.

## URL Inspection (owner-authenticated, 2026-10-28)
- Not indexed. Last successful Googlebot smartphone crawl 2026-08-10 03:35:48.
- Crawl and indexing allowed, page fetch successful, self-referencing canonical. No technical block was observed, so the page's problem is not a robots or canonical defect.
- No indexing request is made now. Request a recrawl only after a real content improvement is live, and treat T0 as the first new crawl shown in Search Console.

## Official sources checked 2026-10-28
- https://www.tidio.com/pricing/ — Free: 50 billable conversations/month, 50 Lyro AI conversations one-time, 100 Flows visitors/month. Paid-plan prices on the page appear consistent with the existing record; nothing was changed.
  - **Deferred price-hold discrepancy:** the current pricing page labels Starter's 50 Lyro AI conversations as **one-off**, while the existing Miloosh Starter tier note says “50 Lyro AI conversations/month.” Because Tidio is under the price-label hold through 2026-11-04, this release does not alter the pricing object. Re-verify and correct the billing/quota wording in the dedicated post-hold pricing review; do not treat the existing monthly label as freshly verified.
- https://help.tidio.com/hc/en-us/articles/11874534946460-The-monthly-conversations-limit — the billable-conversation quota applies to agent-handled live chat, tickets/email and Messenger, Instagram and WhatsApp conversations. Flows and Lyro quotas are separate. At the limit, agents cannot reply or see incoming message details until the quota resets or the plan is upgraded.
- https://help.tidio.com/hc/en-us/articles/5423133940764-The-Tidio-trial-version — what the free plan keeps and which paid features are disabled after the trial.
- https://www.tidio.com/faq/ — plan positioning only.

## Exact changes (`data/software/tidio.json`)
- `sources`: add the pricing, monthly-conversation-limit, trial and FAQ pages; keep the generic home page.
- `best_for`: replace "Around 300,000 businesses…" with a buyer criterion: teams that can forecast human-agent conversations, Lyro AI conversations and Flows visitors as three separate monthly quotas.
- `cons`: add one caveat on the pooled human-agent quota and what happens at the limit.

Not changed, on purpose: `pricing` (every key, value and date), `accessed_at` (2026-08-04), `pricing.last_verified` (2026-08-23), `description`, `alternatives`, title, affiliate fields, canonical, robots, sitemap, shared templates. Description is reused in alternative cards on other pages. Moving `accessed_at` would change shared freshness ordering, as found in the Salesforce release, so the true review date lives only in this receipt. This under-reports freshness and is not a fabricated date. The strict quality gate therefore still reports `content-freshness` once 2026-11-02 passes; discovery-continuity keeps the URL in the sitemap without a date change.

## Hold and scope
`tidio` is on the price-label hold (`data/seo/price-label-hold.json`, to 2026-11-04). No price language was touched. No hands-on test was run: this is documentation-based research.

## Expectation
This is a content-quality change on a page not currently indexed. It gives no ranking, indexing or traffic guarantee. Measure only after the live change and a new Googlebot crawl.

## Derived impact and protection (base 9ca469f, checked 2026-10-28)
Two full production builds (base and candidate) were compared with the repository's normalized-HTML comparison: 1,786 prerendered pages compared, exactly 13 differ, none added or removed. The 13 are `/software/tidio` and its 12 comparison pages (crisp, freshdesk, front, gorgias, happyfox, help-scout, intercom, kayako, liveagent, reamaze vs tidio; tidio vs zendesk, zoho-desk). That set is identical to the inventory's derived-URL set. The protection snapshot (registry, observation windows, in-flight worktrees) returned EDITABLE for all 13; no shared input is in flight and no divergent worktree exists. `sitemap.xml` and `robots.txt` are byte-identical and the canonical is unchanged. `seo:release-sentinel`: 612 baseline URLs, 0 missing.

Note on visibility: the software page renders the first two `cons`; the pooled-quota caveat is placed second so it shows there, while `cons[0]` (reused by the buyer desk) is unchanged.
