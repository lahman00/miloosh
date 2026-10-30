# Switching Lab — buyer-run trials (2026-10-30)

## Purpose and release scope

The Switching Lab is an **extension of the existing Decision Room**, not a second ranking or pricing system. Its route is `/decision-room/switching-lab`. It is linked only from `/decision-room`, is intentionally `noindex,follow`, is not placed in the sitemap, and has its own canonical URL. It does not modify the global design, Buyer's Desk, software/comparison/category/guide templates, product records, prices, SEO pages, experiments, affiliate destinations, or analytics. No new dependencies, cloud storage or accounts.

## Buyer workflow

1. Save products in the Decision Room. The Lab reads up to four from `RoomState.compare`, or `saved` if none are compared. An existing BuyerDesk import remains available through the Decision Room's own compatibility logic.
2. Edit generic trial tasks and migration-readiness checks; enter your own must-haves or deal breakers. The default task/check descriptions are suggested steps for the buyer, **not assertions Miloosh or a vendor tested**.
3. Choose a product and record task status `NOT_TESTED` / `WORKED` / `FAILED`, migration status `NOT_CHECKED` / `READY` / `BLOCKER`, and must-have status `NOT_TESTED` / `VERIFIED_BY_BUYER` / `BLOCKER`. A buyer-verification claim requires a separate explicit confirmation. Optional notes are labeled as user-entered evidence.
4. Review three clear groups: buyer-reported passes, blockers, and untested items. Any blocker prevents a "reported clear" state, and no numerical fit score, auto-winner or affiliate-biased recommendation is generated.
5. Print/save a PDF in the browser, or download a plain `.txt` appendix. The appendix clearly says that it records **only buyer observations** and references the sourced Decision Room brief for vendor claims and cost assumptions.

## Browser data and privacy

- Read-only: `miloosh-decision-room-v1` and, via that model's fallback, `miloosh-buyer-desk-v1`.
- Write-only: `miloosh-switching-lab-v1` (distinct versioned browser-local key). No notes, tasks, costs, or evidence are sent to server endpoints, query strings, analytics or third-party apps.
- Local storage unavailable / quota exceeded: in-memory fallback and visible warning; no misleading "saved" state.
- Defensive storage parsing: exact state version, bounded raw length, item/product/note length and count limits, known product IDs, canonical status enums; unknown/malformed and prototype-pollution keys are removed. Data is rendered with React escaping, never injected as HTML.
- Shared Decision Room links have no lab note payload. Nothing automatically writes back to the saved shortlist.

## QA and release

- Focused `tests/decision-room/switching-lab.test.ts` covers parsing, boundaries, prototype safety, round trips, known product linking, buyer-only verification, summary/blocked/unknown behavior, text appendix, route metadata and isolation from shared templates.
- Run all Decision Room tests, TypeScript and lint, six exact-commit release gates on a clean GitHub Actions runner, Vercel Preview on 390/768/1440 viewports, Release Guardian and production ancestry before any merge/deployment.
- Print-to-PDF dialog and full assistive-technology reading order require actual manual verification before claiming them comprehensively tested. A style check alone is not that verification.

## Limits and next steps

The Lab cannot objectively verify vendor functionality. It does not compute vendor cost or convert currencies; refer buyers to the sourced cost and evidence tools already in Decision Room. The notes are device-local, do not synchronize between devices, and should be exported if they matter. All trial statuses are self-reported. Keep noindex until an explicit indexability and public-launch decision is supported by UX/SEO review.
