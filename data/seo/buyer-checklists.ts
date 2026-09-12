export type BuyerChecklist = {
  title: string;
  introduction: string;
  checks: Array<{ question: string; answer: string; source: string; sourceLabel: string }>;
  options: Array<{ slug: string; fit: string }>;
  verifiedAt: string;
};
export const BUYER_CHECKLISTS: Record<string, BuyerChecklist> = {
  wrike: {
    title: "Before replacing Wrike, check the billable work",
    introduction: "A lower headline price does not settle the switching decision. Take the same people, permissions, and renewal date into each vendor quote.",
    verifiedAt: "2026-09-10",
    checks: [
      { question: "Which clients and reviewers need paid access?", answer: "Wrike treats external users as paid full users. Contributors are paid limited-access licenses; viewers are free but have narrower permissions. Test the actual review and approval workflow before assuming every client can use a free seat.", source: "https://help.wrike.com/hc/en-us/articles/209603989-Types-of-Licenses-in-Wrike", sourceLabel: "Wrike license types" },
      { question: "Does the quote cover your actual seat count?", answer: "Wrike's pricing FAQ describes seats sold in groups of five up to 30 users, ten from 30 to 100, and 25 above that. Ask for the billable seat quantity and billing period in writing; do not estimate the invoice by multiplying your exact headcount by the headline rate.", source: "https://www.wrike.com/price/", sourceLabel: "Wrike pricing and billing FAQ" },
      { question: "When can a smaller subscription take effect?", answer: "Wrike directs seat reductions to an account or renewals manager. Reductions and downgrades generally take effect at renewal. Confirm the effective date before paying for a replacement, then test an export and rebuild one real workflow before moving the rest.", source: "https://help.wrike.com/hc/en-us/articles/209605689-Purchasing-Upgrading-and-Managing-Subscription", sourceLabel: "Wrike subscription management" },
    ],
    options: [{ slug: "wrike", fit: "Keep Wrike on the shortlist when the required permissions and workflows fit. Use the checklist to validate the subscription before committing." }],
  },
  klaviyo: {
    title: "Choosing a Klaviyo alternative: compare the same audience and sends",
    introduction: "Start with active contacts, monthly email sends, SMS destinations, and the automations you must keep. A free plan is useful only if the whole workload fits.",
    verifiedAt: "2026-09-10",
    checks: [
      { question: "Will the free tier hold your audience?", answer: "Klaviyo's free plan lists up to 250 active profiles and 500 email sends per month. A list of 2,500 active contacts does not fit, even if you send only a few campaigns a year. Compare the paid tier for that audience rather than a vendor's smallest advertised plan.", source: "https://www.klaviyo.com/pricing", sourceLabel: "Klaviyo pricing" },
      { question: "Are email, SMS, and migration priced separately?", answer: "Omnisend Standard lists monthly email sends at 12 times the list size. Pro's unlimited emails have a fair-use limit of 60 times the list. Check SMS credits and destinations separately. For a migration, ask which flows, segments, and templates the vendor will recreate and verify them before switching.", source: "https://www.omnisend.com/pricing/", sourceLabel: "Omnisend plan limits" },
      { question: "Will deleting contacts reduce this month's bill?", answer: "MailerLite counts addresses that were active at any point in the billing cycle, even if deleted later. Its free tier lists 250 subscribers and 2,500 monthly emails. Check both limits and the reset date; lowering a list today may not immediately lower the bill.", source: "https://www.mailerlite.com/pricing", sourceLabel: "MailerLite billing and sending limits" },
    ],
    options: [
      { slug: "omnisend", fit: "Evaluate Omnisend for an ecommerce email and SMS workflow. Test store events, consent records, and the flows that matter to your shop." },
      { slug: "mailerlite", fit: "Evaluate MailerLite when email marketing, forms, landing pages or websites, ecommerce integrations, digital products, and automation are relevant to the workflow. Validate the exact plan limits, integrations, API or MCP requirements, and migration scope before switching." },
    ],
  },

  smartsheet: {
    title: "Before replacing Smartsheet, check which collaborators need paid Member seats",
    introduction: "Compare the same editors, external guests, automations, and workload controls in every quote. A lower per-seat number is not comparable if the required collaborator role or workflow is different.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "Who actually needs a paid Member seat?", answer: "Smartsheet's current user-subscription model distinguishes paid Members from free Contributors. Business and Enterprise plans also support free external Guests. Map each real collaborator to the minimum role that can complete the required work instead of pricing every viewer or commenter as a full Member.", source: "https://help.smartsheet.com/articles/2483245-User-Subscription-Model-System-Admin-overview", sourceLabel: "Smartsheet user subscription model" },
      { question: "Does the selected plan include the controls you rely on?", answer: "Smartsheet currently lists Pro for 1–10 Members with unlimited Contributors, while Business starts at 3 Members and adds unlimited Guests, workload tracking, admin capabilities, and unlimited automations. Price the plan that contains the required workflow, not the lowest advertised tier.", source: "https://www.smartsheet.com/pricing", sourceLabel: "Smartsheet pricing" },
      { question: "Could provisional access become a paid seat later?", answer: "Smartsheet's provisional-membership model can give users full functionality before a later reconciliation decision. Review provisional users before reconciliation and document which people should become paid Members versus free Guests or Contributors.", source: "https://www.smartsheet.com/content-center/product-insights/product-updates/smartsheet-user-subscription", sourceLabel: "Smartsheet provisional membership and reconciliation" },
    ],
    options: [
      { slug: "wrike", fit: "Evaluate Wrike when client review, project visibility, and structured work management matter. Re-price the exact license types and renewal timing for the same people." },
      { slug: "airtable", fit: "Evaluate Airtable when the core requirement is a flexible data/workflow layer rather than a conventional project plan. Validate editor, commenter, and automation needs on the selected plan." },
      { slug: "monday", fit: "Evaluate monday.com when the team values customizable boards and workflow automation. Compare the same paid users, guests, and required automations before switching." },
    ],
  },
  ecwid: {
    title: "Before replacing Ecwid, price the catalog, staff access, and migration together",
    introduction: "Use your real catalog size, staff count, selling channels, and subscription requirements. Migration cost and missing commerce features can outweigh a cheaper headline platform price.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "Which Ecwid plan actually fits the catalog?", answer: "Ecwid currently lists up to 10 products on Starter, 100 on Venture, 2,500 on Business, and unlimited products on Unlimited. Business also adds marketplace selling, subscriptions, multilingual stores, and two staff accounts; Unlimited removes the product and staff-account caps.", source: "https://www.ecwid.com/pricing", sourceLabel: "Ecwid pricing and plan limits" },
      { question: "What is the current renewal amount in your billing currency?", answer: "Ecwid changed Venture, Business, and Unlimited pricing after March 2, 2026. Its help center lists USD monthly prices of $35, $65, and $149, with lower monthly equivalents on annual billing. Ecwid also supports several billing currencies, so use the account's actual currency and renewal date rather than converting a headline price yourself.", source: "https://support.ecwid.com/hc/en-us/articles/25122701806108-Changes-to-the-Ecwid-plan-pricing-after-March-2-2026", sourceLabel: "Ecwid March 2026 pricing update" },
      { question: "Would a migration replace a feature you currently use?", answer: "Before moving, inventory the features tied to the current plan: subscriptions, marketplaces, multilingual catalog, staff accounts, POS, app integrations, custom checkout, and URL controls. Test products, variants, customers, redirects, payments, tax settings, and one complete order flow before changing the live store.", source: "https://support.ecwid.com/hc/en-us/articles/207100729-Ecwid-plans-and-features", sourceLabel: "Ecwid plan feature matrix" },
    ],
    options: [
      { slug: "shopify", fit: "Evaluate Shopify when you want a dedicated commerce platform with unlimited products and a larger ecosystem. Include staff-account needs, payment-provider fees, apps, and migration work in the quote." },
      { slug: "wix", fit: "Evaluate Wix when the website editor and storefront need to live in one managed site-building workflow. Verify the commerce plan, payment requirements, catalog needs, and migration path before switching." },
    ],
  },
  "zoho-crm": {
    title: "Before replacing Zoho CRM, identify the first workflow that forces a paid edition",
    introduction: "Do not compare CRM starting prices until you know which users need access and whether the required workflow depends on paid email, calling, process automation, portals, or customization.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "Does the free edition cover the real team?", answer: "Zoho CRM currently lists its free edition for up to three users. It includes core contact/deal activity, reminders, basic workflows, reports, APIs, and import/export. A larger editing team should be priced on the paid edition it actually needs rather than treated as a free deployment.", source: "https://www.zoho.com/en-us/crm/zohocrm-pricing.html", sourceLabel: "Zoho CRM pricing" },
      { question: "Is Standard enough, or does the process require Professional?", answer: "Zoho describes Standard for small teams and includes email integration, built-in calling, multiple pipelines, forecasting, forms, and custom modules. Professional is positioned for growing teams needing deeper process automation and adds process management, inventory, CPQ, portals, and other advanced workflow capabilities. Match the requirement to the edition before comparing cost.", source: "https://www.zoho.com/en-us/crm/zohocrm-pricing.html", sourceLabel: "Zoho CRM edition capabilities" },
      { question: "Can the replacement pass the same acceptance test?", answer: "Use the same sanitized sample and require each candidate to reproduce lead assignment, email history, the next follow-up, one automation, one manager report, and the needed export. Record pass, partial, or fail before migrating the full database.", source: "https://www.zoho.com/crm/complete-feature-list.html", sourceLabel: "Zoho CRM feature comparison" },
    ],
    options: [
      { slug: "pipedrive", fit: "Evaluate Pipedrive when a sales-first pipeline and activity workflow is the priority. Check the exact tier needed for email sync, automations, reporting, and the team's paid seats." },
      { slug: "close", fit: "Evaluate Close when calling, email, and outbound sales execution need to stay inside the CRM. Verify current communication allowances, automation limits, and paid users before comparing totals." },
    ],
  },
  calendly: {
    title: "Before replacing Calendly, separate host seats from invitees and routing needs",
    introduction: "A scheduling quote should count the people who host or connect calendars, not every meeting invitee. Then check whether simple booking, reminders, routing, payments, or team administration is the actual requirement.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "Could the Free plan handle the workflow?", answer: "Calendly's current Free plan lists one event type, one calendar connection, one-on-one scheduling, and a customizable booking page. If the workflow needs only one host and one event type, verify that before paying for a larger plan.", source: "https://calendly.com/pricing", sourceLabel: "Calendly pricing" },
      { question: "Who needs a paid Calendly seat?", answer: "Calendly states that Standard seats are required for users who connect calendars and host Calendly meetings; invitees do not require a seat. Standard currently lists unlimited event types, multiple calendars, automations/reminders, and Stripe or PayPal connections. Count hosts separately from attendees.", source: "https://calendly.com/pricing", sourceLabel: "Calendly Standard plan and seat rule" },
      { question: "Do you need routing and admin controls, or just booking?", answer: "Calendly positions Teams for team scheduling, lead routing, and admin controls. For a simpler booking workflow, Setmore's Free plan currently supports up to four users with email reminders, while Pro adds SMS reminders, two-way calendar sync, recurring appointments, and other advanced scheduling features. Compare the exact requirement rather than plan names.", source: "https://calendly.com/help/choose-the-right-calendly-plan-for-your-team", sourceLabel: "Calendly plan guidance" },
    ],
    options: [
      { slug: "setmore", fit: "Evaluate Setmore when the core requirement is service booking for a small team. Verify whether Free covers the team or whether Pro features such as SMS reminders and two-way calendar sync are required." },
    ],
  },
  woocommerce: {
    title: "Before replacing WooCommerce, compare total operating cost — not just the core plugin",
    introduction: "WooCommerce's core platform is free, but a real store can also carry hosting, paid extensions, payment processing, development, and maintenance costs. Compare the same operating model before deciding that a hosted platform is cheaper or more expensive.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "What are you actually paying beyond WooCommerce core?", answer: "WooCommerce currently describes its core platform as free with no monthly platform subscription. Its own pricing guide separates hosting, payment processing, extensions, development, and maintenance as additional cost categories. Build a current annual total from your own invoices rather than treating zero platform fee as zero store cost.", source: "https://woocommerce.com/pricing/", sourceLabel: "WooCommerce pricing model" },
      { question: "Which extensions are required to reproduce the store?", answer: "WooCommerce's marketplace includes paid extensions for subscriptions, bookings, product bundles, coupons, tax, payments, and other workflows. Inventory the extensions and custom code the store depends on, then classify each as required, replaceable, or removable before comparing another platform.", source: "https://woocommerce.com/products/", sourceLabel: "WooCommerce extension marketplace" },
      { question: "Does a hosted alternative remove work or only move the bill?", answer: "A hosted platform can bundle hosting, SSL, storefront tooling, and platform operations into the subscription, while apps and payment-provider fees can still add cost. Compare the same catalog, staff access, checkout, subscriptions, integrations, and migration work; do not compare WooCommerce core alone with another vendor's full plan price.", source: "https://woocommerce.com/documentation/products/extensions/", sourceLabel: "WooCommerce extension documentation" },
    ],
    options: [
      { slug: "shopify", fit: "Evaluate Shopify when you want hosting and the commerce platform bundled into a managed subscription. Compare the current plan, staff accounts, third-party payment fees, required apps, and migration work against the full WooCommerce operating cost." },
    ],
  },
  teamwork: {
    title: "Before replacing Teamwork, check whether client billing and delivery controls are part of the job",
    introduction: "Agency project management can combine tasks, capacity, client collaboration, time, rates, budgets, and invoicing. Compare the same delivery workflow before substituting a lower-priced general project tool.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "Do you use Teamwork for client users and approvals, not only tasks?", answer: "Teamwork's current pricing matrix includes client users and proofing alongside project-management features. Record how many clients need access, what they must approve or edit, and whether a replacement can reproduce that workflow without turning every external collaborator into a paid internal user.", source: "https://www.teamwork.com/pricing/", sourceLabel: "Teamwork pricing and client collaboration" },
      { question: "Are time, budgets, retainers, and invoices part of the workflow?", answer: "Teamwork currently lists billable versus non-billable time, timesheets, time budgets and retainers, cost tracking, and client invoicing across its paid feature set. If those functions matter, compare the exact tier and replacement stack needed to recreate them rather than evaluating task boards alone.", source: "https://www.teamwork.com/pricing/", sourceLabel: "Teamwork finance and delivery features" },
      { question: "Who owns rates and profitability data?", answer: "Teamwork documents site-wide billable and cost rates plus project, role, and client-role overrides. Before migrating, identify which rates, permissions, historical time entries, and profitability reports must survive, and export a representative project before moving the full account.", source: "https://support.teamwork.com/projects/finance/user-rates", sourceLabel: "Teamwork user rates" },
    ],
    options: [
      { slug: "wrike", fit: "Evaluate Wrike when cross-functional project visibility, workload planning, and structured work management are central. Validate client-access and billing requirements separately." },
      { slug: "monday", fit: "Evaluate monday.com when flexible visual workflows and configurable project tracking matter more than agency-specific finance features. Rebuild one client workflow before switching." },
      { slug: "hubstaff", fit: "Evaluate Hubstaff when time capture, attendance, budgets, and workforce reporting are the primary pain. Confirm whether you still need a separate system for broader client project management." },
    ],
  },
  doodle: {
    title: "Before replacing Doodle, decide whether the job is group polling or appointment booking",
    introduction: "Doodle serves more than one scheduling pattern. A group poll, a booking page, and a multi-staff appointment calendar are different jobs, so compare the workflow you actually use rather than a generic scheduling feature list.",
    verifiedAt: "2026-09-12",
    checks: [
      { question: "Is group consensus the core requirement?", answer: "Doodle's Group Poll lets an organizer propose several times, collect participant availability, and select a final option. Participants can take part without an account. If that consensus workflow is the main job, test it explicitly before replacing Doodle with a booking-first tool.", source: "https://doodle.com/en/product/polls/", sourceLabel: "Doodle Group Poll" },
      { question: "Could the free account cover the actual scheduling pattern?", answer: "Doodle currently says a free account can create group meetings, a booking page, and a sign-up sheet, while Professional plans add capabilities such as calendar synchronization, tracking, branding, and an ad-free experience. Verify the current feature limit before paying or migrating.", source: "https://help.doodle.com/en/articles/9457366-how-much-does-doodle-cost", sourceLabel: "Doodle pricing and plan scope" },
      { question: "Do you instead need a service-business booking calendar for several staff?", answer: "If customers need to self-book named staff, receive reminders, and optionally pay in advance, compare appointment-first tools on staff calendars, reminders, payments, recurring appointments, and calendar sync. That is a different decision from replacing a group poll feature.", source: "https://help.doodle.com/en", sourceLabel: "Doodle scheduling product areas" },
    ],
    options: [
      { slug: "setmore", fit: "Evaluate Setmore when the primary requirement is customer appointment booking for a service team. Its current product pages document staff calendars, booking pages, email reminders, payments, and Pro text reminders; verify the exact plan needed for your staff count and integrations." },
    ],
  },

};
export function getBuyerChecklist(slug: string): BuyerChecklist | undefined { return BUYER_CHECKLISTS[slug]; }
