import type { Software } from "@/data/software";
import { getComparisonsInvolving } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship } from "@/data/affiliate/canonical-ledger";
import { getAffiliateProgram } from "@/lib/revenue/affiliate-manager";
import { getCategoryValueScore } from "@/lib/revenue/category-value";

/**
 * Static repository revenue-opportunity scoring.
 *
 * Affiliate availability is about MILOOSH'S current relationship, not merely
 * whether a vendor has a public affiliate program. A rejected Miloosh
 * application must therefore score zero even when the vendor still accepts
 * other publishers. Public-program research is only a low-confidence fallback
 * when no Miloosh relationship exists.
 *
 * `buyingIntentScore` is retained as a compatibility field name, but its input
 * is only published comparison COVERAGE. Comparison supply is not user behavior
 * and must never be described as measured buying intent.
 */

export type RevenueScoreBreakdown = {
  slug: string;
  affiliateAvailabilityScore: number;
  categoryValueScore: number;
  commercialIntentScore: number;
  /** Legacy field name: this is comparison-coverage score, not measured user buying intent. */
  buyingIntentScore: number;
  /** 0-100, weighted sum of the four scores above. */
  totalScore: number;
};

const activeSlugs = new Set(ACTIVE_PARTNERS.filter((partner) => Boolean(partner.affiliateUrl)).map((partner) => partner.slug as string));

function preferredRelationship(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

/** 0-10. Scores current Miloosh monetization readiness, not generic vendor-program existence. */
function scoreAffiliateAvailability(slug: string): number {
  if (activeSlugs.has(slug)) return 10;

  const relationship = preferredRelationship(slug);
  if (relationship) {
    switch (relationship.status) {
      case "READY_AND_VERIFIED":
      case "APPROVED_NEEDS_LINK":
      case "APPROVED_NEEDS_EDITORIAL_CONTENT":
        return 8;
      case "PENDING_REVIEW":
        return 6;
      case "OWNER_ACTION_REQUIRED":
      case "BLOCKED_FORM_DEFECT":
      case "HOLD":
        return 5;
      case "PROGRAM_NOT_VERIFIED":
        return 2;
      case "REJECTED":
      case "NOT_ELIGIBLE":
      case "NO_REAL_PROGRAM_FOUND":
      case "PROGRAM_ENDED":
        return 0;
      case "ACTIVE":
        // Relationship says active but canonical live-link registry does not.
        // Treat as near-ready rather than silently claiming live monetization.
        return 8;
    }
  }

  const publicProgram = getAffiliateProgram(slug);
  if (!publicProgram) return 0;
  if (publicProgram.programExists === "yes") return 4;
  if (publicProgram.programExists === "unknown") return 2;
  return 0;
}

/** 0-10, derived from stored pricing.model. */
function scoreCommercialIntent(software: Software): number {
  switch (software.pricing?.model) {
    case "paid":
      return 10;
    case "freemium":
      return 7;
    case "unknown":
      return 5;
    case "free":
      return 3;
    case "open_source":
      return 2;
    default:
      return 5;
  }
}

/**
 * 0-10 comparison-coverage score. This measures Miloosh's existing content
 * surface only. It is not evidence that users are evaluating this product.
 */
function scoreComparisonCoverage(slug: string): number {
  const comparisonCount = getComparisonsInvolving(slug).length;
  return Math.min(10, comparisonCount * 2.5);
}

const WEIGHTS = {
  affiliateAvailability: 3.5,
  categoryValue: 2,
  commercialIntent: 2.5,
  comparisonCoverage: 2,
};

export function getRevenueScore(software: Software): RevenueScoreBreakdown {
  const affiliateAvailabilityScore = scoreAffiliateAvailability(software.slug);
  const categoryValueScore = getCategoryValueScore(software.category);
  const commercialIntentScore = scoreCommercialIntent(software);
  const buyingIntentScore = scoreComparisonCoverage(software.slug);

  const totalScore = Math.round(
    affiliateAvailabilityScore * WEIGHTS.affiliateAvailability +
      categoryValueScore * WEIGHTS.categoryValue +
      commercialIntentScore * WEIGHTS.commercialIntent +
      buyingIntentScore * WEIGHTS.comparisonCoverage
  );

  return {
    slug: software.slug,
    affiliateAvailabilityScore,
    categoryValueScore,
    commercialIntentScore,
    buyingIntentScore,
    totalScore,
  };
}

export function getRevenueScores(allSoftware: Software[]): RevenueScoreBreakdown[] {
  return allSoftware.map(getRevenueScore).sort((a, b) => b.totalScore - a.totalScore || a.slug.localeCompare(b.slug));
}
