# Miloosh overnight first-revenue sprint — 2026-10-01

Status: **verified local release candidate; not pushed and not deployed**.

## Affiliate outcomes

- Activated Trainual on the exact vendor-issued URL `https://start.trainual.com/0j9to92n49iy`. The URL is preserved byte-for-byte, commercial links use `rel=sponsored`, and the account remains payout-unverified.
- Reviewed Trainual's current first-party affiliate restrictions and sent a written request for the assigned commission rate, duration and payout details (Gmail sent message `1a0f46dbaa14e2df`).
- Preserved MRPeasy's issued URL `https://try.mrpeasy.com/rlmf8edfjcie`, but placed the relationship on canonical `HOLD`. No public CTA was created. Written clarification was sent about sole-proprietor eligibility, payout identity, independent editorial use, the seven-day placement requirement and assigned economics (Gmail sent message `1a0f46ca9713bbb4`).
- Kept Automattic/WooCommerce at `APPROVED_NEEDS_LINK`: the issued Marketplace asset is not treated as a universal WooCommerce platform destination. A written request for a main-platform link and editorial confirmation was sent (`1a0f47fc7354834b`).
- Kept Zoho at `APPROVED_NEEDS_LINK` and Softr/Apollo/Aircall in pending state. No duplicate application was submitted.
- Added current first-party research for 15 program records. Eleven are viable research-only publisher candidates, one is already pending (Softr), one is confirmed closed (Ahrefs), one is customer-only (KnowledgeOwl), and one is held for conflicting reward language (YouCanBookMe).

## SEO/indexation work

- Repaired factual-depth failures on Apigee, Datadog, Read the Docs, Stripe and Supabase using current official sources, buyer-facing pricing semantics, limitations and FAQs.
- Added seven bounded, relevant discovery edges from existing unprotected pages to previously undiscovered catalog pages.
- Local indexation readiness moved from `149 PASS / 63 WARN / 12 FAIL / 130 PROTECTED` to `154 PASS / 70 WARN / 0 FAIL / 130 PROTECTED`.
- This is a local quality/readiness result, not evidence of Google crawling, indexing, ranking or traffic.

## Verification

- 2,538 tests passed across 276 files; 0 failed.
- TypeScript, ESLint, catalog validation and npm audit passed; npm audit reported 0 vulnerabilities.
- Production-style QA build passed.
- Static release audit checked 1,786 public HTML pages and 86,706 internal links with 0 failures.
- Browser QA passed 29/29 cases. API writes were intercepted, external affiliate requests were blocked, production writes were 0 and affiliate-network traversals were 0.
- Trainual appeared on exactly nine intended public routes. MRPeasy and the WooCommerce Marketplace asset appeared on zero public HTML pages.

Raw local evidence: `~/MilooshReceipts/20261001-overnight-first-revenue/`.
