# Run-book: `npm run growth:director`

Entry point: `scripts/growth/growth-director.ts`. Orchestration:
`lib/growth-agents/director-cli.ts` (every side effect arrives through an
injected `Ports` object, so tests prove the default run writes nothing).

## Options

| Option | Meaning |
| --- | --- |
| `--gsc-dir <dir>` | Search Console capture directory (`manifest.json` + tables). Required for a real run; without it the report is `NEEDS_DATA`. |
| `--gsc-private-dir <dir>` | Private tables kept outside git (search queries). A private table that is missing is a warning, not an error. |
| `--now <ISO timestamp>` | Report time. Pin it for a reproducible run. |
| `--base-sha <sha>` | Commit production was built from. Observation windows and in-flight work are measured against it. |
| `--release-date <YYYY-MM-DD>` | Date of the latest production release, used to test whether Google crawled anything since. |
| `--production-id`, `--production-created`, `--production-sha` | Owner-recorded production facts, when the platform is not queried. |
| `--extras-file <json>` | Per-page evidence an agent collected read-only (live response, query intent, vendor-confirmed gap). |
| `--events-file <json>` | First-party analytics events for the funnel. Without it the funnel is `UNAVAILABLE`, not zero. |
| `--gates-file <json>` | Recorded gate results. `--baseline-file <json>`: gate results at the base commit. |
| `--rendered-diff-file <json>` | Result of `growth:rendered-diff` for this change. Without it the Guardian's rendered-output check is `NOT_RUN`. |
| `--run-gates` | Run the repository's real gates (audit, tests, validate:data, lint, tsc, build). Slow; writes `.next` and `var/`. |
| `--check-production` | Read the live deployment (`vercel inspect`) and the GitHub Production deployment history. Read-only. |
| `--out <dir>` | Write `director-report.json`, `director-report.he.md`, `candidates.csv`. Without it nothing is written. |
| `--strict` | Exit 3 when required evidence is missing. |
| `--help` | Print usage. |

There is no option that deploys, pushes, merges, publishes, requests indexing,
sends a message or changes an account, and a test fails if one is added.

## Gate files

`--gates-file` is a JSON array of gate results; `--baseline-file` is
`{ "baseSha": "<sha>", "results": [ ...gate results at the base commit... ] }`.
A gate result is:

```jsonc
{ "gate": "tests", "command": "npx vitest run --reporter=json", "status": "PASS",   // "PASS" | "FAIL" | "NOT_RUN"
  "exitCode": 0, "summary": "1,899 passed, 0 failed", "failureIds": [], "ranAt": "2026-10-09T00:00:00Z" }
```

`gate` is one of `audit`, `tests`, `validate-data`, `lint`, `typecheck`, `build`.
`failureIds` are stable identifiers (test names, advisory ids): they are what tells
a failure the change introduced from one that was already there. A required gate
that is absent counts as `NOT_RUN`.

## Other commands

- `npm run growth:outreach-check -- <ledger.json>`: validates an outreach ledger
  (see the Authority & Distribution skill). Read-only. Exit 0 honest, 1 problems, 2 unreadable.
- `npm run growth:rendered-diff -- --base <dir> --candidate <dir> [--out <file>]`: compares the prerendered
  HTML of two Next.js builds (`.next/server/app` of each) after removing build noise (content-hashed asset
  names, framework script payloads, deployment markers, whitespace; JSON-LD is kept) and lists the pages that
  differ. Read-only; writes only with `--out`. Exit 0 every page identical and the same pages in both builds,
  1 otherwise, 2 invalid arguments. Feed its output to `growth:director --rendered-diff-file`.
- `npm run growth:page-check -- --urls <url,url,...> [--urls-file <file>] [--out <file>] [--now <ISO>] [--delay-ms <n>]`:
  reads Miloosh's own public pages with plain GET requests (at most 25, one at a time, one second apart by
  default) and prints, for each, the status, canonical, robots directives and the sponsored calls to action
  it renders. The output is the `--extras-file` input of `growth:director`. Only `miloosh.com` and
  `www.miloosh.com` are requested; a redirect to another host is recorded, not followed; links found in the
  HTML are parsed, never requested, and no affiliate URL is requested or recorded. Without `--out` it writes
  nothing. Exit 0 all pages read, 1 some page could not be read (recorded as `UNAVAILABLE`), 2 invalid arguments.

## Exit codes

`0` ran (a `NEEDS_DATA` report is still a valid answer unless `--strict`),
`2` invalid arguments, `3` `--strict` and required evidence missing.

## Outputs

- stdout: the Hebrew report, redacted (emails become `<email-redacted>`, every
  non-Miloosh URL becomes `<url-redacted>`; reports never contain an affiliate URL).
- `director-report.json`: schema-versioned (`GROWTH_AGENT_SCHEMA_VERSION`), the
  Director queue, shortlist, owner decisions, Google and affiliate reports and the
  Guardian report. At most 30 candidates; the count omitted is stated.
- `candidates.csv`: every evaluated page, one row each, so the whole ranking is auditable.

## Evidence the run cannot create by itself

- Search Console data: needs the owner's authenticated export or a read of the
  signed-in UI (see the Google Recovery skill's `gsc-capture.md`).
- URL Inspection (indexed version) for chosen URLs, exact-page checks, live
  response checks: collected read-only and passed in as sidecars or `--extras-file`.
- Conversions, approved commissions and received payouts: no source exists in
  the repository. They stay `NOT_MEASURED` until a network report or payout
  receipt is supplied.
- Keyword difficulty and Domain Rating: no source; any "low competition" claim
  is `NOT_VERIFIED`.

## Reproducing a run

```bash
npm run growth:director -- \
  --gsc-dir docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009 \
  --gsc-private-dir "$HOME/MilooshReceipts/20261009-growth-agent-system/gsc-ui-capture-20261009" \
  --base-sha 80eb1e5 --now 2026-10-09T01:00:00Z --release-date 2026-10-08 \
  --production-id dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn --production-created 2026-10-08T11:05:03Z
```

Add `--out docs/growth/receipts/20261009-growth-agent-system` to regenerate the
three report files. The private directory is optional; without it, query-level
evidence is `NOT_MEASURED`.

## Safety properties that tests enforce

- Default run writes no file and creates no directory.
- Gates run only with `--run-gates`; production is read only with `--check-production`.
- Pure modules import no filesystem, network, process or clock API; adapters
  issue only read-only git subcommands (`rev-parse`, `branch --show-current`,
  `status`, `diff`, `rev-list`, `log`, `worktree list`, `cat-file`, `merge-base`),
  always with `--no-optional-locks`.
- Gate commands are the repository's own and never carry a bypass flag.
