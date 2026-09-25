export type SerpMetadataOverride = {
  title: string;
  description: string;
};

const SOFTWARE_OVERRIDES: Readonly<Record<string, SerpMetadataOverride>> = {
  airtable: {
    title: "Airtable Pricing & Alternatives (2026): Notion, Monday",
    description:
      "Check Airtable pricing, buyer fit, drawbacks and alternatives, including Airtable vs Notion and Monday, using current vendor-sourced facts.",
  },
  todoist: {
    title: "Todoist Pricing & Alternatives (2026): TickTick, Microsoft To Do",
    description:
      "Check Todoist pricing, buyer fit, drawbacks and alternatives, including Todoist vs TickTick and Microsoft To Do, using current vendor-sourced facts.",
  },
  close: {
    title: "Close CRM Pricing & Alternatives (2026): Pipedrive, HubSpot",
    description:
      "Check Close CRM pricing, buyer fit, drawbacks and alternatives, including Close vs Pipedrive and HubSpot, using current vendor-sourced facts.",
  },
  setmore: {
    title: "Setmore Pricing & Alternatives (2026): Calendly, Acuity",
    description:
      "Check Setmore pricing, buyer fit, drawbacks and alternatives, including Setmore vs Calendly and Acuity Scheduling, using current vendor-sourced facts.",
  },
  elevenlabs: {
    title: "ElevenLabs Pricing & Alternatives (2026): Murf AI, Descript",
    description:
      "Check ElevenLabs pricing, buyer fit, drawbacks and alternatives, including ElevenLabs vs Murf AI and Descript, using current vendor-sourced facts.",
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
