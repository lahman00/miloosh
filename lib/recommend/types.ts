import type { Software } from "@/data/software";
import type { RecommendDomain } from "@/lib/recommend/domains";

/**
 * Sprint 10, rebuilt 2026-08-21 — the recommendation engine's input/output
 * contract.
 *
 * Every field here is honored by lib/recommend/scoring.ts using ONLY real
 * stored fields (category, pricing.model, platforms, and text search over
 * features/description/bestFor) — never an invented capability. One field,
 * `industry`, is collected but deliberately never scored: no software
 * entry in this dataset stores an industry/vertical, so scoring on it
 * would mean inventing a match. It's kept on the type so the wizard can
 * still ask (for future use, once the dataset supports it) and the
 * results page can honestly disclose that it had no effect — see
 * docs/recommendation-engine.md.
 *
 * `primaryNeed` replaces the original 5 hardcoded booleans
 * (needsProjectManagement, needsCrm, needsKnowledgeBase, needsAutomation,
 * needsCommunication) with one domain selector covering all 13 domains in
 * lib/recommend/domains.ts. `null` means "not sure / just browsing" and
 * falls back to the original generic team-size/budget/stage scoring with
 * no domain-eligibility gate — the same behavior this engine always had.
 * When set, it's a hard eligibility gate (lib/recommend/eligibility.ts):
 * a product outside the selected domain is excluded, not just
 * deprioritized — see Phase 7 of the rebuild brief ("Postmark must not
 * surface for project management").
 */

export type TeamSize = "solo" | "small" | "medium" | "large" | "unspecified";
export type Budget = "free" | "low" | "flexible" | "unspecified";
export type CompanyStage = "startup" | "growth" | "enterprise" | "unspecified";
export type WorkStyle = "remote" | "office" | "hybrid" | "unspecified";
export type DifficultyPreference = "simple" | "powerful" | "no-preference";
/** Only asked when primaryNeed === "time_tracking" — see Phase 6's "employee monitoring sensitivity" requirement. Adaptive: hidden for every other domain. */
export type MonitoringSensitivity = "prefer-lightweight" | "comfortable" | "no-preference";
/** Ecommerce-only context. Never an eligibility gate or a claim that switching is necessary. */
export const ECOMMERCE_SITUATIONS = ["new", "repair", "embed", "migrate", "not-sure"] as const;
export type EcommerceSituation = (typeof ECOMMERCE_SITUATIONS)[number];

export type RecommendationAnswers = {
  primaryNeed: RecommendDomain | null;
  teamSize: TeamSize;
  budget: Budget;
  companyStage: CompanyStage;
  /** Collected, never scored — see module doc comment above. */
  industry: string;
  workStyle: WorkStyle;
  /** Free-text tool/integration names the user typed, e.g. ["Slack", "Google Drive"]. */
  requiredIntegrations: string[];
  needsAi: boolean;
  difficultyPreference: DifficultyPreference;
  monitoringSensitivity: MonitoringSensitivity;
  ecommerceSituation: EcommerceSituation;
};

export type ScoreFactorDirection = "positive" | "negative" | "informational";

export type ScoreFactor = {
  label: string;
  /** Signed point contribution. 0 for informational factors (e.g. "industry wasn't used"). */
  points: number;
  direction: ScoreFactorDirection;
  /** Plain-language reason, naming the real field the factor is based on. */
  explanation: string;
};

export type ScoringResult = {
  totalScore: number;
  /** Sum of every factor's best-case positive value for this answer set — the denominator behind matchPercent. Documented in docs/recommendation-engine.md. */
  maxPossibleScore: number;
  /** 0-100, `max(0, totalScore) / maxPossibleScore`. 0 when maxPossibleScore is 0 (no scorable answers given). */
  matchPercent: number;
  factors: ScoreFactor[];
};

/**
 * Phase 6 — the seam a future AI-based scorer would implement instead.
 * Same inputs, same output shape (a score plus a human-readable factor
 * list), so swapping the engine never touches the wizard, the results
 * page, or the ranking/assembly logic in lib/recommend/engine.ts.
 */
export type ScoringStrategy = (software: Software, answers: RecommendationAnswers) => ScoringResult;

/** A short, plain-language narrative built from the real scored factors — see lib/recommend/explain.ts. Never a vague "great choice with powerful features" — every sentence names an actual answer/product fact. */
export type Explanation = {
  /** "Best fit because you wanted X and Y — <product> matches those priorities." Empty string only if truly nothing scored (matches the "closest match available" case). */
  whyItMatched: string;
  /** The single most material negative/informational factor, phrased as a heads-up. Null when there's nothing worth flagging. */
  tradeoff: string | null;
};

export type SoftwareRecommendation = {
  software: Software;
  rank: number;
  scoring: ScoringResult;
  explanation: Explanation;
  pros: string[];
  consDisclosure: string;
  relatedComparisonSlugs: string[];
};

/**
 * Phase 11 — "the engine always returns 3 products" was a real failure
 * mode: with no eligibility gate, a domain with zero good matches (e.g.
 * budget=free excludes every eligible product) still silently returned
 * whatever scored highest, however irrelevant. RecommendationResult is
 * what getRecommendations now actually returns: the ranked list PLUS an
 * honest confidence signal the results page uses to decide whether to
 * say so instead of pretending certainty.
 */
export type RecommendationConfidence = "high" | "low" | "none";

export type RecommendationResult = {
  recommendations: SoftwareRecommendation[];
  confidence: RecommendationConfidence;
  /** Set only when confidence is "low" or "none" — a concrete, honest reason, e.g. "no product in this domain has a documented free tier." Never blank when confidence isn't "high". */
  confidenceNote: string | null;
};
