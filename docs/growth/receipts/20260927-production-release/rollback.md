# Reversible production release

Current verified release: `dpl_93Q6K6A2bH4dvMWRDSq1v7xi3Fqu` / `a925c0e7e129c09c2ca38f5e352d8edbc4afb9ab`.

Prepared rollback: `dpl_3F95X1y4KARafdQ88oewqf8kYo23` / `f5ed1b23035cbda81c222fb8b8bd24d3962a7b71` / https://flowtemplate-mwkxkm1a0-lahman001.vercel.app.

Before rollback, independently resolve the current miloosh.com alias and confirm it still targets this release; stop if another operator promoted a newer release. Use the existing Vercel CLI account, never reset Git or rewrite remote history.

```sh
vercel rollback dpl_3F95X1y4KARafdQ88oewqf8kYo23 --scope lahman001 --yes
npm run verify:deployment -- f5ed1b23035cbda81c222fb8b8bd24d3962a7b71
```

Rollback only on a confirmed production regression. A missing analytics export, delayed Google indexing, pre-existing content-depth advisory, or removed external Reddit comment is not itself a rollback trigger. No rollback has been performed.
