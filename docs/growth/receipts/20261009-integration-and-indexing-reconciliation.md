# Miloosh — 2026-10-09 Integration, Indexing Policy and Payout Readiness
Status: LOCAL INTEGRATION VERIFIED IN PROGRESS / RELEASE BLOCKED. No production, sitemap, partner, Google or payment changes were authorized or made by this task.

## Scope, source truth and protected work
- Canonical root (unchanged, dirty by pre-existing user work): `~/AI/1. פרוייקטים/Miloosh/01-Current/site`, checked-out base `80eb1e5`.
- New clean, isolated integration worktree: `../miloosh-integrated-20261009`, branch `codex/miloosh-integration-20261009`.
- Integrated the existing local Google Recovery/Director agents branch `claude/growth-agent-system-20261009` at `0d16f4c`; cherry-picked the already source-reconciled tests `7b07b04`, all three commits for 49+5 script entrypoint fixes (`c09583b`, `64ced34`, `5d65e41`), compatible Next.js dependency upgrades (`1a74420`) and dated security receipts (`aa0e010`, `37382ea`). Did NOT duplicate the narrower script guard repair commit `15447a3`, which is superseded by the broader guard work.
- Left original worktrees, pre-existing uncommitted work, Salesforce and Sprout Social improvements untouched. Neither page-owned commercial change was folded into this release candidate; both need observation and security gates before future release.
- Did not add new dependencies for agents, did not connect to third-party analytics providers.

## Google and search indexing policy: no bug requiring mass noindex
- 2026-10-06 commits `1d6746b` and `11ba877` exist in Git but are NOT ancestors of the current production base `80eb1e5`. They proposed more aggressive `noindex, follow` controls on a historical comparison cohort and selected software.
- The actual current source in `data/seo/gsc-sitemap-comparison-cohort.ts` explicitly says historically suppressed comparisons **remain published, internally linkable, canonical and indexable**, despite being omitted from the sitemap. That is a discovery-priority decision, not a robots directive.
- Google's own documentation: a sitemap is a discovery hint; omission does not automatically mean noindex. `noindex` is a stronger removal instruction that requires page-specific intent. Sources: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview and https://developers.google.com/search/docs/crawling-indexing/block-indexing (checked 2026-10-09).
- Current local sitemap snapshot under `80eb1e5`-compatible code: 692 entries, including 264 software and 347 comparison URLs. Catalog contains 354 software and 1,348 published comparisons. Exactly 90 software pages fail the current *sitemap-quality* admission test. The comparison suppression evidence file lists 804 historical URLs, with 8 explicit priority overrides. This is not equivalent to ordering 90+804 pages deindexed.
- Checked live example /software/discord: HTTP 200, self-canonical, absent from sitemap, no `noindex` tag, consistent with the policy. Current sitemap count live 692.
- Added automated tests under `tests/seo/sitemap-vs-noindex-policy.test.ts` for software `discord`, suppressed comparison `notion-vs-confluence`, and priority comparison `wix-vs-shopify`. Three tests passed. These protect the chosen policy and can only be changed with an explicit, evidence-backed indexing-policy review. No robots/sitemap/metadata code modified and no mass noindex operation performed.
- Do not restore 2026-10-06 blanket noindex changes without a separate per-page audit including protected experiments, historic zero-impression evidence, and owner authorization.

## Validation — combined candidate
- `npm ci`: passed with matching lockfile; remaining postinstall warnings do not authorize skipping future checks.
- `npm test -- --reporter=json`: 2,544 tests passed, zero failures before the three new sitemap-policy assertions; rerun final gates after last commit.
- `npm run validate:data`: 354 software / 27 categories / 1,348 comparisons valid; zero problems.
- `npm run lint` and `npx tsc --noEmit`: passed.
- `npm run build` on Next.js 16.4.0: passed.
- Full `npm audit --audit-level=moderate`: FAILED, 5 HIGH dev dependencies in eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces, no patched upstream `braces` known. Production-only `npm audit --omit=dev`: PASS, 0 advisories. These different scopes must not be conflated: the full gate is BLOCKED. No bypass or policy weakening.
- Existing `growth:rendered-diff` normalizer flagged 1,784 of 1,785 prerenders as different following the Next.js version bump. An independent HTML semantic comparison checked all 1,785 pages' **visible text, selected metadata, canonical URL, image alts and parsed JSON-LD**: only two visible-text differences; no metadata or JSON-LD differences. Homepage displays same catalog content with Matomo/Jasper order swapped; research/saas-pricing-pressure-index-2026 shows a new compilation/as-of date (2026-10-09 instead of 2026-10-08). No page source editing performed. Do not claim raw HTML is identical. Preserve homepage experiments; no homepage edits until source impact verified.
- Test result evidence: /tmp/miloosh-integrated-full-tests-20261009.json, /tmp/miloosh-integrated-audit-20261009.json, /tmp/miloosh-integrated-vs-base-20261009.json (local ephemeral files). Verified baseline branch receipts remain in their original worktrees.

## PartnerStack legacy account — USER ACTION PENDING
- First-party PartnerStack support email (2026-09-14, ticket #121396) states the personal/legacy PartnerStack account has **no connected payout provider** and **tax-registered location is missing**. Other original account has a connected PayPal provider. This is historical support evidence; current dashboard not independently accessible. Later unrequested status cannot be invented.
- Legacy account hosts four active referral relationships: ElevenLabs, monday.com, WhatConverts, Wrike. Never close, merge, unlink or rewrite tracking URLs. Network application status is distinct from payout readiness.
- Official guides checked 2026-10-09: https://support.partnerstack.com/hc/en-us/articles/360048158113-Managing-tax-information and https://support.partnerstack.com/hc/en-us/articles/360009377934-Managing-your-payout-providers .
- Owner must sign into the legacy account in PartnerStack, choose Commissions > Fill out tax info to withdraw or Team Settings > Commissions > Receipt details, enter own accurate tax-registered location and save, then Commissions > Setup withdrawals > supported provider; confirm email/identity in provider as requested. Agents must not invent or upload sensitive financial, tax or identity data.
- Tried read-only support follow-up by Gmail reply, and then tried saving it as a draft: both operations failed with connector errors. Searched Sent afterward; no matching outbound message was found. No email or payout change claimed. Owner may choose to use the existing support thread for verification.
- This action is to make already-earned future commissions collectible; it does NOT by itself bring new visitors, prove conversions or ensure commissions.

## Search metrics limitation
- GSC Wizard connector currently returned `payment_required` across summary, top pages, top queries and indexing tracker; no paid subscription purchased. The Director's last captured Search Console data end 2026-10-05 (39 property impressions / one click in 28 days); it is historical finalized evidence, not today's live refreshed number.
- Director can still run on the previously authenticated GSC export in read-only mode and mark missing current/revenue data as UNAVAILABLE/NOT_MEASURED.

## Release decision
Do not push, merge to production, deploy, resubmit sitemap, or submit indexing requests. Required full security gate is red. Preserve separated Salesforce and Sprout changes and protected experiments. After a supported upstream `braces` security fix and successful full gates, stage a clean release candidate and verify protected rendered pages prior to deployment.
