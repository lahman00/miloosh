export type SerpMetadataOverride = {
  title: string;
  description: string;
};

const SOFTWARE_OVERRIDES: Readonly<Record<string, SerpMetadataOverride>> = {
  // First-revenue cohort: every measured decision query is alternatives-led
  // (data/revenue/first-revenue-cohort.ts), and the H1 is "Best X alternatives".
  // Named competitors must be ones the page actually compares.
  airtable: {
    title: "Airtable Alternatives & Pricing (2026): Notion, Coda, Monday",
    description:
      "Compare Airtable alternatives and competitors, including Notion, Coda and Monday, with current pricing, record limits, buyer fit and switching checks.",
  },
  todoist: {
    title: "Todoist Alternatives & Pricing (2026): TickTick, Any.do, Things",
    description:
      "Compare the best Todoist alternatives, including TickTick, Any.do and Things, with Todoist pricing, free-plan limits, buyer fit and switching checks.",
  },
  close: {
    title: "Close CRM Alternatives & Pricing (2026): Pipedrive, HubSpot",
    description:
      "Compare Close CRM alternatives, including Pipedrive, HubSpot and Freshsales, with current Close pricing, plan limits, buyer fit and switching checks.",
  },
  setmore: {
    title: "Setmore Alternatives & Pricing (2026): Acuity, Calendly",
    description:
      "Compare Setmore alternatives, including Acuity Scheduling, Calendly and Doodle, with Setmore pricing, free-plan limits, buyer fit and switching checks.",
  },
  elevenlabs: {
    title: "ElevenLabs Alternatives & Pricing (2026): Murf AI, Descript",
    description:
      "Compare ElevenLabs alternatives, including Murf AI, Descript and Synthesia, with current ElevenLabs pricing, credit limits, buyer fit and switching checks.",
  },
  postmark: {
    title: "Best Postmark Alternatives (2026)",
    description:
      "Compare Postmark alternatives for transactional email, current pricing, and EU data residency. Postmark stores customer and processed data in the US.",
  },
  semrush: {
    title: "Best Semrush Alternatives & Competitors (2026)",
    description:
      "Compare Semrush alternatives and competitors for SEO, content, and marketing workflows using current vendor-sourced features, platforms, and pricing details.",
  },
  freshdesk: {
    title: "Best Freshdesk Alternatives & Competitors (2026)",
    description:
      "Compare Freshdesk alternatives and competitors for customer support and help desk workflows using current vendor-sourced features, platforms, pricing, and fit.",
  },
  intercom: {
    title: "Best Intercom Alternatives & Competitors (2026)",
    description:
      "Compare Intercom alternatives and competitors for customer support and messaging workflows using current vendor-sourced features, platforms, pricing, and fit.",
  },
  front: {
    title: "Best Front Alternatives & Competitors (2026)",
    description:
      "Compare Front alternatives and competitors for shared inbox and customer operations workflows using current vendor-sourced features, platforms, pricing, and fit.",
  },
  buffer: {
    title: "Best Buffer Alternatives & Competitors (2026)",
    description:
      "Compare Buffer alternatives and competitors for social media publishing and management using current vendor-sourced features, platforms, pricing, and fit.",
  },
  "help-scout": {
    title: "Best Help Scout Alternatives & Competitors (2026)",
    description:
      "Compare Help Scout alternatives and competitors for customer support workflows using current vendor-sourced features, platforms, pricing, and fit.",
  },
};

const COMPARISON_OVERRIDES: Readonly<Record<string, SerpMetadataOverride>> = {
  "wix-vs-shopify": {
    title: "Wix vs Shopify (2026): Pricing, Drawbacks & Best Fit",
    description:
      "Compare Wix vs Shopify pricing, buyer fit, drawbacks, migration considerations and alternatives using current vendor-sourced facts.",
  },
  "monday-vs-airtable": {
    title: "Monday vs Airtable (2026): Pricing, Limits & Best Fit",
    description:
      "Compare Monday vs Airtable pricing, seat and record limits, buyer fit, drawbacks and alternatives using current vendor-sourced facts.",
  },
  "constant-contact-vs-getresponse": {
    title: "Constant Contact vs GetResponse (2026): Pricing & Fit",
    description:
      "Compare Constant Contact vs GetResponse pricing, automation depth, support, drawbacks and buyer fit using current vendor-sourced facts.",
  },
  "mailerlite-vs-moosend": {
    title: "MailerLite vs Moosend (2026): Pricing, Automation & Fit",
    description:
      "Compare MailerLite vs Moosend pricing, free-plan tradeoffs, automation limits, drawbacks and buyer fit using current vendor-sourced facts.",
  },
  "surveymonkey-vs-jotform": {
    title: "SurveyMonkey vs Jotform (2026): Pricing, Limits & Fit",
    description:
      "Compare SurveyMonkey vs Jotform pricing, survey and form limits, drawbacks, alternatives and buyer fit using current vendor-sourced facts.",
  },
  "adobe-analytics-vs-segment": {
    title: "Adobe Analytics vs Twilio Segment (2026)",
    description:
      "Adobe Analytics vs Twilio Segment: compare analytics and CDP workflows, platforms, pricing approach, and buyer fit using current vendor sources.",
  },
  "docker-vs-vercel": {
    title: "Docker vs Vercel (2026): Deployment & Hosting Compared",
    description:
      "Docker vs Vercel: compare container-based deployment with managed frontend hosting, including workflow, platform fit, pricing approach, and tradeoffs.",
  },
  "github-vs-render": {
    title: "GitHub vs Render (2026): Code Hosting vs App Deployment",
    description:
      "GitHub vs Render: compare source-code collaboration with managed application deployment, including workflows, platform fit, pricing approach, and tradeoffs.",
  },
  "microsoft-teams-vs-signal": {
    title: "Microsoft Teams vs Signal (2026): Work Chat vs Private Messaging",
    description:
      "Microsoft Teams vs Signal: compare workplace collaboration with private messaging, including calling, group communication, platform support, and buyer fit.",
  },
  "canva-vs-lucidchart": {
    title: "Canva vs Lucidchart (2026): Design vs Diagramming Compared",
    description:
      "Canva vs Lucidchart: compare visual content creation with diagramming and collaborative whiteboarding, including workflows, platforms, and buyer fit.",
  },
  "google-chat-vs-signal": {
    title: "Google Chat vs Signal (2026): Work Chat vs Private Messaging",
    description:
      "Google Chat vs Signal: compare workplace messaging with privacy-focused communication, including group chat, calling, platform support, and buyer fit.",
  },
  "jenkins-vs-sentry": {
    title: "Jenkins vs Sentry (2026): CI/CD vs Error Monitoring",
    description:
      "Jenkins vs Sentry: compare CI/CD automation with application error monitoring, including workflows, integrations, platform fit, and buyer tradeoffs.",
  },
  // Google Indexation Factory Wave 2 mission (2026-09-26) comparison-page
  // treatment cohort -- each pair confirmed "Crawled - currently not
  // indexed" via live GSC URL Inspection before this change, chosen where
  // at least one side already has real, sourced pricing/cons from this
  // wave's software-page treatment (data/software/*.json), so the
  // comparison page's auto-generated pricing table and pros/cons section
  // were already deepened as a side effect -- these titles/descriptions
  // align search intent with that now-real content rather than a generic
  // "compare these two tools" framing.
  "directus-vs-strapi": {
    title: "Directus vs Strapi (2026): Pricing, Licensing & Fit",
    description:
      "Compare Directus vs Strapi pricing, licensing terms, database-wrapper versus schema-first architecture, and buyer fit using current vendor-sourced facts.",
  },
  "crazy-egg-vs-matomo": {
    title: "Crazy Egg vs Matomo (2026): Heatmaps vs Analytics",
    description:
      "Compare Crazy Egg vs Matomo pricing, self-hosting requirements, CRO tooling versus traffic analytics, and buyer fit using current vendor-sourced facts.",
  },
  "gorgias-vs-kayako": {
    title: "Gorgias vs Kayako (2026): Pricing & AI Fees Compared",
    description:
      "Compare Gorgias vs Kayako pricing, per-resolution AI fees, ecommerce fit, and buyer tradeoffs using current vendor-sourced facts.",
  },
  "1password-vs-auth0": {
    title: "1Password vs Auth0 (2026): Vault vs Developer Auth",
    description:
      "Compare 1Password vs Auth0: credential vaulting versus developer authentication APIs, current pricing, and which one actually fits the job.",
  },
  "circleci-vs-jenkins": {
    title: "CircleCI vs Jenkins (2026): Managed vs Self-Hosted CI/CD",
    description:
      "Compare CircleCI vs Jenkins pricing, hosting responsibility, plugin-security burden, and buyer fit using current vendor-sourced facts.",
  },
  "keeper-security-vs-okta": {
    title: "Keeper Security vs Okta (2026): Vault vs Workforce Identity",
    description:
      "Compare Keeper Security vs Okta: password vaulting versus full workforce identity and access management, current pricing, and buyer fit.",
  },
  "kong-vs-plaid": {
    title: "Kong vs Plaid (2026): API Gateway vs Financial Data",
    description:
      "Compare Kong vs Plaid: general API management versus financial account and transaction data access, pricing transparency, and buyer fit.",
  },
  "microsoft-teams-vs-mattermost": {
    title: "Microsoft Teams vs Mattermost (2026): Pricing & Fit",
    description:
      "Compare Microsoft Teams vs Mattermost pricing transparency, self-hosted data sovereignty, and buyer fit using current vendor-sourced facts.",
  },
  "obsidian-vs-evernote": {
    title: "Obsidian vs Evernote (2026): Local Files vs Cloud Notes",
    description:
      "Compare Obsidian vs Evernote pricing, local-first versus cloud-synced storage, and buyer fit using current vendor-sourced facts.",
  },
  "okta-vs-wiz": {
    title: "Okta vs Wiz (2026): Identity vs Cloud Security",
    description:
      "Compare Okta vs Wiz: workforce identity and access management versus cloud security posture management, current pricing, and buyer fit.",
  },
  "things-vs-toggl-track": {
    title: "Things vs Toggl Track (2026): Tasks vs Time Tracking",
    description:
      "Compare Things vs Toggl Track: one-time-purchase task management versus subscription time tracking, current pricing, and buyer fit.",
  },
  "close-vs-nutshell": {
    title: "Close vs Nutshell (2026): CRM Pricing & Fit",
    description:
      "Compare Close vs Nutshell CRM pricing, automation depth, and buyer fit using current vendor-sourced facts.",
  },
  // Ranking War Phase IV (2026-09-26) — real GSC query evidence for
  // /software/umbraco shows its single largest query ("umbraco vs
  // wordpress", 116 impressions) is a head-to-head comparison intent that
  // this already-published comparison page should own, but the page
  // currently gets 0 recorded impressions of its own while the generic
  // software page absorbs all of them. The internal link already exists
  // (software page -> comparison page via getComparisonsInvolving); the
  // real, specific angle these overrides add is Umbraco's actual
  // distinguishing fact (a .NET-based CMS, unlike these PHP-based
  // alternatives), not a generic "vs" template.
  "umbraco-vs-wordpress": {
    title: "Umbraco vs WordPress (2026): .NET CMS vs PHP Publishing",
    description:
      "Compare Umbraco's .NET-based CMS with WordPress's PHP publishing platform, including pricing, hosting model, and buyer fit using current vendor-sourced facts.",
  },
  "joomla-vs-umbraco": {
    title: "Umbraco vs Joomla (2026): .NET CMS vs Open-Source PHP CMS",
    description:
      "Compare Umbraco's .NET-based CMS with Joomla's free, open-source PHP CMS, including pricing, hosting, and buyer fit using current vendor-sourced facts.",
  },
  "drupal-vs-umbraco": {
    title: "Umbraco vs Drupal (2026): .NET CMS vs API-First Drupal",
    description:
      "Compare Umbraco's .NET-based CMS with Drupal's API-first, open-source platform, including pricing, structure, and buyer fit using current vendor-sourced facts.",
  },
};

export function getSoftwareSerpOverride(slug: string): SerpMetadataOverride | undefined {
  return SOFTWARE_OVERRIDES[slug];
}

export function getComparisonSerpOverride(slug: string): SerpMetadataOverride | undefined {
  return COMPARISON_OVERRIDES[slug];
}

export function getComparisonSearchIntentNote(slug: string): string | undefined {
  if (slug === "adobe-analytics-vs-segment") {
    return "This page compares Adobe Analytics with Twilio Segment, the customer data platform. It is not a guide to creating or comparing segments inside Adobe Analytics.";
  }
  return undefined;
}

export type SoftwareSearchIntentNote = {
  text: string;
  href?: string;
  linkLabel?: string;
};

const SOFTWARE_SEARCH_INTENT_NOTES: Readonly<Record<string, SoftwareSearchIntentNote>> = {
  freshdesk: {
    text: "Freshdesk and Freshservice are different products. This page covers Freshdesk for customer support; if you meant Freshservice for IT service management, use the Freshservice research page instead.",
    href: "/software/freshservice",
    linkLabel: "See Freshservice alternatives",
  },
};

export function getSoftwareSearchIntentNote(slug: string): SoftwareSearchIntentNote | undefined {
  return SOFTWARE_SEARCH_INTENT_NOTES[slug];
}
