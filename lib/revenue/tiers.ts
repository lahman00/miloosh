import type { RevenueScoreBreakdown } from "@/lib/revenue/scoring";

/** Commercial priority tiers derived from the static repository revenue score. */
export type RevenueTier = "A" | "B" | "C";

const TIER_A_THRESHOLD = 70;
const TIER_B_THRESHOLD = 40;

export function getRevenueTier(totalScore: number): RevenueTier {
  if (totalScore >= TIER_A_THRESHOLD) return "A";
  if (totalScore >= TIER_B_THRESHOLD) return "B";
  return "C";
}

function explainAffiliateAvailability(score: number): string {
  switch (score) {
    case 10:
      return "an active Miloosh affiliate relationship with a verified live URL";
    case 8:
      return "an approved or near-ready Miloosh relationship that is not yet live";
    case 6:
      return "a Miloosh application currently pending vendor review";
    case 5:
      return "a current affiliate route blocked on an owner-only checkpoint";
    case 4:
      return "a verified public vendor program but no Miloosh relationship decision yet";
    case 2:
      return "an unverified or unresolved program route";
    default:
      return "no current monetizable affiliate relationship";
  }
}

/** A factual explanation built only from the score breakdown. */
export function explainTier(breakdown: RevenueScoreBreakdown): string {
  const tier = getRevenueTier(breakdown.totalScore);
  const reasons: string[] = [explainAffiliateAvailability(breakdown.affiliateAvailabilityScore)];

  if (breakdown.commercialIntentScore >= 9) {
    reasons.push("a paid pricing model");
  } else if (breakdown.commercialIntentScore <= 3) {
    reasons.push("a free or open-source pricing model");
  }

  if (breakdown.buyingIntentScore >= 5) {
    reasons.push("broad coverage across Miloosh published comparisons");
  } else if (breakdown.buyingIntentScore === 0) {
    reasons.push("no published comparison coverage yet");
  }

  if (breakdown.categoryValueScore >= 8) {
    reasons.push("a high-value editorial category");
  } else if (breakdown.categoryValueScore <= 5) {
    reasons.push("a lower-value editorial category");
  }

  return `Tier ${tier} (score ${breakdown.totalScore}/100): ${reasons.join(", ")}.`;
}

export function countByTier(breakdowns: RevenueScoreBreakdown[]): Record<RevenueTier, number> {
  const counts: Record<RevenueTier, number> = { A: 0, B: 0, C: 0 };
  for (const breakdown of breakdowns) {
    counts[getRevenueTier(breakdown.totalScore)] += 1;
  }
  return counts;
}
