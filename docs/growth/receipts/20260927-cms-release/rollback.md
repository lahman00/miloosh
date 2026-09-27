# CMS release rollback

The independently verified pre-release production is `dpl_93Q6K6A2bH4dvMWRDSq1v7xi3Fqu`, source `a925c0e7e129c09c2ca38f5e352d8edbc4afb9ab`, URL `https://flowtemplate-f56v5bbjb-lahman001.vercel.app`.

Release flow: explicitly target existing `flowtemplate` in `lahman001`; stage with Production settings and `--skip-domain`; verify staged HTML and exports; recheck the canonical alias has not moved concurrently; only then promote. No environment pull, secret change, GitHub push or Blob write.

If this release causes a verified regression, first verify current alias identity, then use the existing reversible command:

```sh
vercel rollback https://flowtemplate-f56v5bbjb-lahman001.vercel.app --scope lahman001
npm run verify:deployment -- a925c0e7e129c09c2ca38f5e352d8edbc4afb9ab
```

Do not roll back over a newer operator deployment without reconciliation. Keep all local evidence and commits; no reset/rebase/stash. An accepted Google indexing request cannot be undone by rollback and must not be repeated.
