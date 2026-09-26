# Miloosh morning report — 2026-09-27 (Asia/Jerusalem)

## Deployment

Production is READY at https://miloosh.com. Application source a925c0e7e129c09c2ca38f5e352d8edbc4afb9ab; deployment dpl_93Q6K6A2bH4dvMWRDSq1v7xi3Fqu. Promoted 2026-09-26T22:50:25.901Z (2026-09-27 01:50:25 Israel time, UTC+03:00).
Staged production was tested before domain promotion; exact SHA, independent alias assignment, HTTP 200 and later unchanged alias confirmed. No GitHub push or credential/environment changes.

## Research is live

- https://miloosh.com/research/customer-support-pricing-2026 — corrected 16-vendor research; 9/16 publish distinct AI-usage pricing, not the superseded 5/16.
- https://miloosh.com/research/crm-plan-gates-2026 — seven-vendor factual plan-gate dataset, not a best-CRM ranking.
- Both JSON and CSV downloads return 200 with exact local row parity, correct content types, nonempty data, and attachment filenames for CSV.
- Both appear in the live sitemap. Canonicals, Dataset/Organization schema, title/meta/OG and absence of noindex confirmed. Dataset content dates are source-verification dates, not build clocks.
- Authority handoff updated with exact verified URLs and corrected support pitch. No outreach sent.

## Production QA

Full production crawl: 1,785/1,785 pages, zero failures, completed 2026-09-26T23:07:10.516Z. Zero differences against resolved local evidence. Original 39 local timeouts and successful 39-route single-worker recheck are preserved in production-qa.json.
The 10 representative valid health routes passed. Unsupported /categories remains a pre-existing 404, not a regression; actual category navigation is /#categories and /category/crm.
51 responsive checks cover 1440/390/320, all five primary money-page sticky CTAs at top/pricing/bottom, and research-table horizontal scroll. 15 research→software/comparison→CTA journeys passed with identical event/session/location attribution and exposure before click. All API/merchant actions were intercepted: zero application analytics writes, zero merchant requests.
Early CLI-visible post-promotion error and 5xx queries returned zero rows; this bounded window is not a universal uptime guarantee.

## Google state

Authenticated GSC recheck around 2026-09-26T22:27Z: query contains miloosh, web, available chart 2026-08-07..2026-09-24: 0 observable impressions and 0 clicks. Computed CTR/position are null, not fabricated rates; filtered/anonymized data is incomplete. Same window as earlier capture, so no period-over-period lift.
GSC Links shows 100 links, all pointing to home, from six displayed domains: vercel.app 93, hypestar.org 2, qevra.app 2, launchfree.io 1, roasty.tech 1, saashub.com 1. The 93 are infrastructure candidates, not proven endorsements. Two verified public deep-link placement-target pairs exist outside that delayed GSC target table.
Overview displayed 218 indexed and 1,705 not indexed; do not compare this property-wide scope with the inspected commercial sample.
Cached commercial command center: 85 query-page observations over 17 pages; 121 authenticated lost-indexation cases plus 15 reported-only cases; 0 eligible striking-distance and 0 eligible low-CTR candidates. Missing data is not zero demand.

## Indexing

One request each was accepted by the authenticated GSC UI:
- support research: acceptance observed 2026-09-26T22:52:22Z
- CRM research: acceptance observed 2026-09-26T22:53:52Z
Both were added to Google's priority crawl queue. Not proof of indexing. No quota exhaustion observed; remaining numeric quota unknown. The durable guard marks both ALREADY_REQUESTED. Do not request again.
The hub and existing pricing-pressure asset were not submitted; prior request history remains unknown.

## Authority

13 canonical placement records: five VERIFIED_LIVE placement-target pairs, four REMOVED, three PENDING, one REJECTED. The two CRM Reddit replies and the smallbusiness reply publicly showed moderator removal, contradicting the requested LIVE labels; r/SaaS was also removed. No moderation-cause inference and no newly earned-link claim.
SaaSHub, Qevra, Hype Star remain publicly verified. SaaSComparely remains REJECTED_PAID_DOFOLLOW and is not counted as earned authority.
No new external mentions were earned during this task.

## Measurement boundaries and ranking actions

Referral sessions, research traffic, research→decision/CTA revenue, conversions and ranking lift remain UNKNOWN without complete authenticated event exports and matched post-release GSC windows. Synthetic browser results are not conversion data.
Six experiment cohorts retain all members and baseline data. The inherited Re:amaze control contamination keeps only the affected contrast in CONTROL_PROTOCOL_REVIEW. This release did not alter Re:amaze/Tidio control catalog files or cohort membership.
Release identity and live-route evidence are in this receipt. Existing historical cohort clocks are not backfilled from mere HTTP 200s; exact intervention and first-deployment evidence is needed before any unsupported experiment date is assigned.

Top next actions, in order:
1. Observe the two accepted requests and capture the first actual Google recrawl/index state; no repeat submission or automatic rewrite.
2. Supply a complete, bounded first-party analytics export to the existing control room so referral and research funnel reporting can leave UNKNOWN without QA contamination.
3. Compare stable GSC windows only after verified recrawl. Historical money-page signal is led by Pipedrive/Airtable/Wrike (351/329/238 impressions in the cached window), but protected membership precludes opportunistic rewrites.
4. Resolve the Re:amaze protocol deviation explicitly before interpreting its cohort contrast; do not remove controls.
5. Retain the five pre-existing factual-depth advisories (Apigee, Datadog, Read the Docs, Stripe, Supabase) and nine weak internal-link nodes as separate editorial follow-ups.

## Operational limits

No social posts, merchant visits, Blob writes, credential changes, indexing bursts, new experiments, or mass-publishing activation. No rollback performed. The previous READY production deployment is documented as a reversible rollback point.
