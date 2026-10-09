# Outreach ledger

A ledger is a JSON array of records, kept next to the receipt that created
them (for example `docs/growth/receipts/<run>/outreach-ledger.json`) and checked
with `validateOutreachLedger` / `npm run growth:outreach-check -- <file>`. It
records what the owner decided and what was verified, never what an agent hopes
will happen.

## Record

A new record starts as a draft. Optional fields are left out, not set to `null`.

```jsonc
{
  "id": "o-2026-10-09-01",
  "publisher": { "name": "Example Weekly", "domain": "example.com", "kind": "NEWSLETTER" },
  "assetUrl": "https://miloosh.com/compare/alpha-vs-beta",
  "angle": "Source-backed pricing differences for small teams",
  "status": "DRAFTED",
  "evidence": ["https://example.com/about"]            // at least one
}
```

Fields added as the record advances:

| Field | When | Meaning |
| --- | --- | --- |
| `ownerApprovalRef` | from `SENT` onward | where the owner's approval is recorded (message id, date) |
| `sentOn` | `SENT` | `YYYY-MM-DD` the owner sent it |
| `declinedOn` | `DECLINED` | `YYYY-MM-DD` of the explicit decline |
| `placement` | `PLACED` only | `{ "url", "verifiedOn", "rel" }` of the live page, checked by a person or a read-only fetch |

`publisher.kind`: `PUBLICATION`, `NEWSLETTER`, `COMMUNITY`, `DIRECTORY`,
`PARTNER_RESOURCE_PAGE`. `placement.rel`: `followed`, `nofollow`, `sponsored`,
`ugc`, `unknown`.

## Status changes

| From | May become |
| --- | --- |
| `DRAFTED` | `OWNER_APPROVED` |
| `OWNER_APPROVED` | `SENT`, `DRAFTED` |
| `SENT` | `REPLIED`, `NO_RESPONSE`, `DECLINED` |
| `REPLIED` | `PLACED`, `DECLINED`, `NO_RESPONSE` |
| `NO_RESPONSE` | `REPLIED` |
| `DECLINED`, `PLACED` | nothing (final) |

Only `OWNER_APPROVED` may become `SENT`, and only the owner sends.

## Invariants the validator enforces

- Any status at or beyond `SENT` has an owner approval reference.
- `SENT` has a send date; `DECLINED` has a decline date.
- `PLACED` has a verified placement on the publisher's own domain (`www` ignored).
  A placement on any other domain is not a placement.
- A placement is only recorded on a `PLACED` record.
- A publisher that declined is not asked again.
- Every record satisfies the schema (angle of at least 10 characters, at least one evidence item).
