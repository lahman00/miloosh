# Measurement baseline, revalidated 2026-10-20 (live, read-only)

Method: `MILOOSH_ENV_DIR=<production-authorized env> npm run growth:daily-report -- --live --days N`. It lists and reads private Blob storage (no writes, no partner URL opened). Reads were COMPLETE: first-party store 4,100 records, 0 failed; outbound ledger 25 objects, 0 failed. `captureIntegrity` stays NOT_VERIFIED: a complete read does not prove every visit was captured.

## Correction to the baseline in circulation (975 events, 2 strict sessions)
That figure came from scanning only date-partitioned paths (`first-party-analytics/<date>/`). The store also holds **840 events under `first-party-analytics/id/…`** (uploaded 2026-09-27 to 2026-10-06, 321 sessions, 394 marked test, 388 with a QA run id). None duplicates a dated event (checked by type, timestamp and session across the whole store; 0 overlaps) and none shares a session with a dated event. The current writer only writes dated paths; the `id/` objects come from a writer used in that earlier period. They are real stored events and belong in the 30-day window.

| Window (UTC) | Events | Strict / probable / excluded sessions | Commercial-page sessions (strict / probable) | CTA impression events | CTA click events | First-party affiliate hand-offs | Ledger (stored / test / non-test) |
|---|---|---|---|---|---|---|---|
| Last 30 days to 2026-10-20 21:06 | 1,800 | 6 / 128 / 484 | 6 / 85 | 156 | 1 | 1 | 5 / 4 / 1 |
| Previous 30 days | 2,217 | 51 / 166 / 458 | 49 / 80 | 238 | 0 | 12 | 16 / 7 / 9 |
| Last 7 days to 2026-10-20 21:01 | 394 | 0 / 31 / 88 | 0 / 30 | 53 | 0 | 0 | 0 / 0 / 0 |
| Previous 7 days | 306 | 0 / 23 / 72 | 0 / 14 | 29 | 0 | 0 | 2 / 2 / 0 |

- Qualified traffic fell sharply: 51 strict sessions in the previous 30 days (39 from social) against 6 now, and none in the last 7 days.
- The 6 strict sessions: `/best-ecommerce-platform-for-small-business` (social, 2), `/compare/miro-vs-marvel` (social, 2), `/` (direct, 1, with a CTA click and the one affiliate hand-off, Wix), `/software/brevo` (social, 1).
- The one non-test ledger affiliate click (Wix) and the one first-party affiliate hand-off in a strict-qualified session are probably the same click recorded by two stores (inference). They are not added.
- Production outbound tracking is enabled (owner-verified in Vercel); the local env being off is irrelevant to these reads.
- **Not measured:** partner-network clicks, leads, conversions, approved and paid commissions (no export supplied); current Search Console and GA4 data (the capture is from 2026-10-09); Core Web Vitals; keyword volume and difficulty.
- Test-marked traffic is excluded from every rate; no classification threshold was touched.
