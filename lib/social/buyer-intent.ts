/**
 * Buyer-intent question bank, 2026-09-09.
 *
 * These hooks are based on recurring decision language observed across
 * Miloosh Search Console queries, Google autocomplete, Reddit buying
 * threads, LinkedIn buyer conversations, and current small-business
 * software buying guides. They are deliberately outcome + context +
 * constraint questions, not company announcements or generic listicles.
 */

export type BuyerIntentConcept = {
  topic: string;
  headline: string;
  body: string;
  linkPath: string;
};

export const BUYER_INTENT_CONCEPTS: BuyerIntentConcept[] = [
  {
    topic: "hubspot-overkill-small-team",
    headline: "Is HubSpot overkill for a 4-person team?",
    body: "Start with the three jobs the CRM must do, then price those jobs at your real team size. If you mainly need contacts, pipeline, email tracking, and basic automation, compare that requirement before paying for a wider suite you may not use.",
    linkPath: "/best-crm-for-small-business",
  },
  {
    topic: "hubspot-cheaper-without-losing-core",
    headline:
      "What CRM is cheaper than HubSpot without losing the features you actually use?",
    body: "Write down the exact features you would miss first: email tracking, forms, reporting, calling, automation, or marketing. A lower subscription can be a false saving if the replacement forces three integrations and a reporting rebuild.",
    linkPath: "/best-crm-for-small-business",
  },
  {
    topic: "crm-no-admin-small-team",
    headline:
      "Which CRM works for a small team without creating a full-time CRM admin job?",
    body: "For a lean team, adoption and maintenance matter as much as pipeline features. Test whether normal users can update records, find history, and build the reports you need without one person becoming the accidental system owner.",
    linkPath: "/best-crm-for-small-business",
  },
  {
    topic: "clickup-too-complicated",
    headline: "Is ClickUp too complicated for a small team?",
    body: "It depends on whether you will actually use the extra structure. If the team only needs owners, due dates, and a shared board, configuration depth can become overhead. If you need docs, dashboards, automations, and custom fields, that same depth can replace other tools.",
    linkPath: "/best-project-management-software-for-small-teams",
  },
  {
    topic: "easiest-pm-small-team",
    headline:
      "What is the easiest project management tool for a 5-person team?",
    body: "The best test is not the feature demo. Put one real project in the tool and see whether everybody still updates it without reminders after a week. Small-team software fails when the workflow is theoretically powerful but practically ignored.",
    linkPath: "/best-project-management-software-for-small-teams",
  },
  {
    topic: "free-pm-small-team",
    headline: "Can a small team stay on free project management software?",
    body: "Often, yes. Check the first paid constraint before moving the team: collaborator limits, storage, automations, reporting, guest access, and advanced views. If you already know you need one of those, model the paid cost now instead of migrating twice.",
    linkPath: "/best-project-management-software-for-small-teams",
  },
  {
    topic: "zapier-too-expensive",
    headline: "What should you use when Zapier starts getting too expensive?",
    body: "Do not compare only the base plan. Count how many actions each real workflow consumes, then compare that with Make credits, n8n execution and hosting costs, or a flat organization plan. The cheapest-looking tool changes when volume changes.",
    linkPath: "/best-automation-software-for-small-business",
  },
  {
    topic: "n8n-vs-zapier-owner",
    headline: "When does n8n make more sense than Zapier?",
    body: "Usually when technical control matters enough to justify technical ownership. Self-hosting and custom code can reduce platform limits, but someone still has to monitor failed workflows, upgrades, credentials, and infrastructure.",
    linkPath: "/best-automation-software-for-small-business",
  },
  {
    topic: "make-vs-zapier-small-business",
    headline: "Should a small business use Make or Zapier?",
    body: "Zapier is the safer default when non-technical users need to own common automations. Make becomes more attractive when the workflow has branching, transformations, and multiple steps that benefit from a visual scenario map.",
    linkPath: "/best-automation-software-for-small-business",
  },
  {
    topic: "mailchimp-expensive",
    headline:
      "What should you switch to when Mailchimp gets expensive as your list grows?",
    body: "Compare the cost at your actual subscriber count and monthly send volume, then check automation, templates, ecommerce integrations, and deliverability needs. A cheaper contact tier is not useful if you need paid add-ons to rebuild the workflow.",
    linkPath: "/best-email-marketing-for-small-business",
  },
  {
    topic: "email-no-marketing-team",
    headline:
      "Which email marketing tool is easiest for a small business with no marketing team?",
    body: "Prioritize the work you will repeat every week: importing contacts, building a campaign, automating welcome emails, editing a template, and reading results. The best platform is the one the business can keep using without specialist help.",
    linkPath: "/best-email-marketing-for-small-business",
  },
  {
    topic: "quickbooks-simple-alternative",
    headline:
      "What is the best QuickBooks alternative if you only need basic bookkeeping?",
    body: "Start with bank feeds, expense categorization, invoicing, tax-ready reports, payroll, and the integrations your accountant or POS actually needs. If those six jobs are simple, a full accounting suite may be more software than the business needs.",
    linkPath: "/best-accounting-software-for-small-business",
  },
  {
    topic: "quickbooks-overkill-solo",
    headline: "Is QuickBooks overkill for a one-person business?",
    body: "It can be if the workflow is just invoices, expenses, bank reconciliation, and a clean year-end report. But switching purely for price can backfire if your accountant, payroll, payment processor, or tax workflow depends on QuickBooks.",
    linkPath: "/best-accounting-software-for-freelancers",
  },
  {
    topic: "zendesk-small-support",
    headline: "Does a 3-person support team really need Zendesk?",
    body: "If the problem is only shared ownership of customer email, a lighter help desk may be enough. Zendesk becomes easier to justify when omnichannel routing, complex workflows, reporting, permissions, and integrations are real requirements rather than future possibilities.",
    linkPath: "/best-help-desk-for-small-business",
  },
  {
    topic: "shared-inbox-vs-helpdesk",
    headline:
      "When should a small business stop using a shared support inbox and buy a help desk?",
    body: "The trigger is usually not ticket volume alone. Look for missed ownership, duplicate replies, no reliable history, weak escalation, or reporting you cannot get from email. Buy the help desk when those failures cost more than the software.",
    linkPath: "/best-help-desk-for-small-business",
  },
  {
    topic: "lastpass-replacement-business",
    headline: "What should a small business replace LastPass with?",
    body: "Separate the decision into security model, admin controls, user experience, recovery, and deployment. Bitwarden appeals to teams that value open source and self-hosting; 1Password emphasizes polished team administration; Keeper goes deeper on business security controls.",
    linkPath: "/best-password-manager-for-businesses",
  },
  {
    topic: "bitwarden-vs-1password-team",
    headline: "Bitwarden or 1Password for a small team?",
    body: "Bitwarden is compelling when price, open-source transparency, or self-hosting matter. 1Password is compelling when user experience and small-team administration matter enough to pay more. Trial both with the least technical people on the team.",
    linkPath: "/best-password-manager-for-businesses",
  },
  {
    topic: "free-calendly-alternative",
    headline:
      "What free Calendly alternative actually works for a small business?",
    body: "Setmore is unusually useful for service teams because its free plan supports multiple user calendars and unlimited appointments. Cal.com is stronger for an individual who wants unlimited event types, multiple calendars, payments, and workflow flexibility without paying first.",
    linkPath: "/best-scheduling-software-for-small-business",
  },
  {
    topic: "calendly-worth-paying",
    headline: "Is Calendly worth paying for if you only need simple bookings?",
    body: "Not automatically. Pay when you specifically need multiple event types, more calendar connections, reminders, payments, team routing, or central administration. If one booking link does the job, the free tier may be enough.",
    linkPath: "/best-scheduling-software-for-small-business",
  },
  {
    topic: "jobber-vs-housecall-small",
    headline: "Jobber or Housecall Pro for a small home-service business?",
    body: "Model the actual crew size and workflow. Jobber is strong on transparent SMB operations and accounting integrations; Housecall Pro adds broader home-service automation and optional add-ons. The seat and add-on bill matters as much as the feature list.",
    linkPath: "/best-field-service-software-for-contractors",
  },
  {
    topic: "servicetitan-overkill-small",
    headline: "Is ServiceTitan overkill for a small contractor?",
    body: "It often is when the business mainly needs scheduling, quotes, invoices, payments, and a mobile field app. ServiceTitan is built for deeper dispatch, reporting, marketing, and larger operations, and pricing requires a sales conversation.",
    linkPath: "/best-field-service-software-for-contractors",
  },
  {
    topic: "shopify-vs-wix-small-business",
    headline: "Shopify or Wix for a small business that actually sells online?",
    body: "If ecommerce is the business, Shopify's dedicated commerce stack is usually the stronger shape. If the main need is a flexible business website that also takes orders, Wix can be simpler. Compare app fees, payment fees, and migration effort before choosing from the monthly price alone.",
    linkPath: "/best-ecommerce-platform-for-small-business",
  },
  {
    topic: "woocommerce-vs-shopify-total-cost",
    headline: "Is WooCommerce really cheaper than Shopify?",
    body: "WooCommerce core is free, but the store is not. Add hosting, paid extensions, maintenance, backups, security, and developer time before comparing it with a managed Shopify subscription.",
    linkPath: "/best-ecommerce-platform-for-small-business",
  },
  {
    topic: "mixpanel-vs-amplitude-budget",
    headline:
      "Mixpanel or Amplitude for a small product team with a tight budget?",
    body: "Do not compare the starter sticker price first. Model event volume, retention, monthly tracked users, data history, implementation effort, and who needs to answer questions without a data engineer.",
    linkPath: "/compare/amplitude-vs-mixpanel",
  },
  {
    topic: "software-budget-10-person-team",
    headline: "How much should a 10-person company actually spend on software?",
    body: "There is no useful universal number. Build the stack by job, then price each tool at 10 real seats and the usage level you expect. That exposes the difference between a low advertised entry price and the budget the team will actually carry.",
    linkPath: "/research/saas-pricing-pressure-index-2026",
  },
  {
    topic: "contact-sales-signal",
    headline:
      "What does 'Contact sales' tell you before you even talk to the vendor?",
    body: "It tells you the buying process is probably sales-led and the final price may depend on seats, usage, contract length, implementation, or negotiation. That is useful information when comparing the time and friction of the purchase, not just the software.",
    linkPath: "/research/saas-pricing-pressure-index-2026",
  },
  {
    topic: "ten-seat-real-cost",
    headline: "How much does this software really cost at 10 seats?",
    body: "Multiply the correct paid tier by the real seat count, then add minimum-seat rules, annual-billing requirements, usage limits, and paid add-ons. The headline price is often the least useful number for a team purchase.",
    linkPath: "/tools/saas-cost-calculator",
  },
];
