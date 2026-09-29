# Affiliate truth reconciliation — 2026-09-29

Branch: claude/revenue-acquisition-20260929

## First-party changes found

- Zoho Affiliate Program: first-party welcome email received 2026-09-29. Miloosh is approved, but no account-specific referral URL has been captured yet. Canonical status is now APPROVED_NEEDS_LINK, not PENDING_REVIEW and not ACTIVE.
- CallRail: a first-party 2026-09-01 email supersedes the stale pending-review assumption. After Miloosh clarified its editorial publisher model, CallRail explicitly directed Miloosh to the Affiliate Partnership Program application at the vendor-provided PartnerStack route. No later application-confirmation email was found, so canonical status is now OWNER_ACTION_REQUIRED.
- Freshworks, Amplitude, Toggl: Gmail showed real follow-ups had already been sent on 2026-09-12. The ledger now records follow-up timestamps so the audit does not recommend duplicate outreach based only on the original application date.

## Outreach executed 2026-09-29

Three concise written follow-ups were sent in their existing Gmail threads:

- Freshworks — Gmail sent message 1a0eebe5dd6fe3f9
- Amplitude — Gmail sent message 1a0eebe651724c95
- Toggl — Gmail sent message 1a0eebe6d0d04101

Each asks only for current status / required information / exact issued tracking asset if approved. No phone calls were requested.

## Zoho owner checkpoint

The Zoho welcome email says unique product referral links are available after portal login (Referral Code / Create a Link). It also requests completing Payment Method under Commissions and billing address under Settings. Until at least one account-specific link is captured and verified, Miloosh must not treat Zoho as an active monetized CTA.

## CallRail owner checkpoint

Submit the exact Affiliate Partnership application provided by CallRail:
https://dash.partnerstack.com/application?company=callrail&group=affiliatepartners

Do not report CallRail as pending review until that correct-route application is actually submitted and evidenced.

## Evidence discipline

Public affiliate research freshness remains a separate issue from account relationship state. Approval/contact evidence does not silently refresh unrelated commission/cookie claims.

No deploy or push was performed in this reconciliation.

## QA

- 4 targeted test files / 29 tests passed.
- TypeScript: npx tsc --noEmit passed.
- affiliate:audit passed.
- Audit findings moved from 99 at the start of the session to 94 after first-party reconciliation and current follow-up evidence.
- No overdue-followup findings remain immediately after the 2026-09-29 Freshworks / Amplitude / Toggl follow-ups.
