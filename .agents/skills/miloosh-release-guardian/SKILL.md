---
name: miloosh-release-guardian
description: Decide, from recorded gate results, whether a Miloosh change may be released, and say exactly what is red and whether the change introduced it. Use before any deploy, merge or release request, when a gate fails, to compare gates with the base-commit baseline, to check the production lineage, or to confirm that protected, observed and in-flight pages are unaffected. Reports only; never waives, weakens, skips or bypasses a check and never deploys, pushes or merges.
metadata:
  author: miloosh
  version: "1"
---

# Miloosh Release & Quality Guardian

A pure verdict over facts that adapters read: `runGuardian` in
`lib/growth-agents/guardian.ts`, facts from `lib/growth-agents/guardian-sources.ts`.
The Guardian does not run a gate by itself, does not edit a gate and cannot waive
one. Its report always says `deploymentAllowedByGuardian: false`: a green verdict
means "the gates allow a release decision", and the release decision stays with
Eyal. Speak simple Hebrew with Eyal.

## Find the real gates first

Do not invent a gate name. Read `.github/workflows/ci.yml`, `package.json` and the
repository's instructions at the current commit. At the time of writing the CI
runs `npm ci`, `npm audit --audit-level=moderate`, `npm test`, `npm run
validate:data`, `npm run lint` and `npm run build`; there is no `release:check`
script. The Guardian adds `npx tsc --noEmit` as an explicit typecheck gate. If
the repository later defines a release script, use that and update this note.

## Verdict

| Verdict | Meaning |
| --- | --- |
| `RELEASE_ALLOWED` | Every required gate passed, the worktree is clean and nothing protected is affected. |
| `RELEASE_BLOCKED` | A gate failed, the tree is dirty, protected, observed or in-flight pages would change, or the commit would drop work an earlier production deployment shipped. |
| `NOT_VERIFIED` | No gate failed, but at least one required gate was not run. An unrun gate blocks exactly as a failed one. |

## What it checks

1. **Gates** (`audit`, `tests`, `validate-data`, `lint`, `typecheck`, `build`),
   each compared with the result recorded at the base commit: `INTRODUCED`,
   `PRE_EXISTING`, `IMPROVED`, `NO_CHANGE` or `UNKNOWN`. A pre-existing failure
   still blocks a release; it is just not blamed on the change under review.
   **Results count only for the commit they were produced for.** A recorded file
   must name the commit and say the checkout was clean (`growth:record-gates` reads
   both from git). Results with no commit, another commit or a dirty checkout are
   set aside: every gate is `NOT_RUN`, the verdict is `NOT_VERIFIED`, and the reason
   is reported. A baseline is used only if it was recorded at the `--base-sha`
   commit, otherwise every relation stays `UNKNOWN`.
2. **Git.** This worktree is clean; a verified base commit exists; other
   worktrees' unfinished work is listed and never read into, merged or deployed.
3. **Protection.** The pages a change would re-render (a software record fans out
   to its page and every comparison that uses it; shared templates fan out to
   many) are none of them protected, in an observation window or in flight.
4. **Rendered output** compared with the base build, when a comparison is supplied.
5. **Production lineage.** The deployment live now is identified, and the commit
   under review descends from every recent production SHA. Releasing a commit
   that is not a descendant would drop what an earlier deployment shipped.

## Run

Record the gates in a clean checkout of exactly the commit under review, and at the
base commit, then let the Director judge them:

```bash
git worktree add --detach /tmp/gates-base <base-sha> && (cd /tmp/gates-base && npm ci)
git worktree add --detach /tmp/gates-candidate <commit-under-review> && (cd /tmp/gates-candidate && npm ci)
npm run growth:record-gates -- --checkout /tmp/gates-base --out base-gates.json
npm run growth:record-gates -- --checkout /tmp/gates-candidate --out candidate-gates.json
npm run growth:director -- --gsc-dir <capture> --base-sha <base> --gates-file candidate-gates.json --baseline-file base-gates.json --check-production
```

`growth:record-gates` runs the repository's real commands (slow; writes `.next`,
gitignored) and reads the commit and cleanliness from git. `--run-gates` runs them in
the current checkout instead. Use a plain path: the repository's own entry-point
guards mis-detect paths with spaces or non-ASCII characters, which fails tests for
that reason alone. `--check-production` reads `vercel inspect miloosh.com` and the
GitHub Production deployment history; both are read-only.

## Hard rules

- Never weaken, remove, skip or bypass a check or a security check. Never lower a
  threshold, add a security exception, run `npm audit fix --force`, pass
  `--no-verify`, or redefine a failed gate as acceptable.
- If a gate fails, report the exact blocker (gate, command, failing identifiers,
  baseline relation) and leave deployment disabled.
- Never deploy, push, merge or promote. Never merge protected or in-flight work.
  Salesforce, Sprout Social and every other worktree stay untouched and are not
  deployed opportunistically.
- Compare against a baseline recorded at the base commit, not against memory.
  Failure identifiers (test names, advisory ids) are what separates "introduced"
  from "pre-existing".
- A passing gate says nothing about Google. Deployment is engineering
  completion, not a search result.

## Output to Eyal

The verdict, each red gate with its baseline relation, whether protected pages
are affected, whether production lineage is intact, and what is still
`NOT_VERIFIED`. State plainly that nothing was deployed.
