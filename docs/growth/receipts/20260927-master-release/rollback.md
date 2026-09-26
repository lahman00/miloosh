# Reversible production rollback

No deployment or promotion was performed in this task.

## Known live rollback target

- Deployment: dpl_3F95X1y4KARafdQ88oewqf8kYo23
- URL: https://flowtemplate-mwkxkm1a0-lahman001.vercel.app
- Source SHA: f5ed1b23035cbda81c222fb8b8bd24d3962a7b71
- READY production, canonical alias confirmed at 2026-09-26T21:51:51.235Z.

Re-read the canonical alias immediately before any future promotion. If another authorized release has shipped, record its deployment ID/SHA as the new rollback target instead of blindly restoring this older one.

## Triggers after an authorized release

Unexpected non-200 research routes; source/alias mismatch; private fields in JSON/CSV; broken canonical/schema; browser runtime failure; measurement regression; or newly introduced affiliate/social regressions.

## Procedure — not executed

Stop further promotion/indexing, preserve non-secret evidence and restore the last verified production deployment:

```sh
vercel rollback dpl_3F95X1y4KARafdQ88oewqf8kYo23 --scope lahman001 --yes
npm run verify:deployment -- f5ed1b23035cbda81c222fb8b8bd24d3962a7b71
```

Then verify canonical alias metadata and read-only public endpoints. The old baseline has no support benchmark/hub and returns 404 there; this is expected when restored.

No git reset, rebase, force-push, stash, branch deletion or source overwrite is necessary. Keep the release branch, evidence and concurrent worktrees intact. Rollback concerns the deployment alias, not authority records, Google state, partner relationships or social queues.
