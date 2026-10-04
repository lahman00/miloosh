# Miloosh social cron authentication closeout — 2026-10-04

## Verdict

- Security correction: **VERIFIED LOCAL**.
- Release: **BLOCKED** by the unchanged mandatory dependency audit.
- Preview created: **false**.
- Production changed by this task: **false**.
- Production remediation: **NOT DEPLOYED**. Do not describe the live exposure as closed.

## Identity and scope

- Skills read and applied: `verification`, `agent-browser-verify` from the available Vercel plugin skills.
- Story: cron HTTP request → authentication → optional queue/provider work → private JSON response.
- Worktree: `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/qa-premium-20261004`.
- Branch: `fix/premium-qa-20261004`.
- Starting HEAD: `266b6828350eaf2a348730a535c42b598e4015c8` (clean when inspected).
- Source commit for this task: `f466b978b1f3ecaf4e891a999712e599f2878134`.
- Current production checked through Vercel: `dpl_6rFZURc7ygZEKSEUQw9eA9pobKrh`, source `8c476c16e40fe8be1c97567a8e855d5fd829b17b`.
- `AGENTS.md`, `CLAUDE.md`, `docs/growth/MILOOSH_GROWTH_OS_2026.md`, the preceding QA receipt and installed Next.js route-handler documentation were read before changes.

The initial 401 guards already existed in local commit `266b682`; they were not implemented a second time. This task independently validated them, strengthened response caching policy and expanded regression coverage. Other worktrees and the preceding visual/content QA changes were preserved.

## Confirmed production finding

At 2026-10-04 08:00:28 UTC, unauthenticated reads of both endpoints still returned HTTP 200 with `authenticated:false`, `dryRun:true` and operational metadata:

- `/api/cron/social-publish`: publish-attempt and stale-queue summary fields.
- `/api/cron/social-schedule`: approved/scheduled counts and scheduled-entry identifiers.

Only response keys and status were retained in `raw/production-observation.json`; the sensitive response bodies were not copied into this receipt.

The confirmed defect is unauthorized disclosure of operational metadata. Review of the deployed-lineage logic showed unauthenticated calls were forced into dry-run mode. Queue writes and provider publication are separately gated. No unauthorized live publication or persistent write was demonstrated. This is not a historical incident investigation or proof that no abuse has ever occurred.

## Local correction

The combined security-only patch from production now:

1. Returns HTTP 401 for missing/invalid credentials, including when `CRON_SECRET` is absent or empty, before queue or provider operations.
2. Does not accept a query-string token, spoofed cron headers or `dryRun` as authentication.
3. Adds `Cache-Control: private, no-store` and `Vary: Authorization` to all explicitly returned JSON responses of these two handlers, including 401 and provider-verification errors.
4. Preserves authenticated dry runs and authenticated scheduled execution.
5. Preserves the 13:00 America/New_York publication window, including the tested winter offset, and Buffer verification-only behavior.

Only three new source/test files changed in this task: the two route handlers and `tests/social/cron-auth-boundary.test.ts` (169 insertions, 7 deletions). No package, lockfile, gate, secret, schedule, partner, editorial content or SEO setting was changed in this task.

## Verification

| Check | Result | Evidence |
|---|---|---|
| New auth/cache boundary tests | 34 PASS | `raw/auth-tests-after.txt` |
| New tests plus existing cron-auth tests | 38 PASS in 3 files | `raw/auth-tests-after.txt` |
| Full unit suite | 2,651 PASS in 283 files | `raw/unit-tests.txt` |
| Built-server HTTP checks | 18/18 PASS | `raw/local-http-qa.json` |
| Unauthenticated GET / HEAD | 401, no queue metadata | same |
| Unsupported POST | 405, no queue metadata | same |
| Authenticated dry-run GET | 200, authenticated true, dryRun true | same |
| Local social queue before/after HTTP checks | ABSENT → ABSENT, unchanged | same |
| Desktop and mobile home smoke | loads, one H1, no overflow/error overlay | browser evidence |

The 38 focused tests are included in the full suite; they are not an additional 38 independent tests on top of 2,651. Authenticated live execution was tested using mocked queue/provider functions, not real social publication. Local HTTP used a synthetic test-only secret and a server bound to 127.0.0.1 with no production credentials. The server and the dedicated browser session were stopped after checks.

### Test failures retained, not hidden

- The new suite first failed all 34 tests because explicit private response headers were missing. `raw/auth-tests-before.txt` preserves that result; the implementation then passed the same tests.
- The first HTTP harness incorrectly read only the first `Vary` header and failed. A raw response showed TWO Vary fields: framework RSC values and Authorization. Corrected the harness to read all header fields while retaining the original assertions. No app or release-gate relaxation was required. See `raw/http-vary-observation.txt`.
- Receipt staging initially failed `git diff --check` on the literal blank context lines inside the stored unified patch. The byte-identical patch is now gzip-compressed; no whitespace rule or gate was weakened.
- Terminal text views have ANSI escapes/trailing whitespace removed for readability. Original bytes are retained as `.txt.gz` whenever normalization changed them.

## Gates and release blocker

| Command | Exit | Result |
|---|---:|---|
| `npm ci` | 0 | PASS |
| `git diff --check` | 0 | PASS |
| `npm test` | 0 | PASS |
| `npm run test:static-gate` | 0 | PASS |
| `npm run validate:data` | 0 | PASS |
| `npm run lint` | 0 | PASS |
| `./node_modules/.bin/tsc --noEmit` | 0 | PASS |
| `npm audit --audit-level=high` | 1 | FAIL: 5 high findings in the braces dependency chain |
| `npm run build` | 0 | PASS, local build only |
| `npm run verify:static` | 0 | PASS |
| `npm run release:check` | 1 | FAIL at the mandatory audit, as required |

`raw/gates.json` and `raw/release-check-result.json` contain exact command arguments, times and exits. Canonical `release:check` finished at 2026-10-04 08:06:55 UTC with exit 1. Build/static verification were separately executed for local validation, not to bypass the release gate.

Fresh registry observation: `npm view braces dist-tags --json` returned latest `3.0.3`. Audit again reported `GHSA-vfj7-8cjw-p6xm`. No force, downgrade, alias substitution, advisory suppression or policy exception was used. This task did not repeat the entire earlier upstream alternatives investigation.

## Security-only handoff

`raw/security-only-vs-production.patch.gz` contains (gunzip to use) only the two route handlers and three cron-auth test files, including the earlier local 401 correction. It excludes the unrelated visual, accessibility, guide and metadata changes from the QA branch.

- Base: production source `8c476c1`.
- Patch SHA-256: `6c2103591a917e679c0e76c98db31dd931bec9fcd81c9b98f4a843f380b19198`.
- Applied in a disposable copy of the five production files: check exit 0, apply exit 0; all five resulting files exactly match the validated local versions.
- This proves patch applicability, not full release approval of a separately assembled security-only build. Such a candidate still needs its own complete gates and preview QA.

## Production and remaining work

The application production deployment was not changed. A read-only Vercel firewall configuration lookup returned 404/config not found; no firewall, authentication setting or schedule was modified.

Once the mandatory audit can pass under the existing policy: assemble the intended candidate from the then-current production identity, rerun the full gates, verify the exact preview artifact, publish through the approved workflow and repeat unauthenticated 401 checks on production. Do not invoke authenticated live social publication as a QA test.

Until that release happens, the correct status remains: local security fix verified; live remediation pending.

## Business results

No partner click, lead, conversion, commission, payout, indexing request, email delivery or social publication was generated or claimed. This task measures engineering behavior only.

## Reference

Vercel official cron authentication guidance: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs (consulted during this task). The repository additionally requires fail-closed behavior when the secret is not configured.
