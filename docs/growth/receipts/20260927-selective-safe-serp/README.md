# Selective SAFE-SERP reconciliation

Source: `2ca40202b781ff750c1745631161ec95067fd244`. Target base: `1052cabdcd9b5f6c0eba626b9fa21b6ea33f27eb`.

## Scope decision

No whole-commit merge or cherry-pick. All 17 source files were inspected and accounted for in `reconciliation.json`:

- **1 accepted:** the exact Nutshell pricing patch, independently verified against the live vendor pricing page and both billing toggles.
- **3 held:** Webex, Confluence and Basecamp remain RESERVED in the current release registry. The source branch's SAFE_TO_EDIT report is not authority to release these reservations. Natural measurement controls are distinct from a randomized held-out cohort, but the current registry still protects them. No override, membership change or clock reset was made.
- **13 rejected:** obsolete CMS edits, duplicate inaccurate handoffs and mixed source receipts. No tests were changed in the source commit. Five focused target-branch regression tests were added here.

The valid Nutshell evidence behind source claim IDs 20–25 is separately corroborated in `vendor-evidence.json`. The source claim audit's declared totals also disagree with its 40 actual rows (18 VERIFIED and 10 ADDED, not 22 and 6); it was not imported as fresh release evidence. Source-only GSC observations were not represented as current measurements.

## Public change and CMS safety

Nutshell previously had no pricing block. It now records five tiers, a monthly-billed USD 19/user entry, separately labeled annual equivalents, trial and sourced plan boundaries. Existing renderer and affiliate rules remain intact; this is not affiliate activation.

Eight existing Nutshell comparisons consume the corrected catalog pricing; none is a protected comparison. Existing aggregate/listing consumers remain unchanged. The computed pricing index gains one verified row (269→270) and one monthly-USD row (116→117); the starting-price median remains USD 18. No new URL, ranking rule, sitemap edit or pricing-index methodology change.

The authoritative production CMS page, hub, builder, evidence data, JSON and CSV implementations are byte-identical to `bc5560b`. Its finding remains **7/8 documented input/output mechanisms**, with Joomla the one general outbound evidence gap. These mechanisms are not turnkey cross-CMS migration. The three held product JSON files are also byte-identical to production.

## Release gates before deployment

- 14/14 Google release gates PASS: protected intake, tsc, lint, full tests, Python static tests, data, affiliate audit, build, static release, query store, Google War, strict Command Center, browser smoke, diff check.
- 265 test files / 2,375 tests; Python 11/11. Focused pass: 27/27.
- Full local rendered crawl: **1,786/1,786**, zero failures; artifact `39055765ba3625f94d5271c9e0a52db43d0c372a51bcfd63f517c39745a02fbe`.
- Focused desktop/mobile browser: **45 checks**, 15 routes × 1440/390/320 px, no overflow or runtime errors. Pricing screenshots reviewed. CMS JSON has the exact eight rows; CSV has eight data rows. All browser API writes and external navigation blocked.
- SEO maintenance: zero issues; dependency audit: zero vulnerabilities. Indexation-readiness command PASS: 166 ready / 53 warning / 5 pre-existing content failures / 130 protected. Existing affiliate/link advisories remain disclosed, not claimed fixed.
- 196 protected URLs; zero changed incoming/outgoing graph edges versus the pre-CMS baseline (CMS release had already preserved these edges).
- Upload manifest: 1,538 entries at pre-receipt check, zero private regular files. Three empty excluded directory entries are not private-file uploads.

The existing Vercel staged-deployment/promotion workflow is used only after gates pass, with independent canonical-alias and exact-source verification. See `deployment.json` and `production-qa.json` when available; these predeploy checks alone are not evidence of promotion.

## Remaining gate

Webex, Confluence and Basecamp require explicit reservation reconciliation before integration. A green Nutshell release does not mean all four requested corrections shipped. Production CMS remains authoritative. No GitHub push, indexing request, social action, secret/environment change or Blob write is authorized by this selective release.
