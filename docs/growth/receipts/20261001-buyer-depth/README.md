# Buyer-depth release — October 1, 2026

Status: **LIVE VERIFIED** on miloosh.com. Production source `f1b95cd7ac39feaa4aa5e37d2aa75145991d6b08`; deployment `dpl_4uJsLwFAFMdVraYttKZRMHgcEAt5`. See production.json for independent domain resolution and live QA.

## Four existing decision pages

- Trainual: request an itemized annual quote rather than treating the $3/$4/$5 per-user display as the minimum subscription. The current pricing page also displays a 10-seat / $3,000 annual minimum footnote; its scope is not clear. The vendor FAQ lists a $1,000 one-time implementation fee. No numeric entry price or numeric schema offer is published. The page distinguishes documentation, assigned training, completion evidence, and edition requirements.
- Zoho Flow: distinguish workflow runs from successful billable actions, connector eligibility, polling intervals, overage settings, separate AI credits and retry/duplicate handling. The worked 2,000-event × three-action example is 6,000 tasks, not measured customer usage.
- Zoho Desk: match full-agent seats, internal reviewers and departments to the actual edition. Express is not an unlimited-user plan. The help center and edition matrix differ on lower-plan light-agent eligibility; the page explicitly requests confirmation. The six-agent Professional example is $1,656 on annual billing versus $210 per month on monthly billing, before taxes and add-ons.
- Close: separate Solo from team/workflow requirements. Four Growth seats at the documented annual-billing rate are $4,752 per year before usage and taxes; four Essentials seats are $1,680 but do not include automated workflows. Communication usage and JSON-versus-CSV activity portability are separate checks.

All three-check sections are labeled documentation-based, preserve a stay-with-the-current-tool path, and link directly to the relevant first-party evidence. These are not claims of hands-on migrations, customer outcomes or guaranteed savings.

## Discovery without inventory expansion

Four existing guides now link directly to the relevant product's `#buyer-checklist` section: team knowledge bases → Trainual; small-business automation → Zoho Flow; small-business help desks → Zoho Desk; sales-team CRM → Close. Existing ranked shortlists and alternative order are unchanged. No new page, program application, payment configuration or mass outreach was created.

The sitemap retains the same 988 URLs, priorities and frequency hints. Twenty-one lastmod values changed for actual edited products, their content-dependent categories/comparisons, and the four source guides. No global build-time date refresh, robots change, canonical change or indexation request was performed in this sprint.

## Verification and shared-surface review

See verification.json for local release gates. Desktop and mobile checks cover sourced content, complete price qualification, internal hash navigation, affiliate disclosure, exact outbound identity, and mocked event pairing. Hash-navigation QA waits for the framework's real asynchronous scroll; it never force-scrolls a target to pass the test.

The first whole-site render comparison detected six reserved surfaces reusing the new expanded short price labels. Those reused labels were restored before the final build; the complete new limits remain in product pricing notes and the buyer checks. The final 1,786-route comparison reports 53 content-dependent changed routes and no protected rendered conflicts, canonical changes or H1-count changes. The protection registry and existing experiment membership were not changed. Broader reusable-data effects are not counted as 53 newly written pages.

Trainual's pre-existing local $3 numeric entry-price draft was backed up privately and replaced before publication. The public page does not imply an all-in $3 subscription. No private Search Console exports, visitor identifiers, credentials or full copied vendor pages are committed here.

## First-party sources checked October 1

- https://trainual.com/pricing-2 and https://trainual.com/pricing (live redirect), plus https://trainual.com/faqs and https://trainual.com/training-suite
- https://www.zoho.com/flow/pricing.html and https://help.zoho.com/portal/en/kb/flow/user-guide/settings/general/articles/billing-usage
- https://www.zoho.com/desk/pricing.html and https://www.zoho.com/desk/pricing-comparison.html
- https://help.zoho.com/portal/en/kb/desk/user-management-and-security/agents-and-teams/articles/add-manage-desk-agents
- https://close.com/pricing, https://help.close.com/account-management/variable-usage-costs-calling-sms-phone-numbers-ai-tools and https://help.close.com/account-management/exporting-data

USD prices were checked using the live vendor billing toggles; region-dependent search snippets were not substituted for them. Source captures and incomplete/failed earlier QA attempts remain in the private receipt directory.

## Outcome boundary

Published content is not search traffic. No recovery of Google impressions, buyer visit, network conversion, approved commission or payout is established by this release. Review subsequent comparable search/visitor evidence before choosing the next content batch; do not immediately expand the catalog.

## Production closeout

One content release was promoted after all code/build and staged HTTP gates passed. The live site passed 24 focused buyer-content, hash-navigation and mocked-CTA checks plus the 53-case existing revenue regression suite (77 total), at mobile and desktop widths. All browser API writes were intercepted and external requests blocked. The longer deployment log query timed out; only the bounded five-minute, four-route aggregate error check returned no errors.

No manual task or payment action is required from the owner for this release. The pages are live; search exposure and merchant outcomes must be evaluated separately on subsequent real data, not inferred from these test passes.
