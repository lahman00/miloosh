# Miloosh Search Visibility Receipt — 2026-09-24

Observed during the Google/Search Console visibility sprint on 2026-09-24.

## Search Console and indexing actions

- The authorized browser/Mac used for Google Search Console was offline during this verification window.
- No new Search Console indexing request was submitted.
- The previously successful request for `https://miloosh.com/best-ecommerce-platform-for-small-business` was intentionally not duplicated.
- No action was taken on the previously ambiguous second URL state (where Search Console had surfaced a different ecommerce URL than intended).

## Crawl-discovery cohort

The stored GSC evidence snapshot used for this branch records:

- 1,348 published comparison routes at capture time.
- 298 current comparison routes with any Search visibility.
- 1,050 current comparison routes with zero visibility.
- 804 older zero-visibility comparison routes published before 2026-08-15.

Those 804 routes remain live, canonical and indexable. They are suppressed only from sitemap submission / priority directory discovery. The explicit small-store decision overrides remain:

- `ecwid-vs-shopify`
- `ecwid-vs-woocommerce`
- `shopify-vs-woocommerce`

## Canonical-host verification

Live checks found:

- `https://miloosh.com` remains the intended canonical host.
- `https://www.miloosh.com/software/ecwid` currently serves HTTP 200 with canonical `https://miloosh.com/software/ecwid` rather than redirecting.
- Current public search results still surface `www.miloosh.com` URLs.
- `https://flowtemplate-delta.vercel.app/...` currently redirects to the apex host, but stale search results for that legacy hostname remain visible pending recrawl.
- `https://flowtemplate-lahman001.vercel.app/...` is protected by Vercel SSO and returns `X-Robots-Tag: noindex` on the auth response.

Evidence-backed remediation was added on this branch: known non-canonical public hosts are permanently redirected to `https://miloosh.com` with path and query preserved. Regression tests cover `www`, the legacy public Vercel hostname, and the canonical apex host.

Relevant commits before this receipt:

- `b104fb56ab5384d8807bb8ba1bbac4ffc99904fc` — persist GSC crawl-priority cohort on current main baseline.
- `ebe07924f22cfd6337ca1d78af8fe12aea366469` — normalize non-canonical public hosts.
- `787eb363f8c4d6ec81c3482431bbdece3270a2c8` — add canonical-host redirect regression tests.

## Validation and release state

- Branch `seo/google-crawl-focus-20260924` was 3 commits ahead / 0 behind `main` before this receipt commit.
- Vercel preview `dpl_BUKJB95nRydo2zhq4HSkeF6QQHpK` for code head `787eb363f8c4d6ec81c3482431bbdece3270a2c8` reached READY and the Vercel status check succeeded.
- GitHub Actions run `35991408401` failed before project tests/lint/build because `npm audit --audit-level=moderate` reported current dependency advisories in `vitest/@vitest/mocker`, `js-yaml`, `next`, and `sharp`.
- This SEO branch does not modify `package.json` or the lockfile. Because CI is red, PR #66 was explicitly converted to draft and must not be merged until the dependency/security baseline and normal CI checks are reconciled.
- Production was not overwritten or rolled back. The newer production deployment contains functionality not present on default `main`, so the preview must not be directly promoted over production.

## Social identity safety

- No X, LinkedIn or Facebook writes were performed in this window because the authenticated Miloosh browser path was offline.
- No personal Eyal identity was used as a fallback.

## Durable review path

PR #66: `SEO: focus crawl discovery and normalize canonical hosts`.
It contains the scoped code changes, validation evidence, CI blocker, and release caution.