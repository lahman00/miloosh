# Miloosh — distribution and infrastructure — 2026-09-13

## Scope
User-directed distribution, genuine editorial mentions, directories and infrastructure; no rewrite of the twelve Wave 1/Wave 2 guides, no visual changes, no purchase and no new account. Isolated branch `growth/distribution-infra-20260913` starts at the already-live security commit `141ee105b1d0e6584eb3264a5a78a0715458680f`.

## Completed outreach
- Agency by Agency: time-tracking reconciliation method for Toolkit/Briefing consideration. SENT `1a09966d4c78f4ee` to the official about-page contact.
- Operations Nation: spreadsheet replacement / access-role worksheet for resource-library consideration. SENT `1a09966fb360f0ad` to the published community contact.
- Support Driven: permission-first resource inquiry for the small-team help-desk worksheet. SENT `1a099672a1350dc9`; authorship disclosed, no membership assumed.

All three were deduplicated against current Gmail history and local acquisition/distribution documents; destination Miloosh guides were fetched successfully before sending. Each link uses source-specific UTM attribution. No publisher acceptance, live backlink, acquisition or commission is established by a sent email. Wix, Omnisend, monday.com, Pipedrive and the recent payout/affiliate follow-ups were NOT sent again.

## Infrastructure defect and reproduction
`lib/social/queue.ts` previously returned `[]` on storage exceptions or malformed JSON. A downstream read-modify-write such as `addQueueEntries()` could consequently replace existing history as if storage were empty. This is a reproduced risk, NOT a claim that production data loss occurred.

Added queue-read integrity tests first: 8 failed and 3 passed on the old implementation. The repair distinguishes genuine not-found storage from transport, permissions, unexpected responses, malformed JSON, invalid lifecycle state and duplicate identities. Valid legacy fields remain untouched. Writes validate identities before calling persistence. Errors are sanitized rather than echoing provider details.

This fix does not implement cross-process compare-and-swap and does not claim to eliminate all concurrent-writer races. No real Blob write was used for testing. A read-only compatibility proof accepted 2,485 production queue records; historical `PUBLISHED` state is not new publication.

## Release gates
- Isolated dependency installation completed.
- Full suite: 165 test files / 1,487 tests passed, including 15 new regression tests.
- Full lint, TypeScript, data validation, production build and diff whitespace checks passed.
- Data validation: 354 software records, 27 categories, 1,348 comparisons; zero problems.
- Protected content hash check: 9 guide/related files identical. The release diff contains no guide, page, component or CSS change.
- Deployment: not yet promoted at the time this initial receipt was written; append verified release receipt below.

## Already completed security remediation — reverified, not newly authored
The current production at session start is `dpl_8vEN8Y44HAP2eGQydhquWUWg5JjS`, security commit `141ee10`, Next.js 16.3.5 and Sharp 0.35.4. `vercel inspect https://miloosh.com` independently resolved that deployment. Fresh `npm audit --omit=dev` returned exit 0 and zero known vulnerabilities in production dependencies. This is limited to npm advisories at the check time, not a full application penetration test. Vercel reported no runtime errors in the selected six-hour window.

## Directory screening and follow-through
Startup Buffer: explicit Cloudflare human-verification challenge; stopped, no bypass. Tools.so: page-load timeout; not submitted. Crowdstax/Dir Hub: login required; not submitted. FeedMyStartup: published email route exists but browser access gate prevents form completion at the initial check. The Digital Project Manager contribution route requires a personal LinkedIn profile and truthful practitioner context; not fabricated. Existing Startup88 email confirms review only; no paid upsell accepted.

## Evidence locations
Private runtime receipts are under `var/distribution-infra/` and excluded by `.vercelignore`: before/after failure tests, full test/lint/type/build logs, production audit, protected hashes and message IDs. No secrets are committed.

## Remaining gates
Actual publisher acceptance or new backlinks require external action. Existing social-account authorization and payout verification are not fixed by this release. No unattended monitoring was configured. GitHub account suspension remains an external owner gate; no alternate identity/repository or forced push was used.
