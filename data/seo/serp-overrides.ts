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
};

const COMPARISON_OVERRIDES: Readonly<Record<string, SerpMetadataOverride>> = {
  "adobe-analytics-vs-segment": {
    title: "Adobe Analytics vs Twilio Segment (2026)",
    description:
      "Adobe Analytics vs Twilio Segment: compare analytics and CDP workflows, platforms, pricing approach, and buyer fit using current vendor sources.",
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
