import type { FirstRevenuePage } from "@/data/revenue/first-revenue-cohort";

export type FirstRevenueSupportingGuide = {
  primarySlug: FirstRevenuePage["slug"];
  guideSlug: string;
  label: string;
  role: "supporting_discovery";
};

/**
 * Supporting discovery/decision hubs only.
 *
 * The PRIMARY first-revenue cohort is the five /software/[slug] pages in
 * data/revenue/first-revenue-cohort.ts. These guides exist only to route
 * qualified readers toward those primary product decision pages.
 */
export const FIRST_REVENUE_SUPPORTING_GUIDES: readonly FirstRevenueSupportingGuide[] = [
  {
    primarySlug: "airtable",
    guideSlug: "best-no-code-database-for-operations",
    label: "No-code database for operations",
    role: "supporting_discovery",
  },
  {
    primarySlug: "todoist",
    guideSlug: "best-task-management-for-individuals",
    label: "Task management for individuals",
    role: "supporting_discovery",
  },
  {
    primarySlug: "close",
    guideSlug: "best-crm-for-startups",
    label: "CRM for startups",
    role: "supporting_discovery",
  },
  {
    primarySlug: "setmore",
    guideSlug: "best-scheduling-software-for-small-business",
    label: "Scheduling for small business",
    role: "supporting_discovery",
  },
  {
    primarySlug: "elevenlabs",
    guideSlug: "best-voice-ai-for-creators",
    label: "Voice AI for creators",
    role: "supporting_discovery",
  },
] as const;

export const FIRST_REVENUE_SUPPORTING_GUIDE_SLUGS = new Set(
  FIRST_REVENUE_SUPPORTING_GUIDES.map((guide) => guide.guideSlug),
);

export function getFirstRevenueSupportForGuide(guideSlug: string): FirstRevenueSupportingGuide | undefined {
  return FIRST_REVENUE_SUPPORTING_GUIDES.find((guide) => guide.guideSlug === guideSlug);
}
