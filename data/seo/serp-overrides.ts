export type SerpMetadataOverride = {
  title: string;
  description: string;
};

const SOFTWARE_OVERRIDES: Readonly<Record<string, SerpMetadataOverride>> = {
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
