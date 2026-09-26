# Miloosh production release — RELEASE_GREEN

Application source: `a925c0e7e129c09c2ca38f5e352d8edbc4afb9ab`.
Production deployment: `dpl_93Q6K6A2bH4dvMWRDSq1v7xi3Fqu`.
Live: https://miloosh.com
Deployment URL: https://flowtemplate-f56v5bbjb-lahman001.vercel.app
Promoted: 2026-09-26T22:50:25.901Z / 2026-09-27 01:50:25 Israel time.
Full production crawl completed: 2026-09-26T23:07:10.516Z.

## Shipped

- Integrated the inspected Claude research commit `981a491381da45bd61df0ddbe2e80e6c2135f76b` through `8ca0581`, not unrelated moving branch tips.
- Corrected 16-vendor support benchmark (9/16 AI-usage rates), seven-vendor CRM plan-gate research, downloads, trust links and content dates.
- Preserved Re:amaze and Tidio catalog controls exactly at release intake; imported their newer pricing only into isolated research snapshots. Frozen cohort membership is byte-identical.
- Added CRM research discovery to the existing Pipedrive vs Close comparison. No comparison ranking changed.
- Research tracking now recognizes the CRM route, and the sitemap includes it without an invented lastmod.
- Fixed two historical-time test fixtures after new public authority evidence; no weakening of the public-evidence rule.

## Verified

| Gate | Result |
| --- | --- |
| Full tests | 2,331/2,331, 258 files |
| Python static gate | 11/11 |
| Typecheck / lint / data / build | PASS |
| Dependency security | 0 vulnerabilities |
| Full rendered production crawl | 1,785/1,785; 0 failures |
| Production vs resolved local evidence | 0 differences across all recorded comparison fields |
| Local crawl | 1,746 initial PASS + 39 explicit timeout rechecks PASS; original evidence retained |
| Rendered commercial links | 4,138 checked; 0 blocking findings |
| Research browser journeys | 15 PASS; QA-only intercepted events |
| Responsive visual/geometry QA | 51 checks at 1440/390/320 + 3 dynamic /recommend checks |
| Representative pages / research downloads | 10 valid page routes and 4 downloads HTTP 200 |
| Dataset rows | Support 16; CRM 7; exact local/production row parity |
| Early post-promotion CLI log scan | 0 returned error/5xx rows in the bounded observed window |
| Google indexing | Two requests accepted, exactly one per new research URL |

Promotion followed staged-production GET verification. The independent deployment guard confirmed source SHA, READY status, alias assignment and HTTP 200, and detected no alias race. Full production crawl preserved exact metadata/canonical parity and found no runtime errors, unexpected redirects, CTA blockers or document overflow.

## Operations and limits

Both indexing requests are durably marked ALREADY_REQUESTED. Google added them to the priority crawl queue; neither indexing nor ranking lift is claimed.
Authority handoff contains verified production URLs. SaaSHub, Qevra and Hype Star are live. Four Reddit placements publicly show removal despite requested LIVE labels; the registry records the observed truth. SaaSComparely remains rejected.
Referral/research revenue and ranking movement remain UNKNOWN without complete exports and comparable post-release windows. The Re:amaze control contrast remains blocked for protocol review only.
Five pre-existing factual-depth advisories and nine weak internal-link nodes remain editorial follow-ups. /categories is a pre-existing unsupported 404; actual category navigation is /#categories and /category/crm.

No merchant navigation, application analytics writes, Blob writes, social posts, secret exposure, environment changes, GitHub push, reset, rebase or stash. No rollback was necessary.

## Reproduction and handoff

- Full gate logs: `var/growth/google-command/release/`.
- Local crawl + explicit recheck: `var/growth/google-command/crawl/`.
- Production crawl: `var/growth/google-command/production-crawl/latest.json`.
- Browser/health/mobile/dynamic evidence: `var/growth/google-command/production/`.
- Morning report: `var/growth/google-command/morning-20260927.md`, committed copy alongside this file.
- SHA-256 evidence hashes, exact differences, gates and original timeout routes: `production-qa.json`.
- Reversible rollback target and guard: `rollback.md`.
- App changes were committed before deployment; the subsequent receipt/evidence-only commit does not require redeploying unchanged application code.

Next action: observe the first actual Google recrawl/index result for the two accepted research URLs, without requesting indexing again.
