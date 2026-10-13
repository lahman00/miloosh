# Deployment write isolation

Status: local implementation and simulated tests only. No control record has
been created, no credentials or permissions changed, and this branch has not
been pushed or deployed.

## Runtime policy

`lib/deployment/mutation-policy.ts` permits mutations only when all of these hold:

1. Vercel runtime (`VERCEL=1`), `VERCEL_ENV=production`.
2. A valid platform `VERCEL_DEPLOYMENT_ID` is present.
3. A fresh, uncached private Blob read of `runtime/active-deployment.json`
   returns a valid record whose `activeDeploymentId` exactly matches this runtime.

The proposed record format is:

```json
{"schemaVersion":1,"activeDeploymentId":"dpl_EXACTAPPROVEDDEPLOYMENT"}
```

This example is documentation, not an activation command. Only an independently
verified deployment identity may be used. The application only reads the record;
there is no HTTP endpoint to create or change it. Missing identity, missing token,
missing/invalid record, another deployment, timeout or storage failure all deny
writes. There is no fallback to local files, implicit promotion or development
bypass. Existing credentials are reused after a separately approved rollout;
this feature needs no new secret and changes no access policy.

The control is an application safeguard against accidental side effects, not a
replacement for deployment protection or storage permissions. No positive policy
result is cached across operations. A read/check and a later external side effect
are not one transaction; changing ownership does not cancel work already in flight.

## Covered operations

- Public telemetry: analytics, outbound clicks, recommendation clicks, social
  landings; storage sinks also enforce the policy independently.
- Newsletter subscribe and GET unsubscribe, including direct lead-store calls.
  A read-only response never claims a subscription or preference was saved.
- All three existing cron routes. Inactive deployments return HTTP 409 before
  running a cycle, acquiring a claim, reconciling or changing any queue/report.
- Manual social publication **and GET reconciliation**, Make callbacks, queue
  writes, direct schedule/publish cycles and all six network-capable adapters.
- LinkedIn delivery claim creation, evidence updates and claim deletion; existing
  Buffer deduplication remains in place.
- SEO reports, experiments, baselines and claim creation/deletion.
- Shared affiliate-pipeline/network-status storage writes.
- Recommendation events emitted during page rendering, outside API routes.
- First-party and external analytics components mount only after an uncached
  `/api/runtime-mode` check allows them. No IDs or secrets are exposed there.

Pure reads such as Buffer target verification and GSC queries retain their
existing authentication. This does not claim they validate a release or authorize
mutations. Social library dry runs remain available with fixtures; candidate cron
URLs themselves are deliberately blocked. Local CLI mutations in this checkout
are also blocked; older operational checkouts are unaffected.

## Tests and local QA

Isolation integration tests use the **real** policy with mocked Blob and network
providers. They cover Preview and staged Production with valid auth and misleading
host/QA/live parameters, every mutating HTTP entry, direct storage/adapters,
unsubscribe GET, control failure, ownership changes, active writes and concurrent
Buffer deduplication. No test needs a real token or writes shared storage.

Existing unit suites use a test-runner-only active-policy fixture to continue
testing their existing behavior. This fixture is never included in runtime code;
the isolation suite explicitly un-mocks it. There is no NODE_ENV=test escape in
the production policy. Run the full suite, lint/typecheck, production build and
the existing held-page comparison (179 pages). Do not run real cron or publication
requests as smoke tests. Do not click live affiliate links while testing.

## Future activation — separate approval required

1. Review the final SHA. Confirm current production, aliases, cron ownership and
   all other callers of the old deployment's immutable URL. Preserve existing
   schedules; do not create another scheduler or replay a missed publication.
2. Resolve the platform question about when a staged Production deployment takes
   ownership of cron jobs. `--skip-domain` alone is not evidence that existing
   cron ownership remains unchanged. Until resolved, prefer an approved Preview
   for visual QA. Both Preview and an unlisted production candidate are read-only.
3. Approve a migration for **old code that lacks this guard**. Merely creating
   the new control record cannot restrict the old version. Either first introduce
   compatible guards into the serving version, or verify retirement of every old
   writer/caller and completion of in-flight work before enabling a new writer.
   Do not change credentials/access or disable existing jobs as an implicit step.
4. In a separately approved release window, verify the exact staged ID/source and
   canonical alias, drain old work, and explicitly assign the control record to
   the new deployment with an audited conditional update. Alias promotion alone
   leaves writes blocked. Do not enable the candidate before it owns production.
   There may be a short read-only interval; plan this outside scheduled runs.
5. Verify canonical identity, control ownership and the **same** existing cron
   schedules. Observe their next natural invocation; don't trigger another live
   publish. Keep receipts for alias, control version/ETag and deployment ID.

Rollback must coordinate the alias and the control record. A guarded deployment
with a different ID remains read-only; an unguarded old build ignores the control.
Neither rollback nor revocation reverses a published post or a previous write.

This change prevents an inactive candidate from publishing. It does not promise
exactly-once delivery from every provider: existing Buffer claims protect that
transport; Facebook and other pre-existing publishers have separate limitations.
Do not activate overlapping old/new writers or automatically retry an ambiguous
provider result. The old deployment migration remains a release blocker.

The independent CLI deployment verifier fix lives in another local branch; it
has not been overwritten or silently included here. Both branches started from
the already-previewed `754e6db7e0ae1cb4cbe019c62ad43b84580f3153`.

Local build compatibility: the existing outbound-click route exported a test-only
`__test__` object, which Next webpack route validation rejects. Its unchanged
normalization/destination helpers now live in `lib/revenue/outbound-route-policy.ts`;
tests import that module directly. No destinations, prices or tracking rules changed.

## Local validation receipt — 2026-10-13

- Policy + real-policy/mock-provider integration: 50/50 tests passed.
- Full suite: 2,832 passed and four initially failed out of 2,836. One consent
  banner placement regression was corrected without weakening the test. The
  three CLI/lint timing/IPC failures passed on an isolated permitted rerun
  (55/55). Follow-up layout, outbound and isolation tests passed (64/64), as did
  the other two helper-import regression suites (14/14).
- ESLint and TypeScript passed. Production webpack build generated 3,532 pages.
  Default Turbopack could not bind its local worker port in this execution
  environment; its build is not claimed as passed.
- Data validation: 354 software pages, 27 categories, 1,348 comparisons, no issues.
- Existing built-site audit completed all 22 checks, retaining its informational
  findings; this is not a claim that every existing content limitation is fixed.
- Strict held-page comparison: 179/179 unchanged, zero missing. Baseline was a
  local archive of `754e6db`, compiled with the same webpack version. Only the
  pre-existing test-only route export/import incompatibility was accommodated
  in that QA copy; no page content, metadata, data or policy was edited there.
  Comparing against the older Turbopack build instead changed only the generated
  Open Graph image cache keys, so no preservation rule was relaxed to pass QA.
- `data/`, `vercel.json`, workflows and the independent deployment verifier remain
  unchanged from this branch's base. No shared storage or external provider was
  mutated by this work.
