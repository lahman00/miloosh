import { getAllSoftware } from "@/data/software";
import { getComparisonsInvolving, getComparisonSlug } from "@/data/comparisons";
import { CONS_DISCLOSURE, generateProsList } from "@/lib/comparison";
import { scoreSoftwareForAnswers } from "@/lib/recommend/scoring";
import { passesEligibility, isDomainEligible } from "@/lib/recommend/eligibility";
import { buildExplanation } from "@/lib/recommend/explain";
import type {
  RecommendationAnswers,
  RecommendationConfidence,
  RecommendationResult,
  ScoringStrategy,
  SoftwareRecommendation,
} from "@/lib/recommend/types";

/**
 * Sprint 10, rebuilt 2026-08-21 — assembles the top-N recommendations
 * from the scoring engine. Ranking, pros/cons, and related-comparison
 * lookups all come from real data already in the codebase: pros reuse
 * the same generateProsList(software) that /compare pages use (a
 * product's own sourced features, not editorial praise), and cons reuse
 * the same CONS_DISCLOSURE honesty note rather than inventing
 * weaknesses.
 *
 * Rebuild note (Phase 7 + Phase 11 of the rebuild brief): before scoring,
 * every product now passes through two real gates
 * (lib/recommend/eligibility.ts) — domain eligibility (is this product
 * even evidenced for the domain the buyer picked?) and hard negative
 * signals (e.g. free-plan-required but confirmed no free tier). A
 * product that fails either is never scored, never shown, and never
 * silently forced into the results just to fill 3 slots — see
 * `confidence` below, which the results page uses to say "we don't have
 * a strong match" instead of pretending certainty when eligibility
 * empties or nearly empties the field.
 *
 * Phase 6: `scorer` defaults to the deterministic scoreSoftwareForAnswers
 * but can be swapped for any function matching the ScoringStrategy shape
 * — nothing else in this file, the wizard, or the results page needs to
 * change for a future AI-based scorer to plug in.
 */

/** Below this matchPercent, a "top" result isn't a strong match — informational only, doesn't hide the result, just flags low confidence. Matches the rebuild brief's "never pretend certainty" requirement (Phase 11). */
const LOW_CONFIDENCE_MATCH_PERCENT = 40;

export function hasDiscriminatingAnswers(answers: RecommendationAnswers): boolean {
  return answers.teamSize !== "unspecified" || (answers.budget !== "unspecified" && answers.budget !== "flexible") ||
    answers.companyStage !== "unspecified" || answers.workStyle === "remote" || answers.workStyle === "hybrid" ||
    answers.requiredIntegrations.length > 0 || answers.needsAi || answers.difficultyPreference !== "no-preference" ||
    (answers.primaryNeed === "time_tracking" && answers.monitoringSensitivity !== "no-preference");
}

function computeConfidence(
  eligibleCount: number,
  topMatchPercent: number | null,
  answers: RecommendationAnswers
): { confidence: RecommendationConfidence; confidenceNote: string | null } {
  if (eligibleCount === 0) {
    if (answers.primaryNeed && answers.budget === "free") {
      return {
        confidence: "none",
        confidenceNote: "No product we cover for this need has a confirmed free plan — try 'low cost' instead of 'free only,' or tell us budget isn't the main constraint.",
      };
    }
    if (answers.primaryNeed) {
      return {
        confidence: "none",
        confidenceNote: "None of the products we have real evidence for in this category fit your other answers. Try loosening one constraint.",
      };
    }
    return { confidence: "none", confidenceNote: "Nothing in our verified dataset matched. Try answering at least one question." };
  }

  if (!hasDiscriminatingAnswers(answers)) {
    return { confidence: "low", confidenceNote: "You selected a category without enough constraints to distinguish buyer fit. These are eligible options, not a personalized best pick. Equal scores are ordered alphabetically, not by suitability or affiliate status." };
  }

  if (topMatchPercent !== null && topMatchPercent < LOW_CONFIDENCE_MATCH_PERCENT) {
    return {
      confidence: "low",
      confidenceNote: "These are the closest matches we have, but none scored strongly against everything you asked for — treat this as a starting point, not a confident pick.",
    };
  }

  return { confidence: "high", confidenceNote: null };
}

export function getRecommendations(
  answers: RecommendationAnswers,
  limit = 3,
  scorer: ScoringStrategy = scoreSoftwareForAnswers
): RecommendationResult {
  const eligible = getAllSoftware().filter((software) => passesEligibility(software, answers));

  const scored = eligible
    .map((software) => ({ software, scoring: scorer(software, answers) }))
    .sort((a, b) => {
      if (b.scoring.totalScore !== a.scoring.totalScore) return b.scoring.totalScore - a.scoring.totalScore;
      // Recommend Engine Integrity Patch (2026-08-21): a real, pre-existing
      // defect the Phase 5 dominance test surfaced — many scenarios (any
      // default/generic answer set, especially) leave several eligible
      // products genuinely tied at the max score, and without an explicit
      // secondary key, Array.sort's stability just preserved
      // getAllSoftware()'s incidental array order, which is driven by each
      // product's site-wide `order` field (used for general homepage/
      // category display priority) — a field with no relationship to
      // buyer fit for a specific Recommend domain. That let one low-`order`
      // product (e.g. Notion, order: 1) silently win nearly every tie
      // across unrelated domains. Alphabetical-by-slug is a neutral,
      // deterministic secondary key that carries no editorial signal.
      return a.software.slug.localeCompare(b.software.slug);
    });

  const topMatchPercent = scored.length > 0 ? scored[0]!.scoring.matchPercent : null;
  const { confidence, confidenceNote } = computeConfidence(scored.length, topMatchPercent, answers);

  const recommendations: SoftwareRecommendation[] = scored.slice(0, limit).map(({ software, scoring }, index) => {
    const relatedComparisonSlugs = getComparisonsInvolving(software.slug).map(([slugA, slugB]) =>
      getComparisonSlug(slugA, slugB)
    );

    return {
      software,
      rank: index + 1,
      scoring,
      explanation: hasDiscriminatingAnswers(answers) ? buildExplanation(software, scoring) : {
        whyItMatched: `${software.name} is eligible for the selected category; category eligibility alone does not establish fit for your business.`,
        tradeoff: "Add your actual constraints and verify plan requirements before choosing or switching.",
      },
      pros: generateProsList(software),
      consDisclosure: CONS_DISCLOSURE,
      relatedComparisonSlugs,
    };
  });

  return { recommendations, confidence, confidenceNote };
}

/** Re-exported so callers (tests, the wizard's domain picker) can check eligibility for one product without re-implementing the gate. */
export { isDomainEligible };
