import { HUMAN_REVIEWED_PROFILES } from "@/data/seo/human-reviews";
import type { Software } from "@/data/software";
import { formatIsoDate } from "@/lib/date";

export type ReviewStatus = {
  /** The date the product's facts were last checked against its official sources (the profile's own accessed date). */
  checkedOn: string;
  /** The date its pricing was last verified, when pricing is recorded. */
  pricingVerifiedOn: string | null;
  /** The date a person reviewed the page, only when the owner has marked it. */
  humanReviewedOn: string | null;
};

/** What the page may truthfully say about its own freshness and review. Never invents a review. */
export function getReviewStatus(software: Pick<Software, "slug" | "accessedAt" | "pricing">, humanReviews: Readonly<Record<string, string>> = HUMAN_REVIEWED_PROFILES): ReviewStatus {
  return {
    checkedOn: software.accessedAt,
    pricingVerifiedOn: software.pricing?.lastVerified ?? null,
    humanReviewedOn: humanReviews[software.slug] ?? null,
  };
}

/** The single sentence shown under the page introduction. */
export function describeReviewStatus(status: ReviewStatus): string {
  const parts = [`Last reviewed ${formatIsoDate(status.checkedOn)} against the vendor's official sources.`];
  if (status.pricingVerifiedOn) parts.push(`Pricing last verified ${formatIsoDate(status.pricingVerifiedOn)}.`);
  if (status.humanReviewedOn) parts.push(`Reviewed by a person on ${formatIsoDate(status.humanReviewedOn)}.`);
  return parts.join(" ");
}
