# Miloosh dependency vulnerability recovery — 2026-10-08

Status: CRITICAL REMEDIATED LOCALLY; FULL NPM AUDIT STILL FAILS. BLOCKED FOR RELEASE.
Base checkout 80eb1e5, isolated branch codex/miloosh-security-gates-20261008. No push, merge, or deployment.

## Baseline
`npm audit --json` before modification: 11 advisories (1 critical, 9 high, 1 low). Affected included Next.js 16.3.5, eslint-config-next 16.3.2 and transitive dependencies.

## Separate changes
- Installed `next@16.4.0` and `eslint-config-next@16.4.0` as exact version updates within same major line. Changed package.json and package-lock.json only.
- `npm audit fix` (NO `--force`) applied available compatible transitive dependency updates. Its exit status remains 1, correctly reflecting unfixed advisories. No advisory exception, ignore flag, policy change, threshold change or force downgrade.

## Result
- Full `npm audit --json`: 5 HIGH, 0 CRITICAL, 0 moderate/low remaining. All remaining high advisories arise from ESLint toolchain: eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces. Registry `npm view braces version` returned 3.0.3; installed version is 3.0.3, and npm audit says `braces <=3.0.3` vulnerable, with no compatible fix available. `npm audit fix` suggests only a major-incompatible downgrade to eslint-config-next@14.2.35 using force, explicitly NOT performed.
- Production-only `npm audit --omit=dev --json`: 0 vulnerabilities. This distinguishes current runtime dependency exposure from dev-tool vulnerabilities but DOES NOT make the full gate pass, because release policy requires normal full audit.
- `npm run validate:data`, `npm run lint`, `npm run build`: all PASS in isolated security branch; Next.js 16.4.0 build succeeded. Full suite not certified green; unrelated baseline tests still failing in separate branch.

## Next engineering requirement
Wait for or evaluate a genuinely patched release of `braces` or a supported package-chain remediation that removes the vulnerable dependency without disabling lint. After fixing, run full standard audit, all tests, build, and protection checks; only then consider merging into approved release branch. The absence of production advisories is informational, not an authorization to waive full audit.

## Final registry and audit recheck (2026-10-08)
- npm registry latest `braces` reported 3.0.3, exactly the installed release currently in the advisory range; latest `micromatch` 4.0.8, `fast-glob` 3.3.3 and `eslint-config-next` 16.4.0. No supported fixed `braces` version could be established in the published registry in this run.
- `npm audit --json`: exit 1, FIVE HIGH issues (`braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`), no critical. Root of chain is unresolved advisory affecting braces. No forced downgrade or override applied.
- `npm audit --omit=dev --json`: exit 0, zero runtime dependency advisories. This is diagnostic only and is not a replacement for the full audit gate.
- Separate test-gates branch commit `7b07b04` passed 1899/1899 tests, lint, data validation, and build; changes not merged with this security branch because its full audit still fails.
- RELEASE REMAINS BLOCKED. Salesforce change still isolated/unpublished. Do not merge/push/deploy while full audit gate fails.
