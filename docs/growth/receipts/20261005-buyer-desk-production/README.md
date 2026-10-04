# Miloosh Buyer Desk — production release receipt

Date: 2026-10-05 (Israel). Status: RELEASED_AND_VERIFIED.

## Scope and identity

- Owner explicitly approved the animated Buyer Desk V3 demo and requested production.
- Release branch: `release/buyer-desk-20261005`.
- Runtime source: `4f169e1d634456a4009464be1ca3e91f1c217308`.
- Isolated worktree: `release-buyer-desk-20261005`; other checkouts were not modified.
- Baseline: `db766a4`, containing live source `f203a95ec8eeaeee0662e54b442375be8f35295c` plus its documentation-only release receipt.
- Previous live / rollback deployment: `dpl_CCbhTbxxwmZQ3MVJgY8W2z8G2dJZ`, `https://flowtemplate-6r68haioc-lahman001.vercel.app`.
- Production deployment: `dpl_7WxBUNp74B7X4Pa8MGFv4m9ETHkZ`, `https://flowtemplate-mu7nkrksn-lahman001.vercel.app`; built with `--prod --skip-domain`, then promoted only after the separate verification gate.
- GitHub branch push succeeded. No merge, reset, rebase or force-push was used. Remote main differs from the established production lineage; unrelated unpublished work was not merged.

## What ships

- Pausable independently floating forest intent and white saved-list windows, preserving production Manrope and the approved visual direction.
- Full-catalogue search; three buying situations; separate CRM, work and email lists; side-by-side comparison; differences-only view; local text decision brief with copy/download.
- Nine explicitly labelled starting points, not an affiliate-ranked or personalized recommendation. Facts and source dates are projected from existing canonical product records. No invented prices or vendor claims.
- Existing published comparison routes only, with canonical pair order. All previous homepage discovery sections, priority links, recommendation route and disclosure remain.
- A separate bounded `miloosh-buyer-desk-v1` browser-storage key. Reset works even for priorities without any saved tool. No account or new backend.
- Reduced-motion, offscreen, background-tab, focus/hover and manual animation pause protections.

## Preservation and tracking

- Data, affiliate resolver, revenue libraries, merchant CTA wrappers, APIs, social code, cron, environment values and `vercel.json` are unchanged from the baseline.
- Research navigation uses the existing `TrackedInternalCtaLink` / `internal_cta_click` path with `/` source, canonical target and static `buyer-desk-*` CTA names.
- Four actual wrapper tests prove one internal event per activation and no outbound event or written priorities. Local browser navigation succeeded even when the dev-origin analytics request returned 403; the guard was not weakened.
- No merchant URL was visited or affiliate conversion manufactured. Durable production analytics storage is not claimed by unit tests or absence of browser errors.
- No private notes enter telemetry. Export and priorities remain browser-local.
- Protection fingerprint: `506fbd4a6d555add1a02711b9ef30584afbebad889f790418fba62c551bd4dd1`; 196 unique protected paths, homepage not protected. Canonical registry inputs unchanged.

## Exact-source QA

- `npm run release:check`: PASS, exit 0.
- Vitest: 288 files / 2,703 tests PASS, including 28 focused Buyer Desk / navigation cases.
- Python static-gate tests: 11 PASS.
- Data validation: 354 software / 27 categories / 1,348 comparisons / zero problems.
- ESLint and TypeScript: PASS. Dependency audit: zero vulnerabilities.
- Production build: PASS / 3,542 generated outputs.
- Static release audit: 988 sitemap URLs / 1,786 public HTML pages / 94,100 internal anchors / zero failures.
- `git diff --check`: PASS.
- Browser QA: 1440×1000, 1280×900, 390×844. No document overflow; mobile comparison scroll remains inside its region; mobile menu/Escape work. Save/reload, isolated category lists, invalid-pair rejection, differences-only filtering, existing comparison navigation, copy, download, motion pause and context-only reset/reload verified.
- Download verified as an actual local `.txt` file. The in-app browser's download event wait timed out despite the file successfully being downloaded; not represented as an export failure.
- All 20 relevant existing destinations (nine profiles, nine pair comparisons, matcher and cost calculator) returned HTTP 200 before promotion.
- Fresh finish review: SHIP after the one named context-clear fix. Scoped implementation documented; incumbent `DESIGN.md` and sidecar preserved byte-for-byte. Existing design-document drift was not repaired without authorization.
- Deployment upload dry-run inspected: no env files, private `var` snapshots, `.impeccable` working documents, Git internals or node_modules shipped.

## Concurrent-work handoff

An independent `brand-migration-20261005` worktree was active during this release. Its uncommitted brand/social work was not included, changed or discarded. A later brand release must preserve this release's homepage and shortlist Navbar behavior; do not promote an older production baseline over it. Canonical alias identity is checked immediately before promotion and again afterward.

## Live evidence

- Staged runtime: READY / Production / exact `4f169e1d634456a4009464be1ca3e91f1c217308` metadata. Vercel's remote lint-roots, lint-coverage, lint, dependency audit and build passed.
- Deployment Protection initially returned HTTP 302 on raw deployment URLs. Authenticated `vercel curl` then returned application HTTP 200 without changing protection or pulling environment values. Existing in-app browser authentication also opened the candidate directly; no sign-in or access-setting changes were needed.
- Protected-route semantic parity completed at `2026-10-04T22:29:15.613Z`: 196/196 checked, zero differences in title, description, canonical, H1, robots, JSON-LD, links/rel/text and main-text hash. Only read operations; no merchant destinations followed.
- Staged browser: actual save two / compare / copy brief / reload persistence passed; 390px document width remained 390px; desktop animation running → paused → resumed verified. No browser error entries in the observed window.
- Pre-promotion guard reconfirmed the previous live source and alias. `vercel promote` succeeded. Post-promotion guard verified canonical `miloosh.com` assignment, READY Production, exact release SHA and HTTP 200, then repeated its identity read to detect a concurrent promotion.
- Public checks at `2026-10-04T22:32:34.580Z` (01:32 Israel, October 5): homepage plus 20 linked profile/comparison/tool routes HTTP 200; `/internal` HTTP 401 with `noindex, nofollow`.
- Live homepage: one H1, `https://miloosh.com` canonical, Buyer Desk and animation markup present; no noindex header/meta. `www` returned 301 to apex preserving the full query string.
- Live Pipedrive / Close comparison retained exact verified affiliate URLs and `rel="sponsored noopener noreferrer"` for both sides.
- Live browser: 1440px and 390px renders inspected; document width equals viewport; animation gate reports running; no browser errors observed. Existing production saved research was not modified during the read-only live check.
- Browser QA used `qa=1` / `qaRun=buyer-desk-production-20261005` markers. These are synthetic verification observations, not traffic, merchant visits or conversion claims. No production Blob credentials were loaded and no secret value was exposed.
- Local QA logs: `/tmp/miloosh-buyer-desk-final-release-20261005.log`, `/tmp/miloosh-buyer-desk-parity-20261005.json`, `/tmp/miloosh-buyer-desk-live-20261005.json`. Viewport captures are development-only under `.impeccable/review/buyer-desk/`.
- Runtime rollback, if a genuine regression is later found: promote `https://flowtemplate-6r68haioc-lahman001.vercel.app`, first checking for newer independent releases. No rollback was performed.
