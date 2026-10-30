# Decision Room events and measurement plan

All events use the existing first-party tracker (`lib/analytics/track.ts`) and the existing server allowlist (`app/api/analytics/event/route.ts`). Fields are limited to the public vocabulary the route already copies; no private value (note, cost, current tool, free-text requirement, team size) is ever sent.

| Signal | Event / source | Definition | Notes |
|---|---|---|---|
| Opened the room | `page_view` with path `/decision-room` | Existing page-view event. | No dedicated load-time event: an extra event type fired on every render would feed the traffic classifier. |
| Saved a product | `decision_room_product_saved` {softwareSlug, ctaLocation `decision-room-search`} | The buyer pressed Save on a search result. | Not fired for products imported from BuyerDesk or a shared link. |
| Configured a comparison | `decision_room_compare_configured` {resultCount = products compared, rank = criteria selected} | 2 or more products compared and at least one criterion, after the buyer changed something; once per distinct configuration, 0.8 s settle. | `rank` is a count here, not a ranking. |
| Generated a brief | `decision_room_brief_generated` {resultCount, source `create`, `print`, `text` or `link`} | The buyer pressed Create, Print or save as PDF, Copy as text, or Copy share link. | |
| Opened a vendor link | existing `cta_impression`, `cta_click`, `outbound_click` with `ctaLocation = decision-room-brief` | Existing tracked CTA, unchanged affiliate URLs and disclosure. | A click is not a conversion. |

## Reading it (no invented denominators)
- Report counts of **strict-qualified, probable and excluded** sessions separately (existing classifier; thresholds untouched); exclude `isTest`.
- Funnel for sessions with a `/decision-room` page view: saved a product, configured a comparison, generated a brief, opened a vendor link. Each step is a count of sessions that reached it, divided only by the previous step's count when that count is above zero; otherwise the rate is NOT_MEASURED.
- Device: the new `viewport` field splits mobile, tablet and desktop for events after it shipped; older events are NOT_RECORDED.
- At current traffic (6 strict-qualified sessions in 30 days) the room will not yield a measurable effect for weeks. Report observations and limitations. Do not claim an experiment winner, a conversion uplift or revenue from it.
