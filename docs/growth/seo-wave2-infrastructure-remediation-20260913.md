# Separate infrastructure remediation — not part of the Wave 2 content change

Observed with `npm audit --omit=dev --json` on the unchanged production lockfile, September 12 UTC / September 13 Israel. Two vulnerable dependency groups: Next.js **critical**, Sharp **high**. No dependency was upgraded in the editorial release. This is a tracked operational risk, not a security-green verdict or a waiver.

| Dependency | Evidence | Required isolated follow-up |
| --- | --- | --- |
| Next.js 16.3.2 | [Windows-hosted RCE advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36), affected 16.0.0–16.3.2; [AVIF image-optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), same reported range | Validate deployment applicability; update to a current compatible patched version in a separate branch. The audit reported 16.3.5 as available and 16.3.3 as outside the affected range. Do not treat the Windows-specific advisory as proof of a Windows Vercel runtime; the separate image advisory still needs review. |
| Sharp below 0.35.4 | [libheif-related advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | Resolve a supported patched dependency tree with the Next.js update, then verify image optimization, OG generation and production architecture. |

Reproduction and acceptance: audit the locked production tree; inspect the official advisory conditions; upgrade only the required compatible packages; run TypeScript, lint, full tests, build, image/OG route checks and production smoke tests. Do not use `npm audit fix --force`, mix the patch into editorial work, or claim remediation from merely changing a version string. Keep a rollback-ready application artifact.

Other pre-existing maintenance findings: homepage links directly to 72 of 354 products (282 are not directly linked from the homepage; not proof they are orphaned), and nine products have no incoming alternatives/comparison references in the narrow link report. The SEO maintenance checker flags the homepage coverage policy; it is not dismissed solely as a variable-name mismatch. Affiliate audit has 101 local findings: 85 stale research, one aggregate coverage gap, nine orphan research entries and six overdue follow-ups. None is altered by this six-guide release.
