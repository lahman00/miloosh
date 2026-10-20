# 21-day execution and measurement roadmap (2026-10-21 to 2026-11-11)

The horizon is for execution and measurement. It does not promise earnings. **Approvals** are the owner's; **Claude** work is read-only measurement, drafts, code on isolated branches and reports.

| Day / date | Action | Owner | Depends on | Checkpoint (evidence) |
|---|---|---|---|---|
| D0, 10-21 | Review this PR and receipt; decide on the five approvals below | Owner | none | decisions recorded in the Command Center |
| D0 to D2 | Check PartnerStack account security and payout profile (account-lock notices); no agent touches it | Owner | none | owner confirms account state |
| D0 to D3 | Export partner-network reports for Wix (Impact), Trainual, KrispCall, Apollo.io, CallRail, MailerLite, Close, Pipedrive: clicks, leads, sales, approved, paid, with date ranges | Owner (or an approved authenticated session) | account access | files for `--network-file`; Trainual's 10 clicks explained or flagged |
| D1 | Start Experiment A and B posts after identity and duplicate checks (one post each, one channel each) | Owner approves; Claude prepares final copy | approval, deployed pages | permalinks recorded, UTM tags verified |
| D1 to D21 | Run `npm run growth:daily-report -- --live --days 7` daily, store output privately | Claude | storage token | daily file; change vs previous window; NOT_MEASURED stays NOT_MEASURED |
| D2 to D14 | At most 2 owner-approved discussion answers per experiment | Owner approves per thread | authenticated session | thread URL, text, UTM or no link, recorded |
| D7, 10-28 | First 7-day comparison: strict, probable, excluded; hand-offs; partner-reported figures if supplied | Claude | 7 full days | dated receipt; stop/revise decision on A and B only if the criterion is met |
| D14, 11-04 | Hold release date: re-run protection; decide Close, Pipedrive, Todoist, Airtable page work; verify STACK20 terms and attribution before any mention | Owner + Claude | Close/PartnerStack answer | a verified coupon note or a decision not to use it |
| D14 | Second comparison and stop rule check (fewer than 2 strict sessions across pages means revise the channel) | Claude | data | receipt |
| D15 to D17 | Fresh Search Console and GA4 evidence from an authorized source; today only the 2026-10-09 capture exists | Owner | authenticated GSC | current-window GSC capture |
| D21, 11-11 | Final review: what was measured, what was not, which partner (if any) reports a lead or sale | Claude | all above | execution report; no revenue claim without a network figure |
| D22 (11-12) | Playcode/Lovable window ends; decide Experiment C | Owner | window end | decision |

## Owner approvals needed (smallest set)
1. Review PR: daily report tooling and receipt (no production behavior change).
2. PartnerStack: verify account state and export reports (no agent access).
3. Impact (Wix) and MailerLite/Tipalti payout setup, so the only partner with real hand-offs can be paid.
4. Approve Experiments A and B (posts and at most two discussion answers each).
5. Close: confirm STACK20 terms and attribution before any use.
