/**
 * CRM Plan-Gate Dataset 2026 -- hand-verified buyer-decision data for 7
 * CRM vendors, researched live against primary sources on 2026-09-27
 * during the Overnight Research + Trust Factory mission (see
 * docs/growth/receipts/20260927-research-night/dataset-audit.json for the
 * raw per-vendor research findings this file distills).
 *
 * This is explicitly NOT a "best CRM" ranking. There is no score, no
 * weighting, and no recommended vendor. Every boolean *OnEntryPlan field
 * is a factual read of whether that feature exists on the vendor's own
 * cheapest PAID plan (not the free tier, where one exists) -- a plan
 * requiring an upgrade for a feature is not a worse CRM, it is a
 * different packaging choice a buyer needs to know about before pricing
 * out a real team.
 */
export interface CrmPlanGateRow {
  /** Stable key for this dataset -- not necessarily a real Miloosh catalog slug. */
  key: string;
  /** The real Miloosh catalog software slug to link to, or null when no accurate match exists
   *  (e.g. the catalog's "monday" entry is monday.com's general work-management product, not
   *  the distinct monday CRM product priced here -- linking there would misrepresent it). */
  catalogSlug: string | null;
  vendor: string;
  officialPricingUrl: string;
  entryPlanName: string;
  entryPlanPrice: string;
  emailSyncGate: string;
  emailSyncOnEntryPlan: boolean | null;
  automationGate: string;
  automationOnEntryPlan: boolean | null;
  sequencesGate: string;
  sequencesOnEntryPlan: boolean | null;
  pipelineLimits: string;
  pipelinesUncapped: boolean | null;
  minimumSeats: string | null;
  /** "confirmed_none": a primary source explicitly states no minimum. "confirmed_minimum": a real minimum is stated (see minimumSeats for the number). "unknown": no primary source settles it either way. */
  minimumSeatsStatus: "confirmed_none" | "confirmed_minimum" | "unknown";
  contactScaling: string;
  annualBillingRequired: boolean | null;
  hasFreeTier: boolean | null;
  hasFreeTrial: boolean | null;
  trialDays: number | null;
  sourcesChecked: string[];
  confidence: "high" | "medium" | "low";
  unknownFields: string[];
}

export const CRM_PLAN_GATES: CrmPlanGateRow[] = [
  {
    key: "pipedrive",
    catalogSlug: "pipedrive",
    vendor: "Pipedrive",
    officialPricingUrl: "https://www.pipedrive.com/en/pricing",
    entryPlanName: "Lite",
    entryPlanPrice: "US$14/seat/month billed annually (US$24/seat/month billed monthly)",
    emailSyncGate: "Growth (and above). Lite includes no email sync at all. Growth/Premium/Ultimate include two-way sync of 1/3/5 email accounts per user respectively.",
    emailSyncOnEntryPlan: false,
    automationGate: "Growth (and above). Lite has no Workflow Automation. Growth unlocks 50 active automations/company (3 if/else steps); Premium 150/10; Ultimate 250/20.",
    automationOnEntryPlan: false,
    sequencesGate: "Growth (and above). Sequences do not exist on Lite. Growth includes 5 sequences/company, Premium 25, Ultimate 50.",
    sequencesOnEntryPlan: false,
    pipelineLimits: "No cap on the number of pipelines or stages on any plan. The tiered cap that does exist is on combined \"leads + deals\" records: Lite 2,500/seat, Growth 5,000/seat, Premium 15,000/seat, Ultimate 20,000/seat -- each capped at an absolute 300,000/company regardless of seat count.",
    pipelinesUncapped: true,
    minimumSeats: null,
    minimumSeatsStatus: "unknown",
    contactScaling: "\"Pipedrive has no usage limits for contacts\" on any plan (per Pipedrive's own usage-limits article). The separate \"leads + deals\" record type does scale by tier, as above.",
    annualBillingRequired: false,
    hasFreeTier: false,
    hasFreeTrial: true,
    trialDays: 14,
    sourcesChecked: [
      "https://www.pipedrive.com/en/pricing",
      "https://support.pipedrive.com/en/article/how-does-pricing-work-in-pipedrive",
      "https://support.pipedrive.com/en/article/new-pipedrive-plans",
      "https://support.pipedrive.com/en/article/email-sync",
      "https://support.pipedrive.com/en/article/sequences",
      "https://support.pipedrive.com/en/article/automation-limits",
      "https://support.pipedrive.com/en/article/usage-limits-in-pipedrive",
      "https://support.pipedrive.com/en/article/how-can-i-have-multiple-pipelines",
    ],
    confidence: "high",
    unknownFields: ["minimumSeats -- no Pipedrive-owned page states a minimum-seat requirement; third-party sites claim none, but that is not a primary-source confirmation"],
  },
  {
    key: "close",
    catalogSlug: "close",
    vendor: "Close",
    officialPricingUrl: "https://close.com/pricing",
    entryPlanName: "Solo",
    entryPlanPrice: "$9/user/month billed annually ($19/user/month billed monthly)",
    emailSyncGate: "No gate -- two-way email sync is included on all four plans (Solo, Essentials, Growth, Scale). Only the NUMBER of connected accounts is tiered: 3 accounts on Solo/Essentials, 10 on Growth/Scale.",
    emailSyncOnEntryPlan: true,
    automationGate: "Growth ($99/user/month annual) is the minimum tier. \"Automated Workflows\" is Not included on Solo or Essentials.",
    automationOnEntryPlan: false,
    sequencesGate: "Growth -- same gate as automation. Close markets this entirely under \"Automated Workflows\" today (its own developer API still calls the underlying object \"Sequences\"), and it is unavailable on Solo/Essentials.",
    sequencesOnEntryPlan: false,
    pipelineLimits: "No tier-based numeric cap disclosed. \"Pipelines\" is Included on all four plans with no count limit given (unlike Leads/Contacts, which explicitly say Unlimited). The only numeric limit found is a non-tiered cap of up to 300 opportunities per lead.",
    pipelinesUncapped: true,
    minimumSeats: null,
    minimumSeatsStatus: "unknown",
    contactScaling: "\"Leads\" capped at 10,000 on Solo; Unlimited on Essentials/Growth/Scale. \"Contacts\" (individual people) are Unlimited on all four plans, including Solo.",
    annualBillingRequired: true,
    hasFreeTier: false,
    hasFreeTrial: true,
    trialDays: 14,
    sourcesChecked: [
      "https://close.com/pricing",
      "https://help.close.com/docs/plans-and-billing",
      "https://www.close.com/changelog/starter-plan",
      "https://help.close.com/docs/email-sequences",
      "https://help.close.com/docs/connect-your-email",
      "https://developer.close.com/api/resources/sequences",
    ],
    confidence: "high",
    unknownFields: [
      "Explicit minimum-seat-count policy for Essentials/Growth/Scale (pricing shows per-seat from 1 user; Solo is capped at a maximum of 1 user, but no minimum is stated for the other three)",
      "Exact numeric cap, if any, on pipelines or pipeline stages",
    ],
  },
  {
    key: "hubspot",
    catalogSlug: "hubspot",
    vendor: "HubSpot (Sales Hub)",
    officialPricingUrl: "https://www.hubspot.com/pricing/sales",
    entryPlanName: "Sales Hub Starter",
    entryPlanPrice: "$20/seat/month billed monthly; $7/seat/month billed annually. Sits above a permanently free $0/month CRM (up to 2 users), which is not counted as a paid plan here.",
    emailSyncGate: "Free tier. Two-way inbox connection (Gmail, Outlook, Microsoft Exchange) is listed under HubSpot's Free Tools and available on every plan, including Free -- no paid plan is required for sync itself.",
    emailSyncOnEntryPlan: true,
    automationGate: "Sales Hub Starter, with restrictions: \"Up to 50 workflows with restricted triggers and actions.\" Full automation requires Professional (300 workflows) or Enterprise (1,000, plus the ability to trigger sequences).",
    automationOnEntryPlan: true,
    sequencesGate: "Sales Hub Professional. Sequences are listed only under Professional (5,000/account) and Enterprise (same cap, higher daily send limits) -- no Sequences row exists for Free or Starter.",
    sequencesOnEntryPlan: false,
    pipelineLimits: "Free: 1 pipeline per object type. Starter: 15 total pipelines/account. Professional: 100. Enterprise: 350.",
    pipelinesUncapped: false,
    minimumSeats: null,
    minimumSeatsStatus: "confirmed_none",
    contactScaling: "Free CRM caps at 1,000 contacts. Paid tiers have no fixed public per-tier contact ceiling; HubSpot states an overall platform maximum of up to 15 million contacts, with each account's actual limit set per contract.",
    annualBillingRequired: true,
    hasFreeTier: true,
    hasFreeTrial: true,
    trialDays: 14,
    sourcesChecked: [
      "https://www.hubspot.com/pricing/sales",
      "https://legal.hubspot.com/hubspot-product-and-services-catalog",
      "https://knowledge.hubspot.com/connected-email/connect-your-inbox-to-hubspot",
      "https://www.hubspot.com/products/sales",
    ],
    confidence: "high",
    unknownFields: ["Exact published per-tier contact/record cap for paid Starter/Professional/Enterprise plans -- HubSpot discloses only an overall 15-million-contact platform ceiling, set per account by contract"],
  },
  {
    key: "zoho-crm",
    catalogSlug: "zoho-crm",
    vendor: "Zoho CRM",
    officialPricingUrl: "https://www.zoho.com/crm/pricing.html",
    entryPlanName: "Standard",
    entryPlanPrice: "$14/user/month billed annually (about $20/user/month billed monthly)",
    emailSyncGate: "Standard (the entry paid tier). Real two-way email sync (IMAP/POP3/Gmail API/Graph API) is unchecked on Free and checked starting at Standard. (The separate \"SalesInbox\" unified client is Enterprise/Ultimate only, but underlying sync is available from Standard.)",
    emailSyncOnEntryPlan: true,
    automationGate: "Free. Basic workflow rules exist even on the Free edition (10 rules/module, 5 active). Standard raises this to 30/15, Professional 80/40, Enterprise 125/75, Ultimate 150/100.",
    automationOnEntryPlan: true,
    sequencesGate: "Standard. Zoho calls this \"Cadences.\" Not available on Free; available from Standard (20 cadences/module, 10 active, 18 follow-up steps max), scaling up through higher tiers.",
    sequencesOnEntryPlan: true,
    pipelineLimits: "Free and Standard: limited to the single default sales pipeline. Professional: up to 5. Enterprise: up to 10. Ultimate: up to 20.",
    pipelinesUncapped: false,
    minimumSeats: null,
    minimumSeatsStatus: "confirmed_none",
    contactScaling: "Record/data storage scales by tier: Free ~5,000 records (~10MB), Standard ~100,000 records (~200MB), Professional/Enterprise ~10GB (~5M records), Ultimate ~30GB (~15M records).",
    annualBillingRequired: false,
    hasFreeTier: true,
    hasFreeTrial: true,
    trialDays: 15,
    sourcesChecked: [
      "https://www.zoho.com/crm/pricing.html",
      "https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf",
      "https://help.zoho.com/portal/en/kb/crm/connect-with-customers/email/user-functions/articles/email-configuration-for-imap-and-pop3",
    ],
    confidence: "high",
    unknownFields: [],
  },
  {
    key: "freshsales",
    catalogSlug: "freshsales",
    vendor: "Freshsales (Freshworks CRM)",
    officialPricingUrl: "https://www.freshworks.com/crm/pricing/",
    entryPlanName: "Growth",
    entryPlanPrice: "$9/user/month billed annually ($11/user/month billed monthly)",
    emailSyncGate: "Growth (entry paid plan) and above -- two-way email sync is absent on the Free plan and present from Growth up through Pro and Enterprise.",
    emailSyncOnEntryPlan: true,
    automationGate: "Growth includes \"Basic workflows\" (~20 cap per Freshworks help doc). Pro raises this to \"Custom\" workflows (~50 cap); Enterprise has the highest/no stated cap. Free has none.",
    automationOnEntryPlan: true,
    sequencesGate: "Pro. Freshworks' current live pricing page lists Sales sequences as new at Pro (not Growth or Free); an older help doc's conflicting claim of a capped Growth allowance was treated as stale.",
    sequencesOnEntryPlan: false,
    pipelineLimits: "Growth and Free: limited to a single sales pipeline. \"Multiple sales pipelines\" unlocks starting at Pro; no numeric maximum disclosed for Pro/Enterprise.",
    pipelinesUncapped: false,
    minimumSeats: null,
    minimumSeatsStatus: "unknown",
    contactScaling: "Not stated on the main pricing page for plain Freshsales. A Freshworks help doc for the bundled \"Freshsales Suite\" (same plan names/prices) lists Free 100 active contacts, Growth 1,000, Pro 3,000, no cap stated for Enterprise -- not independently re-confirmed for the plain, non-Suite SKU.",
    annualBillingRequired: true,
    hasFreeTier: true,
    hasFreeTrial: true,
    trialDays: 21,
    sourcesChecked: [
      "https://www.freshworks.com/crm/pricing/",
      "https://www.freshworks.com/crm/software/free/",
      "https://crmsupport.freshworks.com/support/solutions/articles/50000002465-how-to-activate-the-free-plan",
      "https://crmsupport.freshworks.com/support/solutions/articles/50000002466-what-are-the-features-you-tend-to-lose-on-downgrade-",
      "https://dam.freshworks.com/m/4bf615e1eea87a7/original/Freshworks-Price-List.pdf",
    ],
    confidence: "high",
    unknownFields: [
      "minimumSeats -- no primary source states a minimum for any plan",
      "exact contact/record caps for the plain (non-Suite) Freshsales SKU specifically",
      "exact maximum pipeline count for Pro/Enterprise (only confirmed as \"more than one\")",
    ],
  },
  {
    key: "salesforce-sales-cloud",
    catalogSlug: "salesforce",
    vendor: "Salesforce (Sales Cloud)",
    officialPricingUrl: "https://www.salesforce.com/sales/pricing/",
    entryPlanName: "Starter Suite",
    entryPlanPrice: "$25/user/month (billed monthly or annually). Sits above a $0/user/month Free Suite tier whose sync coverage could not be confirmed.",
    emailSyncGate: "Starter Suite ($25/user/month) is the minimum plan that explicitly advertises \"AI Automatically Syncs Emails, Events, and Contacts.\" The $0 Free Suite tier's own feature list does not mention this.",
    emailSyncOnEntryPlan: true,
    automationGate: "Flow Builder is Included starting at the $0 Free Suite tier (capped at 5 flows/org) -- so it is also present on Starter Suite. Pro Suite ($100/user/month) adds \"greater customization and automation.\"",
    automationOnEntryPlan: true,
    sequencesGate: "Sold separately as \"Sales Engagement,\" a $50/user/month add-on. Bundled at no extra cost only starting at Advanced ($395/user/month) and Max ($550/user/month). Whether it can be purchased as an add-on specifically on Starter Suite/Pro Suite was not confirmed by the pricing pages.",
    sequencesOnEntryPlan: false,
    pipelineLimits: "No explicit numeric cap on pipelines, deals, or stages found on the official pricing page for any tier.",
    pipelinesUncapped: null,
    minimumSeats: null,
    minimumSeatsStatus: "unknown",
    contactScaling: "No hard contact/record ceiling stated per tier; scaling is expressed via unquantified \"Data Storage Per User\" / \"File Storage Per User\" rows. The only explicit number found (2,000 leads/contacts) applies to the 30-day free trial only, not to any subscription.",
    annualBillingRequired: false,
    hasFreeTier: true,
    hasFreeTrial: true,
    trialDays: 30,
    sourcesChecked: [
      "https://www.salesforce.com/sales/pricing/",
      "https://www.salesforce.com/sales/free-trial/overview/?d=pb",
      "https://www.salesforce.com/news/stories/salesforce-simplifies-editions-2026/",
      "https://www.salesforce.com/sales/engagement-platform/pricing/",
      "https://www.salesforce.com/editions-pricing/sales-cloud/sales-engagement/",
    ],
    confidence: "high",
    unknownFields: [
      "pipelineLimits -- no explicit numeric cap found on the primary pricing page",
      "minimumSeats -- no minimum-seat language found",
      "exact per-tier data/file storage figures (rows exist in the comparison table but values were not reliably extractable)",
      "whether the $0 Free Suite tier includes email/event/contact sync (only confirmed from Starter Suite up)",
      "whether Sales Engagement can be purchased as an add-on on Starter Suite/Pro Suite specifically, or only from Core upward",
    ],
  },
  {
    key: "monday-crm",
    catalogSlug: null,
    vendor: "monday CRM",
    officialPricingUrl: "https://monday.com/crm/pricing",
    entryPlanName: "Basic",
    entryPlanPrice: "$12/seat/month billed annually ($18/seat/month billed monthly); flat per seat across the 3-50 seat range.",
    emailSyncGate: "Standard. Two-way Gmail/Outlook inbox sync is not on Basic; monday's help doc confirms it starts at Standard.",
    emailSyncOnEntryPlan: false,
    automationGate: "Standard. No automation allotment exists on Basic. Standard includes 250 custom automation actions/month; Pro raises this to 25,000/month; Ultimate is effectively unlimited.",
    automationOnEntryPlan: false,
    sequencesGate: "Pro. \"Set email sequences\" is listed under Pro's \"Includes Standard, plus...\" -- not available on Basic or Standard.",
    sequencesOnEntryPlan: false,
    pipelineLimits: "No cap found. monday's help doc states plainly for Basic: \"Unlimited customizable pipelines.\" Higher tiers are therefore also unlimited.",
    pipelinesUncapped: true,
    minimumSeats: "3 seats minimum to purchase any paid plan. Beyond 40 seats, monday directs buyers to a custom quote.",
    minimumSeatsStatus: "confirmed_minimum",
    contactScaling: "\"Active contacts & deals\" caps scale by tier per the live pricing page: Basic 1,000 / Standard 10,000 / Pro 100,000 / Ultimate Unlimited. (A monday help article instead states Pro is Unlimited -- the live pricing page was treated as authoritative since it is the primary source of record.)",
    annualBillingRequired: false,
    hasFreeTier: false,
    hasFreeTrial: true,
    trialDays: 14,
    sourcesChecked: [
      "https://monday.com/crm/pricing",
      "https://monday.com/crm/features",
      "https://support.monday.com/hc/en-us/articles/25760992782226-Available-plan-types-on-monday-CRM",
    ],
    confidence: "high",
    unknownFields: [],
  },
];
