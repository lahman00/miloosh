# Deployment decision and exact next steps

## Decision

**NOT_DEPLOYED — awaiting explicit production promotion authorization.**

The mission permits deployment only if already explicitly authorized in the existing workflow. The current command-center/control-room workflow is local, Level 0 and read-only externally, with promotion assigned to a later release-owner decision. Vercel credentials work, but do not constitute approval. No GitHub push, Vercel deploy/promotion, environment mutation, Blob write, indexing request or production analytics write occurred.

The CLI dry-run file-plan check succeeded. It was a dry run, not a build upload or production deployment. No .vercel/project.json was created in this isolated worktree.

## Live baseline reconfirmed

Read-only metadata checked at **2026-09-26T21:51:51.235Z**:

- Project: flowtemplate
- Project ID: prj_qMLMDaP1jSepfNMw9cs7WhZk6KIf
- Scope: lahman001
- Node major: 24
- Deployment: dpl_3F95X1y4KARafdQ88oewqf8kYo23
- URL: https://flowtemplate-mwkxkm1a0-lahman001.vercel.app
- State/target: READY / production
- Created: 2026-09-25T19:25:29.179Z
- Source: f5ed1b23035cbda81c222fb8b8bd24d3962a7b71
- Canonical alias miloosh.com independently resolves to that exact deployment ID.

Metadata was filtered to non-secret fields before output; no environment values were printed.

Read-only production GETs at 2026-09-26T21:33:57.425Z:

| Path | HTTP |
| --- | --- |
| /research | 404 |
| /research/customer-support-pricing-2026 | 404 |
| /api/research/customer-support-pricing-2026 | 404 |
| /api/research/customer-support-pricing-2026/csv | 404 |
| /research/saas-pricing-pressure-index-2026 | 200 |

These are the unchanged old production baseline, not a failure of the passing local candidate. The new research asset cannot be indexed or claimed live yet.

## Ready-to-run staged path — NOT EXECUTED

Only after explicit release authorization, reconciling any newly committed Claude handoff and checking the rollback alias is still current:

```sh
cd /Users/eyalhaimovich/Desktop/Miloosh/01-Current/codex-miloosh-master-release-20260927
git status --short
git log -3 --oneline
git diff --check
taskReleaseSha=$(git rev-parse HEAD)
vercel deploy --prod --skip-domain --project prj_qMLMDaP1jSepfNMw9cs7WhZk6KIf --scope lahman001 --archive tgz --meta githubCommitSha="$taskReleaseSha" --meta releaseGitSha="$taskReleaseSha" --yes --non-interactive
```

The staged production build deliberately does NOT promote the public domain. Record the returned candidate deployment URL/ID. If application files changed after tested code 2c17975, rerun the full release runner and crawl before this step.

```sh
vercel inspect <candidate-deployment-url> --scope lahman001 --wait
vercel curl /research --deployment <candidate-deployment-url>
vercel curl /research/customer-support-pricing-2026 --deployment <candidate-deployment-url>
vercel curl /api/research/customer-support-pricing-2026 --deployment <candidate-deployment-url>
vercel curl /api/research/customer-support-pricing-2026/csv --deployment <candidate-deployment-url>
```

Verify exact candidate metadata, expected source SHA, canonical URLs, dataset shape, links and no runtime errors before promotion. Use the existing protected-deployment access mechanism if required; never weaken protection, expose tokens, or copy secret env files.

After staged verification and a final alias-race check:

```sh
vercel promote <candidate-deployment-id-or-url> --scope lahman001 --yes
npm run verify:deployment -- "$taskReleaseSha"
```

The existing deployment guard validates repo identity, exact expected source SHA, READY Production, canonical alias assignment, canonical HTTP 200 and a second alias read to detect concurrent promotion.

Then fetch all four new research endpoints and the existing asset from https://miloosh.com, inspect mobile/desktop with writes and merchant navigations blocked, and record deployment/source/time plus read-only runtime evidence. A local QA build is not proof that production secrets/config work.

## Indexing

New benchmark and hub: WAIT_DEPLOYMENT_VERIFICATION. Existing pricing asset: WAIT_REQUEST_HISTORY. No indexing request was sent. After successful live verification, inspect complete request history and remaining quota; submit at most one justified benchmark request if authorized and available. No speculative quota or retries.
