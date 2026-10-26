# Dual-agent mission, 2026-10-26 (Claude Code, isolated checkout)

Branch `work/dual-agent-growth-20261026`, base `6be2126`. Local commits only: nothing pushed, merged, deployed, posted or sent. No credential was read or changed. No money spent.

## 1. Verified facts about what runs

| Fact | Evidence (2026-10-26) | Status |
|---|---|---|
| Production is `dpl_7U3KBUtDh45M7gtp6B6aZntbMeHU`, created 2026-10-25 17:02 IST, built from `6be2126` | `vercel inspect miloosh.com`; `vercel api /v13/deployments/<id>` meta `githubCommitSha` | OBSERVED. This checkout's base equals production. |
| Sitemap: 693 URLs, every one HTTP 200, self-canonical, no `noindex`, exactly one `<h1>` | plain GET of each URL in `https://miloosh.com/sitemap.xml` | OBSERVED |
| `robots.txt`: `Allow: /`, `Disallow: /internal/`, sitemap declared | live GET | OBSERVED |
| Internal links: 591 distinct same-site hrefs from 80 sampled pages; 586 return 200, 4 not probed as static assets, 1 is `/research` -> 308 to `/research/saas-pricing-pressure-index-2026` | live GETs, no redirects followed | OBSERVED (sample, not the whole site) |
| Source link audit: every hardcoded `/software/*` and `/compare/*` string in `app`, `components`, `data`, `lib` resolves, except references inside reports and snapshots (`data/seo/priority-snapshot.json`, two markdown reports), which are not rendered | ad-hoc script, 355 software / 1,348 comparisons | OBSERVED |
| PRs: #85 OPEN (Miro alternatives, held: Miro observation window to 2026-11-04 at earliest), #89 OPEN (social queue eligibility, Codex), #86 CLOSED, #87/#88/#90/#91/#92/#93 MERGED | `gh pr list` / `gh pr view` | OBSERVED |

Not available this session, so NOT_MEASURED: Search Console, GA4, affiliate-network reports, private Blob event store (no production credential in this checkout). Nothing below is a traffic or revenue claim.

## 2. Fixes implemented (IMPLEMENTED_LOCAL, then TESTED, see section 5)

### A. Provider credential rejection burned posts (`da18694`)
Defect, reproduced: Facebook returns OAuth 190 (classified `AUTH_TOKEN_ERROR`) and Buffer returns "Access token is not valid"; both came back as ordinary `FAILED`. `providerStateFromResult` counted an attempt (3 allowed), and `runPublishCycle` moved a single-channel entry to `FAILED`. Because the daily cap only counts successes, every later due entry in the same cycle hit the same dead token and failed too. An expired token therefore drained the queue instead of pausing it.

Fix: `lib/social/auth-failure.ts` marks a provider auth rejection as `AUTH_BLOCKED (owner re-authorization required)`. Such a result consumes no attempt, maps to `BLOCKED` but stays eligible for the next cycle, leaves a fully-blocked entry `SCHEDULED`, and makes the cycle skip further calls to that provider. Permission, rate-limit, invalid-content and "post text is not valid" errors keep their old handling. `scripts/social/status.ts` gains a read-only Buffer channel probe (the Facebook probe already existed) and lists held entries.
Tests: `tests/social/provider-auth-block.test.ts` (17). Three of them fail on the old publisher (confirmed by restoring the old file), all pass with the fix.

Official docs read: Meta Graph API error handling (code 190 and subcodes 458/459/460/463/467: token expired, revoked or invalid; get a new token, sometimes re-authenticate the user). Buffer's developer page says the API key comes from Buffer settings and is sent as a Bearer token; its error-handling guide was not reachable from that page, so the exact Buffer error shape is UNVERIFIED beyond the observed message.
Conflict warning: PR #89 also edits `lib/social/publish.ts` and `tests/social/publish.test.ts`. My edits are in `channelNeedsAttempt`, `providerStateFromResult`, the cycle's skip filter and the state step, plus one import; expect a small manual merge.

### B. BuyerDesk (`components/BuyerDesk.tsx`, `lib/buyer-desk.ts`)
1. Replacing a tool: the guided form asks "Which tool are you replacing?", but the page still listed that tool as a starting point to save and compare. It is now hidden with a visible note, matched by whole word (so "closed spreadsheets" does not hide Close). The hardcoded "3 starting points" is derived.
2. Typed answers lost: the form was keyed on `intent` plus category, so changing "What are you working on?" remounted it and erased the typed current tool, concern and note. Only the compare selects re-key on category now.
Tests: `tests/lib/buyer-desk-replaced-tool.test.ts` (13). The repo has no DOM test environment, so the form-key part is a source-level guard, not a browser interaction test. NOT browser-verified.

### C. Internal CTA middle-click (`components/TrackedInternalCtaLink.tsx`)
Vendor links already count middle-clicks; internal CTAs did not, undercounting new-tab opens on comparison and checklist links. Tests: `tests/analytics/internal-cta-middle-click.test.ts` (3). Handlers are not serialized, so rendered HTML does not change.

## 3. Reviewed, no defect found
- Recommendation engine sweep: 496 combinations (16 domains x budget x team size). Browse-only is already low confidence (#88). Eight combinations (social media and SEO platform with "free only") return one result labelled "high"; that is a defensible single survivor of the free filter, not changed.
- Outbound vendor click tracking: click, middle-click, `keepalive` fetch, QA/synthetic marking are all present.
- Sitemap and canonical guardrails intact; nothing in `app/sitemap.ts`, robots, noindex or the comparison cohort was touched.

## 4. Deliberately not changed
- `/research` footer link (redirects 308 to the index). The footer is on every page including protected and observed ones, so changing it needs the owner's approval and a rendered diff. Existing note in `MILOOSH_NEXT_ACTIONS.md` item 4.
- `data/software/miro.json` and everything in PR #85 (observation window).
- Social publishing credentials. Facebook 190 and Buffer "Access token is not valid" are provider reauthorization problems; no tokens were read, tested or refreshed. X remains blocked on billing (pay-per-use); no purchase made.

## 5. Verification (exact commands, this checkout, Node 24.21)
Run on the committed tree (after commits `da18694` and the BuyerDesk commit), all exit 0:
- `npm run lint`: pass
- `npx tsc --noEmit`: 0 errors
- `npm run validate:data`: 355 software pages, 27 categories, 1,348 comparisons, 0 problems
- `npx vitest run`: 265 files, 2,714 tests passed (base reported 2,667 on 6be2126; +33 new here, remainder from other recent tests)
- `npm run build`: pass
- `npm audit --audit-level=moderate`: 0 vulnerabilities
Not run: `growth:rendered-diff` / Release Guardian (needs a clean-checkout gate record and a baseline build). The BuyerDesk change alters homepage markup slightly (derived count text); a rendered diff is required before any release. Browser and mobile QA not done. Status: TESTED locally; not RELEASED.

## 6. Best next commercial actions (ranked, none a forecast)
1. Owner: re-authorize the Facebook Page token and the Buffer API key in their provider consoles, then update Vercel env. After that, run `npx tsx --env-file=.env.local scripts/social/status.ts` (read-only probes) before any live cycle. Held entries stay SCHEDULED, but any older than the grace window go through stale-requeue rather than posting as-is.
2. Owner: review PR #89 and this branch together (same file); then release one at a time with the Release Guardian.
3. 2026-10-30: read `npm run growth:daily-report -- --live` and compare `compare-page-pricing-table` against `compare-page-choose-card` clicks (baseline: 88 impressions, 0 clicks over 30 days). Needs the production Blob credential.
4. Owner: export partner-network reports (Wix/Impact, Trainual, KrispCall, Apollo.io, CallRail, MailerLite, Close, Pipedrive); until then conversions and commissions are NOT_MEASURED.
5. After 2026-11-04: Miro alternatives (PR #85 rebase), pricing batch, and the `/research` footer link in one reviewed release.

## 7. Blockers
Search Console and GA4 evidence unavailable; partner-network data unavailable; production Blob credential not in this checkout; provider reauthorization needs the owner; Buffer error-handling guide not retrievable.
