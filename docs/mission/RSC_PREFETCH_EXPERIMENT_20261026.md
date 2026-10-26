# Miloosh: RSC prefetch and Google's crawl requests — controlled experiment

Status: isolated experiment, NOT released. Source baseline 9130c2c. No indexing, robots, canonical or sitemap changes. No costs or external posts.

## Google Search Console, owner-authenticated (2026-10-26)

Crawl Stats report last updated 2026-10-21, past 90 days: 83.8k crawl requests, average response 98 ms; about 74.7k requests (89%) classified as Other file type, 6% HTML, 4% JavaScript, 97% refresh requests, 3% discovery. Google Search Console drilldown for Other file type includes numerous requests such as /compare/slack-vs-mattermost?_rsc=5kx_-4JFflOuADiS, /compare/slack-vs-discord?_rsc=..., and /sources-policy?_rsc=... . Sample events occurred in September and on October 3. They are historical; NOT proof of current bot behavior.

GET of /compare/slack-vs-mattermost and the same route with the sampled _rsc query, with a Googlebot string user agent and WITHOUT Next RSC headers, returned byte-identical 119,454-byte text/html content with the same SHA256. No duplicate canonical change was observed.

Headless Chrome on current production, three viewport scrolls and zero clicks:
- Normal user agent: /compare 52 RSC prefetch requests out of 72; /software/slack 26/50; /software/semrush 27/54; /category/project-management 44/68.
- Requests had RSC: 1 and Next-Router-Prefetch: 1 headers.
- Using a Googlebot user-agent string in that same Chrome probe produced zero RSC requests on each of those four routes. That imitation does NOT reproduce Google's real rendering service. The historical GSC requests are real, but the current Googlebot rate is UNKNOWN.

## Narrow experiment

Only one Next Link call is changed: the progressive 72-card comparison directory in components/CompareGrid.tsx now sets prefetch=false. This leaves the same ordinary HTML anchor links, visible labels, search/filter behavior and routes. It avoids background prefetch for 72 cards that may not be clicked. Next.js documents that prefetch=false disables loading on viewport entry and hover (https://nextjs.org/docs/app/guides/prefetching).

Tradeoff: on-click navigation may be slower because the destination was not preloaded. Verify navigation and accessibility with headless Chrome desktop/mobile.

## Required tests

1. Source guard, TypeScript, lint and data validation.
2. Vercel preview build at exact SHA.
3. Compare no-click RSC request counts on production versus preview under identical Chrome scroll conditions.
4. Check card click navigation, HTTP 200 and canonical links.
5. Run the official Release Guardian and rendered comparison. Shared-component protection may block publication even when SSR HTML is identical. Do not bypass it.
6. If a future release is permitted, observe actual GSC Crawl Stats after recrawling; fewer speculative requests do not imply increased indexation or traffic.

## Not changed

No global robots Disallow rule for RSC queries; these requests can be needed for client-side navigation and Google rendering. No mass pages, no noindex/canonical/sitemap changes, no protected Miro or pricing page edits. Follow Google's crawlable-links guidance: https://developers.google.com/search/docs/crawling-indexing/links-crawlable .
