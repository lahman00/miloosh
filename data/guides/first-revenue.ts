/**
 * Supporting discovery/decision hubs for the First Revenue cohort.
 *
 * These guides are SUPPORTING assets only. The primary commercial cohort lives
 * in data/revenue/first-revenue-cohort.ts and is intentionally limited to five
 * /software/[slug] pages.
 */

import type { FirstRevenuePrimarySlug } from "@/data/revenue/first-revenue-cohort";

export type FirstRevenueSupportingGuide = {
  primarySlug: FirstRevenuePrimarySlug;
  guideSlug: string;
  role: "supporting_discovery";
};

export const FIRST_REVENUE_SUPPORTING_GUIDES: readonly FirstRevenueSupportingGuide[] = [
  { primarySlug: "airtable", guideSlug: "best-no-code-database-for-operations", role: "supporting_discovery" },
  { primarySlug: "todoist", guideSlug: "best-task-management-for-individuals", role: "supporting_discovery" },
  { primarySlug: "close", guideSlug: "best-crm-for-startups", role: "supporting_discovery" },
  { primarySlug: "setmore", guideSlug: "best-scheduling-software-for-small-business", role: "supporting_discovery" },
  { primarySlug: "elevenlabs", guideSlug: "best-voice-ai-for-creators", role: "supporting_discovery" },
] as const;

const BY_GUIDE = new Map(
  FIRST_REVENUE_SUPPORTING_GUIDES.map((entry) => [entry.guideSlug, entry] as const),
);

export function getFirstRevenueSupportForGuide(guideSlug: string): FirstRevenueSupportingGuide | undefined {
  return BY_GUIDE.get(guideSlug);
}
