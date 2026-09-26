# Google visibility control system

Engineering lane, 2026-09-26. Recommendations only; no publishing, indexing submission, network call, affiliate mutation or production Blob operation. The existing SEO Factory remains Level 0. This does not install a cron job.

## Run

```sh
npm ci --ignore-scripts
MILOOSH_QA_BUILD=1 npm run build
npm run growth:google-war
```

Requires Node, Python 3 and the existing repository dependencies. Output:

- `var/growth/google-war/latest.json`: all commercial rows, top 50, technical audit, protections, source attribution, observations, request queue.
- `var/growth/google-war/latest.md`: grouped review queue and integrity notes.
- `var/growth/google-war/authority-graph.json`: every emitted crawlable edge, anchors and all page metrics.
- `var/growth/google-war/indexation-history.json`: append-only observation semantics, atomic writes and exclusive run lock. Back this local file up through the normal private backup process; no cloud persistence was added.

Optional paths: `--dist`, `--gsc`, `--inspections`, `--inspection-cache`, `--output`. The default inspection cache is the existing `var/agents/state.json`. No credentials are loaded. A failed/missing build, invalid evidence, corrupt protection store or conflicting historical observation fails closed. Technical or prioritized quality regressions return a nonzero status.

Do not point the report at a stale build. Build ID and full artifact hash identify what was inspected; `sourceSha` identifies repository HEAD at analysis time, not a deployment. Build IDs are not proof of production promotion. A crash can leave `.run.lock`; verify no owning run remains before manually clearing that exact lock. Do not discard the history to fix an evidence conflict.

## Refresh evidence without erasing the baseline

Use the existing authenticated GSC read/export workflow. Do not infer authentication from an arbitrary JSON file: provenance and chain of custody still require human verification. The importer validates structure and records a source-file digest; it cannot authenticate a forged input.

```sh
npx tsx scripts/growth/import-google-war-evidence.ts PAGE_JSON INSPECTION_JSON START_DATE END_DATE OUTPUT_DIRECTORY
npm run growth:google-war -- --gsc OUTPUT_DIRECTORY/search-snapshot.json --inspections OUTPUT_DIRECTORY/inspections.json
```

Dates must match the source export. If omitted, the output directory is a dated directory under `var/growth/google-war/imports/`. Existing imports are never overwritten. The checked-in September snapshot is an immutable seed, not an always-current measurement. The Hebrew UI importer isolates the requested inspection panel so a stale previous panel cannot contaminate it. Displayed crawl dates retain their original text because the export does not establish a timezone. The API cache supports exact ISO crawl timestamps when provided.

The initial evidence is 537 cached authenticated page rows, 491 exact canonical apex URLs, 5 raw UI inspection observations and 26 explicitly **reported** inspections from Claude's committed receipts. The latter are not raw API results. Their source fields explain report-time/day precision and unavailable fields. No API or Search Console submission is performed by this command.

## Interpretation

- Missing data is `null` / UNKNOWN, not zero. Variant hosts/query URLs are not silently folded into canonical rows. Separate query and page exports cannot establish query-to-page attribution.
- Search metrics describe the reported historical window. A current not-indexed observation cannot explain the entire historical CTR window by itself.
- Groups use explicit rules, not a claimed Google score. CTR review requires observed impressions >=100, position <=10, CTR <1%, and an INDEXED observation. Unknown indexing holds ranking/CTR diagnoses.
- Factual depth is structured-field **completeness**, not truth verification or Google's quality assessment. The 43 prioritized A/B software baselines are guarded against missing/C/D regressions; unrelated thin pages are not blanket build failures.
- HTML edges exclude script/template payloads, nofollow and noindex nodes. Fragment links count as discovery of the target page. Relevance means category/product overlap or explicitly reviewed decision paths, not measured Google authority. Minimum depth includes crawlable navigation even if visually collapsed.
- Software URLs own their product's alternatives intent; comparison pairs own head-to-head intent. Duplicate owners, canonical ownership and incompatible comparison titles are checked. This does not assert that arbitrary prose or rankings are correct.
- Repeated prose is a warning only. Catalog description/best-for facts, trust disclosures and feature lists are excluded from the warning gate. Repeated useful caveats may still warrant no action.

## Central protection and indexing requests

`lib/google-war/protection.ts` is shared by this report, the existing opportunity miner, remediation queue and SEO Factory recommendation suppression. Sources: nine real MEASURING receipt pages, nine conservative legacy reservations, and Claude's 14 treatment + 10 control reservations. A MEASURING record never silently expires at its checkpoint. Wrike's checkpoint is October 8; an overdue checkpoint is not permission to edit. SAFE_TO_EDIT means no **local** record prevents a review; production-only experiment state was not queried.

New paths are tested at both endpoints. The receipt additionally asserts identical incoming/outgoing edge footprints for all 42 protected/reserved pages against the frozen build. This does not claim that indirect referral effects are impossible.

Request history lives in `data/growth/google-war/indexing-requests.json`; missing/corrupt history is an error, not an empty queue. Pipedrive and Wrike's September 26 confirmations are recorded with day precision. No repeat was made.

For manual request eligibility, record a real **deployed** material change in `improvements.json`, including deployment ID and a <=7-day production check of HTTP 200, exact final URL/self canonical, indexability and sitemap inclusion. The local artifact gate must also pass, the URL must have value and a known non-indexed state, and protection/recent-request checks must permit it. Local-only edits retain `deployedAt: null`. `READY_TO_REQUEST` is a human review queue, never a promise of indexing and never an automatic submission.

Google's [URL Inspection result fields](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult) distinguish coverage/verdict, crawl and canonicals. [Inspection guidance](https://support.google.com/webmasters/answer/9012289?hl=en) explains index status separately from live URL testing. Do not treat HTTP 200 or sitemap membership as index inclusion.

## Reproduce this mission's QA receipt

The one-time `freeze-google-war-baseline.ts` script refuses to overwrite its frozen evidence. `google-war-receipt.ts` compares the two mission builds, requires exactly eight new unique source/target paths, zero removals and unchanged protected direct-edge footprints. It is a mission-specific regression receipt, not a general instruction to limit every future change to eight links.

```sh
MILOOSH_QA_BUILD=1 npm run start -- --port 3238
npx tsx scripts/growth/google-war-browser-qa.ts http://localhost:3238 PRIVATE_RECEIPT_DIRECTORY
```

The browser command requires `agent-browser` on PATH. It is localhost-only, intercepts `/api/**`, checks native internal navigation at 1440/390/320px, and never clicks merchants. Existing revenue QA remains separately available. Do not run local browser QA against production analytics.
