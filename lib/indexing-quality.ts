import type { Software } from "@/data/software";

export const INDEXING_CONTENT_FRESH_DAYS = 90;
export const INDEXING_PRICING_FRESH_DAYS = 90;

function ageDays(isoDate: string, now: Date): number {
  const timestamp = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - timestamp) / (24 * 60 * 60 * 1000));
}

export type IndexingQualityReason =
  | "pricing-evidence"
  | "pricing-freshness"
  | "content-freshness"
  | "documented-constraints"
  | "source-coverage"
  | "feature-depth"
  | "buyer-fit";

export function getSoftwareIndexingQualityReasons(
  software: Software,
  now: Date = new Date()
): IndexingQualityReason[] {
  const reasons: IndexingQualityReason[] = [];
  const pricing = software.pricing;

  const hasPricingEvidence = Boolean(
    pricing?.officialSource &&
      pricing.lastVerified &&
      ((pricing.model && pricing.model !== "unknown") ||
        (pricing.status && pricing.status !== "unknown"))
  );
  if (!hasPricingEvidence) reasons.push("pricing-evidence");

  if (
    !pricing?.lastVerified ||
    ageDays(pricing.lastVerified, now) > INDEXING_PRICING_FRESH_DAYS
  ) {
    reasons.push("pricing-freshness");
  }

  if (ageDays(software.accessedAt, now) > INDEXING_CONTENT_FRESH_DAYS) {
    reasons.push("content-freshness");
  }

  if (!software.cons?.length) {
    reasons.push("documented-constraints");
  }

  const sourceUrls = new Set(
    [...software.sources, pricing?.officialSource]
      .filter((value): value is string => Boolean(value))
  );
  if (sourceUrls.size < 2) {
    reasons.push("source-coverage");
  }

  if (software.features.length < 4) {
    reasons.push("feature-depth");
  }

  if (software.bestFor.trim().length < 40) {
    reasons.push("buyer-fit");
  }

  return reasons;
}

export function isSoftwareIndexingReady(
  software: Software,
  now: Date = new Date()
): boolean {
  return getSoftwareIndexingQualityReasons(software, now).length === 0;
}

export function isComparisonIndexingReady(
  softwareA: Software,
  softwareB: Software,
  now: Date = new Date()
): boolean {
  return (
    isSoftwareIndexingReady(softwareA, now) &&
    isSoftwareIndexingReady(softwareB, now)
  );
}
