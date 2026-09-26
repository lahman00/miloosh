# QA — Google Crawl + Index + Rank War Phase III (2026-09-26)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Clean, 0 errors |
| `npx vitest run` (full suite) | 246 files / 2138 tests passed (2131 + 7 new lane-invariant tests) |
| `npm run lint` | Clean |
| `npm run build` | Production build succeeds |
| `npm run growth:google-war` | 1782 nodes, 79034 edges, 0 true orphans, 0 quality regressions, 0 intent conflicts. Indexation coverage: 1225/1736 rows now have a real state (up from 31/1736). |

No browser/UI QA was needed this phase — no page templates or rendered
content changed, only the evidence-ingestion pipeline and the internal
dashboard/tooling.

## Data-quality notes

- The 1209 newly-added observations are honestly labeled as bulk
  Pages-report captures, distinct in their `source` field from individual
  URL Inspection results, per this codebase's own evidence-provenance
  discipline.
- `appendObservations()`'s append-only, conflict-detecting semantics
  (already existing in `lib/google-war/evidence.ts`) were relied on as-is;
  no history-rewriting or overwriting occurred. The dedup pass before
  merging checked for `(url, checkedAt, source)` triples against the
  existing 31 records — zero collisions, confirming this session's capture
  covers new ground rather than re-observing the same 31 URLs.
- `inspectionDeltas()` correctly surfaced 10 real state transitions once
  the new data was merged in (8 CRAWLED_NOT_INDEXED → INDEXED, and 2
  CRAWLED_NOT_INDEXED → DISCOVERED_NOT_INDEXED — the latter a real,
  slightly counter-intuitive "regression" direction worth tracking, not
  filtered out or explained away).
