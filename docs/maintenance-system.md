# Autonomous maintenance system (Sprint 12)

A set of deterministic, read-mostly agents that check Miloosh's data,
SEO surface, recommendation engine, and revenue posture, and report what
they find. **Nothing in this system publishes a factual change
automatically, commits anything, pushes to `main`, or merges anything.**
Every finding is written to a local report for a human to read and act on.

## Why "mostly autonomous," not "autonomous"

The sprint that built this was explicit: prepare data for human review,
never publish it. Every agent below is read-only against
`data/software/*.json`, `data/comparisons.ts`, and
`data/revenue/affiliate-programs.ts` — none of them contain a code path
that writes to those files. The only files this system writes to are
inside `var/maintenance/` (gitignored, local, regenerated every run).

## Architecture

```
types/maintenance.ts           Shared types: AgentRun, Severity, MaintenanceIssue,
                                 ProposedChange, SourceEvidence, MaintenanceReport,
                                 MaintenanceSummary, RunStatus

lib/maintenance/
  paths.ts                       var/maintenance/ path helpers
  report-io.ts                    writeReport/writeSummary/readLatestSummary/readAgentReport
  run-agent.ts                     runAgent() — uniform execution wrapper (see "Severity rules")
  http.ts                           checkUrl()/checkUrlsWithConcurrency() — the link checker
  recommendation-fixtures.ts         the 14 regression fixtures (Phase 5)
  notifications.ts                    provider-neutral notification abstraction (Phase 11)

scripts/maintenance/
  links.ts                Phase 2 — Link Health Agent
  freshness.ts              Phase 3 — Data Freshness Agent
  seo.ts                      Phase 4 — SEO Integrity Agent
  recommendations.ts            Phase 5 — Recommendation Regression Agent
  comparisons.ts                   Phase 6 — Comparison Opportunity Agent
  affiliate.ts                        Phase 7 — Affiliate Opportunity Agent
  run-all.ts                             Phase 8 — master run (`npm run maintenance`)

app/internal/maintenance/page.tsx   Phase 9 — private dashboard
.github/workflows/maintenance.yml    Phase 10 — weekly scheduled run

var/maintenance/                      Generated reports (gitignored)
  <agent>.json / <agent>.md             One pair per agent
  latest-summary.json / .md              Combined output of `npm run maintenance`
```

Every agent script can run standalone (`npm run maintenance:links`, etc.)
or as part of the combined run (`npm run maintenance`) — the same `run()`
function backs both; `run-all.ts` imports each agent's `executeXAgent()`
function directly rather than shelling out, so a combined run doesn't
duplicate network calls or computation.

## The agents

### Phase 2 — Link Health (`npm run maintenance:links`)

Collects every official `website`, `sources[]` entry, `links.*` vendor
resource, and (only if genuinely activated — see `docs/revenue.md`) an
affiliate URL from `data/software/*.json`, plus every research
`sourceUrls[]` entry in `data/revenue/affiliate-programs.ts`. Checks each
unique URL with a dependency-free redirect-following fetch
(`lib/maintenance/http.ts`), classifying the outcome: `ok`, `not_found`
(404), `gone` (410), `client_error`/`server_error`, `redirect_chain_too_long`
(>5 hops), `cross_domain_redirect` (the first hop lands on a different
hostname than requested), `connection_failure`, `timeout` (10s), or
`invalid_url`. 404/410/invalid/unreachable/timeout are `critical`;
redirects and other client/server errors are `warning`. Bounded
concurrency (6 at a time) so it doesn't hammer vendor sites.

### Phase 3 — Data Freshness (`npm run maintenance:freshness`)

Scores every software entry 0-100 from measurable factors only —
`accessedAt` age (0 to -30 as it gets older), 8 possible missing optional
fields (`founded`, `company`, `platforms`, `pros`, `cons`, `faq`, `tags`,
`pricing.model`, each -3), missing `website` (-15, defensive — the schema
already requires it), no `links.*` vendor resources set (-5), an
unresolved affiliate status (-8, cross-referencing
`data/revenue/affiliate-programs.ts`), and thin source coverage (-5 for 1
source, -2 for 2). **A high score means well-documented and recently
checked — it is never a claim that the underlying facts are still
correct.** That sentence is repeated in the report and the dashboard on
purpose.

### Phase 4 — SEO Integrity (`npm run maintenance:seo`)

Entirely static: computes every page title/meta description the same way
the real pages do (by calling `lib/generators.ts` and `lib/comparison.ts`
directly) and checks for exact-string duplicates; greps known page source
files for `alternates: { canonical:` and `<JsonLd`; imports and calls the
*real* `app/sitemap.ts` and `app/robots.ts` default exports (not a
reimplementation, so it can't drift from what actually ships) and
cross-checks their output against the data layer; verifies
`alternatives[].slug`/`category`/comparison-pair references all resolve;
checks for duplicate/reverse-duplicate comparison definitions; and greps
`app/page.tsx`/`app/compare/page.tsx` for the specific mapping patterns
that guarantee every software/category/comparison page stays linked from
somewhere (a structural proxy for "no orphan pages"). This agent's
critical findings represent real codebase bugs, not external drift — see
"Severity rules" below.

### Phase 5 — Recommendation Regression (`npm run maintenance:recommendations`)

Runs 14 fixtures (`lib/maintenance/recommendation-fixtures.ts`) through the
real `getRecommendations()` engine and checks *structural* assertions —
which category won, whether a factor of a given direction mentioning a
given keyword exists, exact/relative scores — never exact explanation
text. A wording tweak to a `ScoreFactor.explanation` string never breaks
these; a real behavior change (wrong category wins, a factor that should
fire doesn't, industry starts contributing points when it never should)
does. One fixture (`industry-only-never-scored`) exists specifically to
guard the "industry is collected but never scored" honesty invariant from
`docs/recommendation-engine.md`.

### Phase 6 — Comparison Opportunity (`npm run maintenance:comparisons`)

Evaluates every unpublished pair from the 34 software entries (561 minus
the 20 already in `data/comparisons.ts`). A pair becomes a candidate only
if both sides have enough data (≥3 features) **and** there's a real
relevance signal — same category, or one lists the other in its own
`alternatives[]`. Priority = direct-alternative (+40) + same-category
(+20) + both-have-a-confirmed-affiliate-program (+10) + a coverage-gap
bonus for pairs involving under-compared products. **Never writes to
`data/comparisons.ts`** — every candidate is a suggestion for a human to
add the same deliberate way the original 20 were curated in Sprint 7.

### Phase 7 — Affiliate Opportunity (`npm run maintenance:affiliate`)

Reads only `data/revenue/affiliate-programs.ts` and the existing revenue
scoring (`lib/revenue/scoring.ts`, `tiers.ts`). Four lenses: confirmed
programs not yet activated (`programExists: "yes"` but
`getAffiliateActivation().isActive` is false), unresolved programs
(`programExists: "unknown"`), Tier A/B products with no confirmed program
(commercial relevance outrunning monetization), and research older than
90 days (via the real `lastVerifiedAt` field added to every entry in
Sprint 12 — all 34 were genuinely researched on 2026-07-31, so this isn't
a placeholder date). **Never reads or writes `config/affiliate-credentials.json`
or an activation's actual URL/ID** — the report only ever says whether one
is active, never what it is, so it's safe to display on the dashboard.

## Severity rules

Every `MaintenanceIssue` has a `severity`: `critical`, `warning`, or
`info`. This is **independent** of whether an agent's own run
(`AgentRun.status`) counts as `success`, `warning`, or `failure` — see
`lib/maintenance/run-agent.ts`:

- A thrown exception, or "the agent couldn't get the data it needed," is
  always `failure`.
- For the **link health** and **freshness** agents, critical findings
  (however many) only ever produce run status `warning`. A 404 on a
  vendor's site or a stale `accessedAt` is a fact about the outside
  world, not a bug in this codebase — it must never block anything
  automatically.
- For the **SEO integrity** and **recommendation regression** agents,
  critical findings escalate the run status to `failure`
  (`runAgent(..., { escalateCriticalToFailure: true })`). Their critical
  findings mean *our own codebase is inconsistent* — a broken internal
  reference, a sitemap that no longer matches the data, a recommendation
  fixture that regressed — which is exactly the "build-integrity problem"
  the sprint said should fail the maintenance command.
- The **comparison** and **affiliate opportunity** agents never emit
  `critical` at all — they only ever surface `info`/`warning` suggestions,
  since "here's a candidate to consider" is never itself a problem.

`npm run maintenance` (Phase 8) exits non-zero only if any agent's
`run.status` is `failure`. A pile of `critical`-severity *findings* from
links/freshness never fails the command on its own — that's the whole
point of "prepare for human review."

## Commands

```bash
npm run maintenance                  # run all 6 agents + write the combined summary
npm run maintenance:links
npm run maintenance:freshness
npm run maintenance:seo
npm run maintenance:recommendations
npm run maintenance:comparisons
npm run maintenance:affiliate
```

## Report formats

Every agent writes `var/maintenance/<agent>.json` (the full
`MaintenanceReport<TData>`, machine-readable) and `var/maintenance/<agent>.md`
(human-readable, grouped by severity, plus an agent-specific extra
section — a table of rankings/candidates/fixture results). `npm run
maintenance` additionally writes `var/maintenance/latest-summary.json` and
`.md`: agent statuses, total counts by severity, a "recommended human
actions" list built from what actually ran (never a canned list — it's
empty except for one "no action required" line when there's genuinely
nothing to flag), and relative paths to every detailed report.

## GitHub Actions behavior

`.github/workflows/maintenance.yml` runs weekly (Mondays 09:00 UTC) and on
manual `workflow_dispatch`. Steps: checkout, install, `npm run maintenance`
(non-blocking — `continue-on-error: true`, since a critical *finding*
must never fail the workflow), then the real gates
(`validate:data`, `lint`, `build`, none of which are non-blocking —
if those fail, the workflow fails), then uploads `var/maintenance/` as a
30-day artifact regardless of outcome, then — only if `totalCritical > 0`
in the summary — opens or updates a single tracking issue titled "Weekly
maintenance: critical findings" via the default `GITHUB_TOKEN` (the
workflow declares `permissions: issues: write`). If your organization
restricts default token permissions repo-wide, that last step will fail
harmlessly (it has its own `continue-on-error: true`) rather than break
the run — enable "Read and write permissions" for Actions under repo
Settings → Actions → General if you want it to work. **The workflow never
edits product data, never commits, and never merges anything** — those
three constraints aren't just documented, there is no step in the file
capable of doing any of them.

## Notification configuration

See `docs/maintenance-notifications.md` for the full reference. Short
version: `lib/maintenance/notifications.ts` supports `none` (default),
`email-webhook`, `slack-webhook`, and `telegram-bot`, entirely via env
vars, disabled unless every required variable for the chosen provider is
set. Called once, at the very end of `npm run maintenance`, after every
report is already written — never during build/lint/validate/tests.

## Human approval workflow

1. Run `npm run maintenance` (locally or let the weekly GitHub Actions job
   do it).
2. Read `var/maintenance/latest-summary.md` or open `/internal/maintenance`.
3. For **link health**: manually verify a flagged URL is actually broken
   (not just temporarily down), then hand-edit the relevant
   `data/software/*.json` source and re-run `npm run validate:data`.
4. For **freshness**: treat low scores as a prioritization list for
   re-research, not a correctness bug list.
5. For **SEO integrity**: critical findings here are real bugs — fix the
   code, don't just re-run the agent.
6. For **recommendation regressions**: a failure means the engine's
   behavior changed. Decide whether the change was intentional; if so,
   update the fixture's assertions in
   `lib/maintenance/recommendation-fixtures.ts` (with a clear reason in
   the commit) — if not, that's a real bug to fix.
7. For **comparison opportunities**: manually add any worth publishing to
   `data/comparisons.ts` the same way Sprint 7's original 20 were chosen —
   deliberately, one at a time.
8. For **affiliate opportunities**: follow `docs/affiliate-applications.md`
   for confirmed-but-inactive Tier A programs; manually re-research
   `unknown` entries against official sources when time allows.

Nothing in steps 3-8 has an automated equivalent in this codebase — every
one is a manual edit followed by the existing `validate:data`/`lint`/`build`
gates and a normal, human-reviewed commit.

## Known limitations

- **Link checking is a snapshot.** A vendor site returning 403 to this
  bot's User-Agent (a few sites in this dataset do, e.g. bot-detection on
  pricing/help pages) reads as `client_error`, not necessarily "broken" —
  a human should open the URL in a real browser before editing data based
  on it.
- **Freshness is about documentation, not truth.** Repeated deliberately
  throughout this doc and the reports themselves, but worth restating: a
  100/100 entry can still contain an outdated fact.
- **The SEO agent's orphan-page check is a structural proxy**, not a full
  crawl — it verifies the known "link everything" code patterns are
  intact, not that every page is reachable via every possible path.
- **Comparison-candidate relevance is heuristic** (category match or
  direct-alternative relationship) — it will miss a genuinely relevant
  pair that happens to sit in different categories with no listed
  alternative relationship, and can suggest a technically-relevant pair
  that isn't actually high-value.
- **Regression fixtures cover 14 profiles**, not the full input space —
  they catch the regressions they're built to catch, not every possible
  one.
- **The GitHub Actions issue-creation step needs `issues: write`** to
  actually work; it's declared in the workflow but can still be blocked by
  an org-wide token-permission policy (documented above, fails safe).

## Adding a future agent

1. Add its report's data shape and any shared types to
   `types/maintenance.ts` if they're generic, or keep them local to the
   new script if they're agent-specific (see `FreshnessScore` in
   `scripts/maintenance/freshness.ts` for the local pattern).
2. Write `scripts/maintenance/<name>.ts` following the existing shape:
   an internal `run()` returning `{ summary, issues, data }`, an exported
   `executeXAgent()` that calls `runAgent("<name>", run, options)` then
   `writeReport(...)`, a `main()` that calls it and logs, and the
   `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`
   guard (`pathToFileURL` from `node:url`) so importing the module doesn't
   execute it. Compare real file URLs: a hand-built `file://${process.argv[1]}`
   string is false for checkout paths with spaces or non-ASCII characters, and
   the script would silently do nothing there.
3. Decide its severity-escalation policy: does a critical finding mean
   "the world changed" (leave `escalateCriticalToFailure` unset) or "our
   codebase is wrong" (set it to `true`)? See "Severity rules" above.
4. Add `"maintenance:<name>": "tsx scripts/maintenance/<name>.ts"` to
   `package.json`.
5. Import and call its `executeXAgent()` from `scripts/maintenance/run-all.ts`,
   alongside the existing six.
6. Add a section to `app/internal/maintenance/page.tsx` reading
   `readAgentReport<TData>("<name>")`, following the existing pattern —
   render `report.data`, never anything from `process.env` directly.
7. Document it in this file, in the same format as the six above.
