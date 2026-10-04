# Miloosh braces release blocker — removed by a verified local lint adapter

Date: 2026-10-04. Verdict: **RELEASE_BLOCKER_RESOLVED_LOCAL**.

## Identity and scope

- Worktree: `/Users/eyalhaimovich/Desktop/Miloosh/01-Current/dependency-braces-removal-20261004`
- Branch: `fix/braces-free-lint-20261004`
- Starting commit: `235e2a3225c493ef58fb6c57382057c95e5270b8` (the clean, unreleased premium QA/security branch).
- Dependency/tooling commit: `9a0733ef043b78fd55ce8e314db1ba7d366207fb`.
- This branch inherits the existing QA/security fixes; this task introduced no changes to app/, components/, data/, lib/, proxy.ts or next.config.ts.
- No push, preview, production deployment, indexing request, social publication, affiliate navigation, or remote queue write was performed.
- Production identity was not refreshed during this dependency task. Previous production information is not presented as a fresh observation.
- The source commit is separately applicable; it does not implement MkDocs, Docker, MuleSoft or any new page.

## Skills actually read and applied

`systematic-debugging` and `verification-before-completion` were read from their actual local skill files under `~/.claude/skills/superpowers/skills/`. Vercel `verification` and `agent-browser-verify` were read from their available plugin resources. No claim of running an unavailable Miloosh growth skill is made.

Story: install the complete development dependency tree, retain the existing ESLint/Next checks, and pass the unchanged release workflow without installing vulnerable braces code.

## Reproduced cause

The original dependency tree returned audit exit 1: five high findings from GHSA-vfj7-8cjw-p6xm through `eslint-config-next@16.3.8 -> @next/eslint-plugin-next@16.3.8 -> fast-glob@3.3.1 -> micromatch@4.0.8 -> braces@3.0.3`.

Fresh registry reads still returned braces 3.0.3 and the vulnerable chain in stable Next's plugin and canary 16.4.0-canary.59. This change is **not** a patched braces release or an upstream-approved Next fix. It is a repository-owned, narrowly scoped replacement and compatibility layer.

## Implemented replacement

1. Exact nested override in package.json: `@next/eslint-plugin-next@16.3.8` resolves its `fast-glob` dependency to the official published `glob@13.0.6` package.
2. Direct development dependency `picomatch@4.0.4` preserves the original matcher family's negative-extglob behavior.
3. `scripts/tooling/next-lint-glob-compat.mjs` adapts only `globSync(nonemptyString, { onlyDirectories: true })`, the Next plugin's observed call contract.
4. eslint.config.mjs installs the compatibility boundary before dynamically importing the unchanged official Next core-web-vitals and TypeScript configurations.

The adapter maps directory-only discovery, symlinks, absolute paths, trailing globstars and negative extglobs. It changes the resolved module's in-memory exports in the lint process; **vendor files on disk and all 22 Next rule implementations are unchanged**. It is not a general fast-glob API implementation.

Exact package-version guards, an already-loaded-plugin guard and unsupported-call guards stop lint rather than silently skipping checks when the reviewed contract changes. This local integration has a maintenance obligation: review/remove it before upgrading the pinned plugin.

The vulnerable braces and micromatch packages are absent from both the installed tree and lockfile. The remaining package named `brace-expansion` is a different published dependency of glob/minimatch; it was not renamed from braces. The final audit reports zero findings across the complete tree.

## Rejected candidates and reference discipline

- Bare tinyglobby alias: audit passed, but only 31/75 directory cases matched the original consumer results. Rejected.
- tinyglobby with an explicit adapter: 68/75; symlink root and absolute-working-directory differences remained. Rejected.
- Initial glob adapter: 74/75; negative extglob excluded a hidden directory that the original matcher included. Corrected using published picomatch, not by deleting the failing fixture.
- Final glob adapter: **75/75** original root cases matched.

Original outputs were captured from the untouched QA worktree's actual Next plugin and fast-glob. Reference capture refuses to overwrite existing expectations or capture from the candidate tree. Raw failed candidate outputs are retained separately from passing outputs.

Directory equivalence compares resolved root paths and preserves duplicates, but ignores traversal order and redundant `./`/trailing separators. The Next consumer joins these roots with app/pages and unions route matches. This is bounded consumer-level evidence, not universal library equivalence. Windows was not executed; tests and full build ran on macOS with Node v24.18.0 and npm 11.16.0.

## Verification evidence

| Check | Observed result |
|---|---|
| Original complete-tree npm audit | exit 1, five high findings |
| Fresh npm ci after the fix | exit 0 |
| Native `npm run release:check`, unchanged | **exit 0** |
| Full unit suite within that chain | **284 files, 2,657 tests passed** |
| Directory-discovery reference cases | **75/75 matched** |
| Effective ESLint config comparison | **6 file contexts identical** |
| Next recommended rule coverage | **22 active rules, 22 source files hash-identical** |
| Real negative lint probes | Same diagnostics for internal anchors, async client components, and image/alt violations |
| Static gate, data validation, lint, TypeScript | exit 0 in the canonical chain |
| Production build | exit 0; 3,542 generated static outputs, including non-document resources |
| Static artifact verifier | 1,786 public HTML artifacts, 93,988 internal-link checks, failures [] |
| Sitemap inventory | 988 URLs; unchanged by this task |
| `npm audit --json` | **exit 0; zero vulnerabilities at every severity** |
| `npm audit --audit-level=moderate` (CI threshold) | **exit 0** |
| `npm ls --all --json` | exit 0; no invalid or missing dependency tree |

The first complete canonical gate ran from `2026-10-04T08:47:13.485144Z` to `2026-10-04T08:49:18.110234Z`. Exact command records are in raw/verification-results.json. Six new Vitest tests include the 75-case subprocess check; those cases are not added again to the 2,657 unit-test count.

No threshold, CI workflow, audit configuration, ignore/waiver file or release command was weakened. No `--force`, `--legacy-peer-deps`, omit-dev release gate, downgrade, fork or unpublished dependency was used for this fix.

## Runtime and browser checks

All **98 non-dev lockfile records are byte-for-byte unchanged**. Next stays 16.3.8; ESLint stays 9.39.5. App/content/SEO/affiliate files are unchanged relative to the starting QA commit. See raw/runtime-scope.json.

A compiled build was served only on 127.0.0.1:3118 with no inherited production credentials. Chromium checked desktop 1440x1000 and mobile 375x812: meaningful homepage content, one H1, no horizontal overflow, no framework error overlay, and no reported page errors. Screenshots were visually inspected. The inherited social cron auth fixes both returned 401 with only the Unauthorized response. No authenticated publication request was made. The dedicated browser and server were stopped afterward.

These checks are a targeted smoke, not a repeat of the full-site visual audit. No Safari or Firefox test was performed in this task.

## Artifacts

- raw/verification-results.json: native gate commands, exact exit codes and times.
- raw/canonical-release-check.txt and its gzip original: full native gate output.
- raw/audit-final.txt and raw/audit-ci-moderate.txt: fresh zero-finding audits.
- raw/runtime-scope.json: runtime dependency and source invariants.
- tests/fixtures/next-lint-*.json: captured original configuration and directory expectations.
- raw/coverage-candidate.txt: preserved configs, rule hashes and negative diagnostics.
- raw/roots-glob-adapted-v2.json: final 75/75 root comparison.
- raw/browser-and-http.json and homepage screenshots: compiled local smoke evidence.
- raw/dependency-fix.patch.gz: exact dependency/tooling patch from the starting QA commit.

Uncompressed patch SHA-256: `8cac573adf027ce2babe4a3077d8a8e999214f72ad2097589e097e485e662d8d`.

## Release handoff

The dependency blocker is resolved **for this verified local branch**, which also contains the earlier QA/security fixes. Unmodified worktrees retain their original lockfiles and do not become audit-clean automatically. Integrate the source commit without overwriting unrelated work, rerun the same native gates on the exact intended release head, then create and verify preview before any production promotion.

MkDocs remains a separate, unreleased content change. Its branch needs the dependency change integrated and its own gates/preview rerun; this receipt is not evidence that MkDocs is live.

For a future official plugin release that removes the vulnerable path, remove this override and adapter only after its own source/config checks and complete release gate pass. Do not silently adjust the adapter's pinned-version guard.

Business outcomes: not measured. The outcome here is a reproducible green engineering release gate, not traffic, attribution, a conversion or revenue.

## Exact-source final confirmation

The unchanged canonical `npm run release:check` was rerun on source commit `9a0733ef043b78fd55ce8e314db1ba7d366207fb` with this receipt present: **exit 0**, 284 files / 2,657 tests passed, zero audit findings, build and static verification passed. Run: `2026-10-04T08:55:27.461849Z` through `2026-10-04T08:57:18.165052Z`; see raw/release-exact-source.json and its full log.

A subsequent staged documentation whitespace check flagged two captured text logs for extra blank lines at EOF. Only those text views were normalized; original output bytes remain in gzip files. No code, expected fixture, gate or result was changed.
