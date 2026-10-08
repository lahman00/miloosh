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
