# CMS authority correction — production truth

Captured 2026-09-27 after production deployment `bc5560b`.

## Do not use the stale claim

Forbidden: “WordPress was the only sampled CMS documenting vendor-supported migration both into and out of the platform.”

That statement was superseded by the final source re-verification before deployment.

## Current production finding

- Sample: 8 CMS platforms.
- 7/8 have documented content input and output mechanisms in the reviewed vendor sources.
- 1/8 (Joomla) has a documented inbound finding but no general outbound workflow verified in the sources reviewed.
- These mechanisms are not equivalent to turnkey cross-CMS migration.
- Same-platform ZIP transfer, CSV export, JSON/API extraction and complete-site portability are different claims.

## Useful external story angles

1. CMS portability is not binary: seven vendors expose some way in and out, but the export artifact and migration burden differ substantially.
2. Hosted CMS export does not equal portable application export: content can leave while design, workflows, apps or version history do not.
3. Joomla is the evidence-gap case in this sample: inbound WordPress migration is documented, but this review did not verify a general outbound content-transfer workflow.
4. Buyers should ask what exactly leaves the platform: content rows, media, schema, workflows, design, history, or a runnable site.

## Production source of truth

- https://miloosh.com/research/cms-buying-decision-2026
- https://miloosh.com/api/research/cms-buying-decision-2026

All outreach must use the production wording above rather than the earlier Antigravity draft.
