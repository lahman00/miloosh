# Next Actions — Overnight Research + Trust Factory backlog

1. **Coordinate on ecommerce-migration and AI-voice research before starting it independently.**
   Both are already Assets B and C in the parallel Codex/Antigravity worktree's
   `linkable-deep-assets.md` plan. Check that worktree's actual publication status before any
   future session builds either as a Miloosh-branch asset, to avoid two conflicting versions.
2. **Scope email-marketing research properly before attempting it.** No `email-marketing`
   category exists in the catalog. A future session needs to either add one with a defined
   product list, or explicitly redefine the candidate as a subset of the existing broader
   `marketing` category (23 products) before any research can start.
3. **Build the real CRM plan-gates second dataset this session unlocked a template for.** Extend
   `lib/crm-plan-gates/` the same way if a future session wants to research the remaining CRM
   category products (10 in the catalog; only 7 were covered here per the mission's own named
   list) -- Freshsales's sibling products, HubSpot's other Hubs, etc. are natural next candidates
   if genuine buyer demand supports it.
4. **Re-verify the 10 customer-support vendors this session did NOT find a discrepancy in**
   (crisp, five9, freshdesk, genesys-cloud-cx, intercom, kayako, liveagent, reamaze, talkdesk,
   zoho-desk) again in 3-4 weeks -- their `last_verified` dates are now all 2026-09-27, so the
   next natural re-check point is late October.
5. **Consider a `relatedResearch` field on the Software/Category types** (flagged previously in
   `docs/growth/receipts/20260926-citable-research/next-research.md`, still not built) -- now
   that 3 research assets exist and 2 of them reference specific customer-support and CRM
   products, the case for a real, template-level "Related research" card on those product pages
   is stronger than it was with only 1 asset.
6. **Fill in the 5 remaining unconfirmed CRM fields** flagged in `unknownFields` across Pipedrive,
   Close, Freshsales, and Salesforce (minimum seats for 4 of them; exact pipeline/contact caps for
   2) if a primary source is ever found -- do not estimate them in the meantime.
7. **Watch for the same "Verified {date}" real-clock bug** on any future research page built in
   this environment. The fix pattern (a hardcoded `VERIFIED_DATE` constant, decoupled from
   `new Date()`-derived `generatedAt`) is now established on both `/research/crm-plan-gates-2026`
   and `/research/customer-support-pricing-2026` -- reuse it rather than rediscovering the bug.
8. **Consider building the `/research/methodology` hub page** (evaluated and deferred in
   `trust-audit.md`) now that a second and third research asset exist and share substantially the
   same verification standards -- the case for one canonical methodology explanation, rather than
   three near-duplicate per-page Methodology cards, is stronger with 3 assets than it was with 1.
