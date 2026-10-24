# Strategy intake and SaaS phase 0 (2026-10-24)

Three outside AI strategy briefs were handed in (a "Validation Gate" request, a "Phase 0 toward SaaS" step list, and a "Revenue Growth and SaaS Validation" master mission). This file packs them, checks their facts against the repository and live storage, and says for each proposal whether it was done, adapted, deferred or rejected, and why. Nothing here was deployed, published, merged or sent.

## 1. Facts in the briefs, checked
| Claim in the briefs | Finding (2026-10-24) |
|---|---|
| Security update is "PR #86 (Next 16.4.2)" and production has a critical alert | **Outdated.** Next 16.4.2, vitest and DOMPurify shipped as PR #87 and were deployed 2026-10-23 18:22. PR #86 is a different draft (the vendor-link row). A *new* `npm audit` now reports 5 high advisories (undici, nested zod); a lockfile-only patch branch with 0 vulnerabilities is ready (`claude/audit-patch-20261024`, live storage read verified with the patched packages). |
| Audit branch of 2026-10-12 (PR #75) unmerged | **Confirmed**: PR #75 is still an open draft. Not touched. |
| GSC 17.9 to 14.10: 19 impressions, 1 click; about 180 pages indexed | **UNKNOWN**: no authenticated GSC in this session. The last capture in the repository is 2026-10-09 and shows different index counts. |
| "8 non-test outbound clicks since launch" | **Different from the stored ledger**: 11 non-test records all-time (9 affiliate: Wix 8, MailerLite 1; 2 official: Bitwarden, Notion) plus first-party events. Clicks only; none is a conversion. |
| First CTA about two-thirds down, no verdict | **Confirmed for the eight v2 pages**: first vendor CTA at about 61% (median 59% for the first affiliate-tagged link across the 273 pages that have one). The eight v2 pages have a verdict card at the top. |
| Most outbound vendor links have no affiliate tag | **Confirmed**: 11,484 outbound links on 1,786 pages; 428 (3.7%) are affiliate-tagged. 10,971 untagged links go to 424 vendors with no program on record in the repository (UNKNOWN, not "none"); 85 go to vendors with an ACTIVE program and, in a sample of six plus the per-vendor counts (MailerLite, Setmore, Jotform, Fireflies), look like source citations (pricing or help pages) rather than CTAs; not all 85 were individually read. |
| Best-of page shows Pipedrive #1 but Close as "primary product" | **UNVERIFIED** (not checked). |
| Newsletter and pricing alerts say "Email delivery is not active yet" | **Confirmed** in `NewsletterSignupForm.tsx`. The lead store (`newsletter-leads/`) holds **0** objects (listing succeeded). Whether the signup flow works end to end was not tested. |
| Held pages frozen until 2026-11-04 | Consistent with the repository's protection sources. `held-page-freeze.ts` exists only inside PR #75, not in production. |

## 2. Proposal by proposal
| Proposal | Verdict | Why |
|---|---|---|
| Validation Gate: "premium report" button on 2 to 3 comparison pages firing `premium_intent_clicked`, then "coming soon" | **DONE, adapted** | Built on three live v2 pages. Adapted for honesty: the card says the product does not exist, nothing is for sale and no email is collected; the button reads "I would use this" (not "Unlock"); after the click it confirms nothing was charged and links back to the vendor section. One event through the existing tracker, validated server-side, stored anonymously. No SEO, routing or affiliate link touched. |
| Reading the result | **ADAPTED** | The only denominator that does not need a new event is each page's own `comparison_view` sessions, so there is no "gate viewed" event (extra event types feed the traffic classifier and thresholds were not touched). The daily report shows gate-page sessions vs click sessions (strict and probable, test excluded). |
| Is the test worth running now? | **Honest caveat** | Over 30 days the site had 6 strict sessions in total and 0 in the last 7. At that volume the gate will produce essentially no signal for weeks. It is cheap and harmless, but it cannot justify building anything. A decision threshold must be set by the owner before reading it (suggested: no decision below 150 strict or probable sessions on the three pages). |
| Build Miloosh Pro / paid pricing alerts now | **NO-GO to build; revise to evidence-gathering** | There is no qualified audience to sell to yet, 0 newsletter leads, and alerts are not even sent. The briefs themselves say "do not build billing, accounts or a dashboard first"; that is right. The order that makes sense is traffic and attribution first, demand test second, product last. |
| Step 1 security update | **Superseded** | Already shipped (#87). New audit patch ready (above). |
| Step 2 indexing checklist for 2026-11-04 | **DONE (checklist below)** | Not executed. |
| Step 3 money-path inventory | **DONE** | `money-path.csv` (affiliate destinations redacted to host in this public file), `money-path-summary.json`, and the reusable script `npm run growth:money-path`. |
| Step 4 measurement check | **DONE earlier, now extended** | First-party events: private Blob `first-party-analytics/` (read with `npm run growth:daily-report -- --live`); legacy outbound ledger: `outbound-clicks/`. Per-page view: top landing pages by channel in the daily report. Added a device (viewport) split on a separate branch. |
| Step 5 verdict box on comparison and best-of pages | **ALREADY DONE for 8 pages; no extension** | The verdict card exists on the eight v2 pages. More pages need sourced, verified, editable data, and most remaining comparisons share data with held pages. The "#1 vs primary product" mismatch is unverified. |
| Step 6 waitlist page and alert provider plan | **PLAN ONLY, deferred** | Provider costs and free tiers were **not checked (UNKNOWN)**; check current vendor pages before choosing. A waitlist page should wait until the 2026-11-04 index check shows Google starting to show the site. |
| Master mission phases 0 to 5 (inventory, funnel, top pages, BuyerDesk, Pain Radar, affiliates) | **Mostly already done in earlier work** | See PR #84, the 55-minute mission reports (PR #86) and the partner matrix. Pain Radar was not inspected in this session: UNKNOWN. |
| Phase 6 Miloosh Pro validation | **REVISE (not GO)** | Candidate users (IT consultants, procurement teams, agencies) are reachable only through traffic Miloosh does not have yet. Evidence needed first: qualified sessions, repeated use of `/recommend`, and a real waitlist signal. |
| Mass distribution, Reddit participation, outreach | **Rejected as written** | Conflicts with the site's own rules (no mass posting, no unsolicited outreach). Two owner-approved LinkedIn posts were already published (2026-10-22 and 2026-10-23). |

## 3. Checklist for 2026-11-04 (do not run before then)
1. Re-read the protection sources and confirm which pages leave the hold (`npm run growth:director`, protection snapshot) instead of assuming; the Playcode and Lovable window ends later (2026-11-12).
2. If PR #75 has merged, delete `data/seo/held-page-freeze.ts`, regenerate template cohorts and release `clickup-vs-zoho-projects` from noindex; if it has not merged, decide whether it is still the right vehicle.
3. Verified pricing batch: GetResponse first (14-day trial; $19, $59, $69 monthly; yearly prices lower), then the 41 candidate records stored as monthly whose notes mention annual billing.
4. Fix the `/research` footer link that redirects on 1,785 pages.
5. Release Guardian on the exact commit, complete render comparison against production, then owner approval to deploy.
6. Authenticated Search Console check; only then resubmit the sitemap (once).
7. Read the premium gate counters and compare them with the threshold set in advance.

## 4. Decisions waiting for the owner
- Merge and deploy: the vendor-link row plus the validation gate (stacked draft PR), the viewport field, and the audit patch (lockfile only). The audit patch is the quickest unblock, because the audit gate currently fails on production head.
- The decision threshold for reading the gate.
- Whether to pursue any SaaS work before traffic exists (recommendation: no).

## 5. What was not done and why
No billing, accounts, waitlist page, provider activation or email sending; no new analytics vendor; no outreach; no price or protected-page edits.
