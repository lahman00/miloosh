# Next safe operations

1. Let the quiet daily watch inspect both research URLs again; record a genuinely new crawl or indexation and preserve its source/timezone. **Do not request indexing again.**
2. The current operations branch passed all 14 normal release gates, including 2,347 tests. Preserve those defaults. Any future integration needs a fresh normal release check against its own candidate artifact; this result does not cover Claude's unmerged code. Do not deploy automatically.
3. The latest prepared candidate is `61eee274c25749645d262c44cc785f2fefe8c431` (clean checkout at inspection). Its new 21-file CMS research commit has no protected product edits, but cumulative branch intake inherits five protected product changes from `0a1e3e9`. Reconcile those against the experiment protocol before any whole-branch integration, or independently review the research-only delta. Never silently unlock the 196 protected URLs. This task does not authorize deployment.
4. Review Freshservice→Freshdesk and Umbraco-vs-WordPress→profile mismatches with the content owner, using the raw query rows. This receipt grants no rewrite, canonical or cohort-change permission.
5. Keep CSV download/JSON consumption as UNKNOWN until a separately scoped event instrumentation change is implemented and verified. Do not infer usage from this task's HTTP checks.

## Reproduce the private evidence report

Run from the `codex-miloosh-master-release-20260927` worktree. These commands write only local ignored report stores; they do not submit, publish or deploy.

```sh
npx tsx scripts/growth/import-query-page.ts
npx tsx scripts/growth/import-query-page.ts --input-ui data/growth/authority/query-ui-20260927.json
npm run growth:brand-demand -- --input data/growth/authority/brand-20260927.json
npm run growth:authority-ingest -- --input data/growth/authority/reddit-public-20260927.json
npx tsx scripts/growth/operations-live-check.ts --read-only
npm run growth:morning-google
```

The report is an offline composition, not proof that a new external check ran. Input overrides: `--research-inspections`, `--outreach`, `--events`; retain source/observation timestamps. Complete raw event exports live only under ignored `var/`, mode 0600. Never commit them. Do not pull or print credentials to generate a report.

The thin `scripts/growth/capture-operations-events.ts --read-only` adapter requires an **already-authorized** `BLOB_READ_WRITE_TOKEN` in process memory. It reuses the existing paginated fail-closed reader, persists a private COMPLETE export only on success, and prints aggregate metadata only. It never loads credentials itself and never writes Blob. This run used only that variable from the existing canonical site's local configuration; no environment file was modified.

```sh
npx tsx scripts/growth/protected-precheck.ts --candidate <verified-commit-sha>
npm run growth:release-google
```

These are checks, not deploy commands. A protected candidate or failed test blocks the normal release check. The file guard is not an OS lock or a complete dependency graph: shared changes still require rendered-artifact review. Full crawl evidence must match the candidate being considered; the successful crawl here describes current production, not Claude's unmerged candidate.

## Continuing watch

App heartbeat `miloosh-google-operations-watch`: daily 10:00, local app timezone Asia/Jerusalem. It reads bounded production/GSC/Gmail/first-party evidence when existing access is available, preserves unknowns, updates local reports and deduplicates notifications. No sending, indexing, social action, merchant navigation, publishing, pushing or deploying.
