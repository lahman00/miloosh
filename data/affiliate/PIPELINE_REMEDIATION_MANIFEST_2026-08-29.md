# Pipeline staleness remediation manifest — 2026-08-29

Prepare-only, per the MILOOSH — PREPARE FINAL LOCAL RELEASE CANDIDATE
mission. **No write was made to any pipeline store.** This document
records exactly what a future, explicitly-authorized remediation pass
should change, so it can be executed as one reviewed operation rather
than improvised at the time.

## Why this can't be fixed by editing a file in this repo

`lib/revenue/affiliate-pipeline.ts`'s `AffiliatePipelineEntry` is
runtime state, not static data: its primary store is a private Vercel
Blob object (`affiliate-pipeline/state.json` in the `miloosh-affiliate`
store), read by the live `/internal/affiliate-pipeline` dashboard. A
real `BLOB_READ_WRITE_TOKEN` is configured in this environment's
`.env.local`, so any script that calls the pipeline's write path would
mutate that live, shared store immediately — not a local git diff.
That's categorically different from every other file this sprint has
touched, and out of scope for a "prepare only" pass.

**Additional finding, not previously known**: the local gitignored
fallback file (`var/agents/affiliate-pipeline.json`, used only when no
blob token is present) is *itself* stale relative to what
`npm run affiliate:audit` reports live — it already shows `hubspot` and
`n8n` as `"rejected"` (matching current truth), while the live-read
audit still reports both as `"submitted"`. The local file is also
missing a `help-scout` entry entirely (20 entries locally vs. what the
live store evidently has). This means the local file is not a reliable
proxy for "current live pipeline state" at all — the two data sources
have diverged. Whatever process seeded/updated the blob store did not
write through to this local fallback, or vice versa. **Flagged as a
separate, real inconsistency worth the owner's attention independent of
the 9 remediations below.**

## The 9 remediations

For every row: `history` is append-only and must never be rewritten —
only a new entry added. All 9 are classified **A) genuine operational
staleness** (current-truth evidence already exists locally for all 9;
none require the owner to supply anything new; none are historically
correct, since `.status` is documented as current-state, not a
historical marker).

| Slug | Stale `.status` (live, per `affiliate:audit`) | Correct status | Evidence already on file | Fields to mutate | Deterministic? |
|---|---|---|---|---|---|
| `pipedrive` | `pending_review` | `activated` (or `earning`) | `active-partners.ts`: `affiliateUrl: "https://aff.trypipedrive.com/ajtcgyu06e7i"` | `status`, `approvedAt`, `affiliateUrl`, `trackingId` | Yes |
| `todoist` | `submitted` | `activated` | `active-partners.ts`: `affiliateUrl: "https://get.todoist.io/dobo71f2y038"` | `status`, `approvedAt`, `affiliateUrl`, `trackingId` | Yes |
| `getresponse` | `submitted` | `activated` | `active-partners.ts`: `affiliateUrl: "https://try.getresponsetoday.com/5op8zmw94gq1"` | `status`, `approvedAt`, `affiliateUrl`, `trackingId` | Yes |
| `constant-contact` | `needs_owner_action` | `activated` | `active-partners.ts`: `affiliateUrl: "https://join.constantcontact.com/ezj6pum5ei2l"` | `status`, `ownerActionRequired` (clear to null), `approvedAt`, `affiliateUrl`, `trackingId` | Yes |
| `close` | `pending_review` | `activated` | `active-partners.ts`: `affiliateUrl: "https://refer.close.com/0alqdg4so8rm"` | `status`, `approvedAt`, `affiliateUrl`, `trackingId` | Yes |
| `clickup` | `pending_review` | `rejected` | `canonical-ledger.ts` `clickup`: REJECTED, "First-party PartnerStack email dated 2026-08-21: After careful consideration, ClickUp has declined your application" | `status`, `ownerActionRequired`, `rejectedAt` | Yes |
| `n8n` | `submitted` | `rejected` | `canonical-ledger.ts` `n8n`: REJECTED, `docs/affiliate-applications.md` vendor rejection log | `status`, `ownerActionRequired`, `rejectedAt` | Yes |
| `hubspot` | `submitted` | `rejected` | `canonical-ledger.ts` `hubspot`: REJECTED, `docs/affiliate-applications.md` vendor rejection log | `status`, `ownerActionRequired`, `rejectedAt` | Yes |
| `help-scout` | `pending_review` | `rejected` | `canonical-ledger.ts` `help-scout`: REJECTED, "First-party PartnerStack decline email received 2026-08-24" | `status`, `ownerActionRequired`, `rejectedAt` (note: this slug is entirely absent from the local fallback file -- would need to be added there too, or the fallback file abandoned as unreliable) | Yes |

## What "execute later" should look like

1. Confirm `BLOB_READ_WRITE_TOKEN` genuinely points at the intended
   `miloosh-affiliate` store (not a stale/wrong credential) before
   writing anything.
2. For the 5 `activated` rows: set `status: "activated"`,
   `affiliateUrl`/`trackingId` from `active-partners.ts` (already
   verified real, live URLs), `approvedAt` to a real date if one is
   known or leave the existing value if already set, append one
   `history` entry (`{ status: "activated", at: <now>, note:
   "Reconciled to canonical active-partners.ts truth, <date>" }`).
3. For the 4 `rejected` rows: set `status: "rejected"`,
   `ownerActionRequired` to a short reason, `rejectedAt` to a real date
   if known, append one `history` entry citing the same real evidence
   already in `canonical-ledger.ts`.
4. Do not touch any other pipeline entry. Do not touch `submittedAt`
   retroactively -- it's already correct on all 9.
5. Re-run `npm run affiliate:audit` immediately after and confirm the
   `pipeline-current-truth-conflict` count drops from 9 to 0, and that
   `help-scout` is now present in whichever store is authoritative.
