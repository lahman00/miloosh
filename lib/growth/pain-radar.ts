export type PainSource =
  | "reddit"
  | "forum"
  | "news"
  | "social"
  | "search"
  | "support-community"
  | "other";

export type PainIntent =
  | "price-increase"
  | "too-expensive"
  | "free-plan-ending"
  | "billing-surprise"
  | "usage-limit"
  | "migration"
  | "alternatives"
  | "comparison"
  | "integration-breakage"
  | "support-failure"
  | "contract-friction"
  | "other";

export type PainCandidate = {
  id: string;
  source: PainSource;
  sourceUrl: string;
  discoveredAt: string;
  publishedAt?: string;
  product?: string;
  title: string;
  excerpt?: string;
  intent: PainIntent;
  freshnessHours?: number;
  engagement?: number;
  commercialIntent?: number;
  severity?: number;
  audienceFit?: number;
  existingMilooshCoverage?: number;
  sourceReliability?: number;
  communityAllowsPromotion?: boolean;
  communityRulesVerifiedAt?: string;
  affiliateRelevant?: boolean;
  canBuildAssetQuickly?: boolean;
  canDistributeImmediately?: boolean;
};

export type PainAction =
  | "BUILD_ASSET_NOW"
  | "DISTRIBUTE_EXISTING_ASSET"
  | "PREPARE_PR_HOOK"
  | "REDDIT_REPLY_CANDIDATE"
  | "MONITOR"
  | "REJECT";

export type PainScore = {
  score: number;
  action: PainAction;
  reasons: string[];
};

function clampScore(value: number | undefined, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value ?? fallback));
}

function freshnessScore(hours: number | undefined): number {
  if (hours === undefined || !Number.isFinite(hours)) return 30;
  if (hours <= 6) return 100;
  if (hours <= 24) return 90;
  if (hours <= 72) return 75;
  if (hours <= 168) return 60;
  if (hours <= 720) return 35;
  return 10;
}

export function scorePainCandidate(candidate: PainCandidate): PainScore {
  const freshness = freshnessScore(candidate.freshnessHours);
  const engagement = clampScore(candidate.engagement, 20);
  const commercial = clampScore(candidate.commercialIntent, 40);
  const severity = clampScore(candidate.severity, 40);
  const fit = clampScore(candidate.audienceFit, 50);
  const coverage = clampScore(candidate.existingMilooshCoverage, 0);
  const reliability = clampScore(candidate.sourceReliability, 50);

  let score =
    freshness * 0.2 +
    engagement * 0.1 +
    commercial * 0.2 +
    severity * 0.15 +
    fit * 0.15 +
    coverage * 0.08 +
    reliability * 0.12;

  const reasons: string[] = [];

  if (candidate.canBuildAssetQuickly) {
    score += 5;
    reasons.push("fast asset build possible");
  }
  if (candidate.canDistributeImmediately) {
    score += 5;
    reasons.push("immediate distribution available");
  }
  if (candidate.affiliateRelevant) {
    score += 2;
    reasons.push("commercially relevant without changing editorial ranking");
  }
  if (freshness >= 75) reasons.push("fresh pain signal");
  if (commercial >= 70) reasons.push("high buyer intent");
  if (severity >= 70) reasons.push("material user pain");
  if (fit >= 70) reasons.push("strong Miloosh audience fit");

  score = Math.round(Math.max(0, Math.min(100, score)));

  if (score < 35) return { score, action: "REJECT", reasons };
  if (score < 50) return { score, action: "MONITOR", reasons };

  if (
    candidate.source === "reddit" &&
    candidate.communityAllowsPromotion === true &&
    candidate.communityRulesVerifiedAt &&
    commercial >= 60
  ) {
    return { score, action: "REDDIT_REPLY_CANDIDATE", reasons };
  }

  if (coverage >= 70 && candidate.canDistributeImmediately) {
    return { score, action: "DISTRIBUTE_EXISTING_ASSET", reasons };
  }

  if (reliability >= 75 && engagement >= 60 && severity >= 60) {
    return { score, action: "PREPARE_PR_HOOK", reasons };
  }

  return { score, action: "BUILD_ASSET_NOW", reasons };
}

export function rankPainCandidates(candidates: PainCandidate[]): Array<PainCandidate & PainScore> {
  return candidates
    .map((candidate) => ({ ...candidate, ...scorePainCandidate(candidate) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
