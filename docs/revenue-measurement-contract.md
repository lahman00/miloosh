# First-revenue measurement contract — 2026-09-26

The sole current cohort is `/software/airtable`, `/software/todoist`,
`/software/close`, `/software/setmore`, `/software/elevenlabs` in
`data/revenue/first-revenue-cohort.ts`. Research lists do not activate cohorts.

## Stages are independent evidence

| Stage | Producer / store | Meaning and limit |
|---|---|---|
| Search impression/click | Authenticated GSC snapshot | Historical property/page/query dimensions and explicit capture/window; never estimated volume or automatically joined to an individual visitor. |
| `page_view`, `software_view` | `FirstPartyAnalytics` → `/api/analytics/event` → first-party store | Browser-recorded visit, not verified human. Software view is not an additional page view. StrictMode setup replay does not add another visit. Real A→B→A navigation does. |
| `engaged_view` | `FirstPartyAnalytics` / `observeEngagedView` | Once after ten cumulative foreground seconds on this page; hidden time excluded and navigation cancels the old page timer. Separate event, not a second visit or proof of attention/humanity. Historical events used elapsed wall time and cannot be retroactively reclassified. |
| `cta_impression` | `TrackedCtaLink` / `observeCtaExposure` | At least 50% intersection while document is visible, once per element/context. Not proof of attention or absence of an overlay; no duration threshold. Missing observer yields no invented impression. |
| `cta_click` | `TrackedCtaLink` → first-party ingestion | Uncancelled native primary/modifier/middle activation. Right click is not activation. Pricing/docs `TrackedVendorLink` has its separate legacy vendor-link representation, not an invented commercial CTA impression. |
| `outbound_click` + legacy `affiliate_link_click` or `vendor_link_click` | `/api/outbound-click` → two independent stores | Server resolved and recorded a handoff intent. NOT evidence that the merchant page loaded. Never sum these stores as two handoffs. |
| Merchant conversion / commission / payout | No proof established by the events above | Require independent merchant/network evidence. A cloro referral signup is not automatically a paid sale or commission. |

Native `href`/target/rel remain usable without JS. Navigation does not await
analytics. Beacon acceptance proves browser queueing, not server persistence.
A rejected beacon falls back once to keepalive fetch. There is no retry loop.
Outbound ingestion returns per-sink `RECORDED`, `FAILED`, or `DISABLED`; HTTP
202 alone is not a successful write or a merchant visit. Client delivery is
best-effort; browser/network shutdown can still lose an event.

## Join keys and acquisition

Each browser stage has opaque `eventId`, `visitorId`, `sessionId`, server
`timestamp`, and query-free `path`. A commercial activation shares one eventId
between `cta_click` and its handoff. The stores remain separate stages.
`ctaLocation` is a finite shared allowlist; unknown supplied labels become
`unknown-cta-location`. Product/destination are resolved server-side.

Every new event and both handoff stores carry bounded `acquisition` when known:
sessionId, landingPath, capturedAt, trafficSource, referrerHost,
utmSource/utmMedium/utmCampaign/utmContent; plus `previousPath` for the most
recent internal hop. This survives loss of the landing POST. It is not a full
navigation-history log or a merchant-network sub-ID. Exact verified merchant
assets are preserved; no invented attribution parameters are appended here.

Policy introduced in this branch:

- 30 minutes of **measured** inactivity expires the session. Activity that
  emits no telemetry is not measured. An idle tab's stale URL/referrer is not
  reused as a new acquisition; source becomes unknown.
- SPA navigation preserves first touch. A new document navigation starts a
  fresh session, isolating copied sessionStorage in ordinary new-tab navigation.
  Explicit reload/back-forward may resume a non-expired stored context. This
  is a definition change from an unbounded tab session, not proof of all browser
  restoration edge cases.
- Blocked browser storage uses document-memory identity/context. Reload under
  blocked storage cannot preserve that identity; cross-device identity is absent.
- Missing source is unknown. Direct requires an observed empty referrer.
  `organic_social` is social, not organic search; email and paid remain distinct.
- Server validates snapshot/session binding and bounds labels/path/time. These
  are browser-reported acquisition facts, not cryptographic proof of origin.
  Never put personal information into campaign labels. No full referrer URL,
  utm_term, cookies, IPs, authorization headers or browser storage dump is logged.

## Retry, failure and reporting semantics

For valid explicit IDs, an exact semantic event (excluding server timestamp)
has a deterministic private Blob pathname and `allowOverwrite:false`. A failed
create is accepted as a replay only if reading that exact object confirms its
fingerprint. Same ID on a different stage/product/context is not silently
collapsed. Distinct activations get new IDs. Legacy ID-less events retain their
old semantics. This prevents exact replay duplication, not all fabricated spam.

Both sinks settle independently. One failure cannot suppress the other.
Readers dedupe overlapping Blob listing paths, reject repeated cursors, retry
bounded object reads, and refuse to present incomplete first-party reads as a
complete zero dataset. Corrupt/unreadable local data is not overwritten. Local
fallback retains only the most recent 10,000 first-party / 5,000 legacy records;
it is not a durable lifetime archive. Production Blob is the intended store.
At either local retention ceiling, complete history is conservatively unavailable
(first-party reader throws; detailed outbound reader reports PARTIAL). A full
array does not prove which earlier events were discarded.

`summarizeFirstRevenuePage` uses one explicit window, exact cohort path/product,
and only explicitly non-test records. Null/unavailable differs from zero.
Legacy ledger partial reads yield null handoffs. Later QA markers quarantine
the same visitor/session in both identified stores; historical identity-less
legacy rows cannot inherit that filter. Unknown markers remain separately
reported. Source rows use embedded first touch, then earlier same-identity
landing evidence, otherwise unknown. Do not divide independent store totals
into a conversion rate when denominator coverage is unknown.
Legacy Money Map now uses the detailed outbound reader too: absent/partial
evidence is UNAVAILABLE, excluded from its click score, and unknown QA markers
are separately counted rather than called non-test. It remains a historical
opportunity heuristic, not the canonical five-page funnel or a new cohort.

localhost/Preview is forced into QA; bot/prefetch/cron classification remains
separate. Cross-site requests are rejected, bodies are capped while streaming,
unknown products rejected, and destinations cannot be supplied by the client.
Missing Origin is allowed for privacy compatibility. This public endpoint is
not human authentication and has no distributed anti-spam rate limiter.

## Authority and integration

Affiliate approval and exact asset must both be verified. Automattic and the
owner's ActiveCampaign re-application remain non-active; the older canonical
ActiveCampaign rejection record does not establish a later approval.
Do not revive catalog/config fallbacks or read legacy Sprint 8 documentation
as current authorization. Any status-history reconciliation is separate work.

Claude owns the simultaneous CRO/decision-vs-sticky reporting changes. This
branch adds integrity and forensic context, not a competing copy/UX implementation.
Re-run the release gates after integration; no push, merge or deploy is authorized
by this sprint. Local capture-only browser QA never follows merchant links or
writes production analytics.
