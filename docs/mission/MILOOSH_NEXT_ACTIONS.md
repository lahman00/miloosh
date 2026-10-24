# Next actions, ranked (2026-10-23)

Each item names who acts and what evidence settles it. None is a revenue forecast.

1. **DONE 2026-10-23 (PR #87, deployed): the Next.js 16.4.2 security patch.** Original note: `npm audit` reports a critical advisory set for the Next.js version production runs. The branch updates it with the full test suite, lint, data validation and production build re-run. Deploying is the owner's step; before it, run the Release Guardian on the exact commit (gates plus a complete render comparison against production `ab75185`, because a framework patch can change rendered output).
2. **Confirm the vendor-link row after one week of traffic.** On the eight v2 comparison pages the new row has its own `ctaLocation` (`compare-page-pricing-table`). On 2026-10-30 read `npm run growth:daily-report -- --live` and compare clicks on this location against `compare-page-choose-card`. The 30-day baseline: 88 choose-card impression events and 0 clicks. Do not conclude from fewer than a few dozen qualified sessions.
3. **Export partner-network reports (owner).** Wix (Impact), Trainual, KrispCall, Apollo.io, CallRail, MailerLite, Close, Pipedrive: clicks, leads, sales, approved and paid commission with dates. Without them every conversion and commission stays NOT_MEASURED, and Trainual's 10 reported clicks (zero recorded by Miloosh) stay unexplained.
4. **Verified pricing batch after the 2026-11-04 hold.** GetResponse first (official page read 2026-10-23: 14-day trial; Starter $19, Marketer $59, Creator $69 monthly; $15.58, $48.38, $56.58 on yearly billing), then the candidate list from the SEO audit (41 records stored monthly whose notes mention annual billing), each read with its billing toggle. Then fix the `/research` footer link in the same release.
5. **Rebase the Miro review branch and add a whiteboard recommend domain.** The branch is 245 commits behind and conflicts with production; after the rebase, re-run `validate:data`, tests and a protection check, then decide whether a whiteboard domain should exist so "replace Miro" buyers get a real shortlist. Novastart stays out until the evidence list in the editorial document is met.

## Owner approvals needed
- Deploying the security patch (and the vendor-link row) to production.
- Adding a device or viewport field to first-party events (an analytics change) so mobile friction can be measured.
- Any change to protected pages, including the `/research` footer link.
- Publishing anything, contacting Thomas Fraher or Novastart, or adding any affiliate relationship.
