import type { PersistedPainCandidate } from "./pain-candidate-store";
import type { PainCluster } from "./pain-clustering";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24), P8 — maps a scored,
 * classified pain candidate (and its cluster, if any) to the fastest
 * useful Miloosh response. This sits downstream of pain-radar.ts's
 * scorePainCandidate() (which decides WHETHER to act -- BUILD_ASSET_NOW,
 * PREPARE_PR_HOOK, MONITOR, REJECT, etc.) and answers WHICH asset type,
 * specifically, is the best use of the next few hours of build time.
 *
 * Deterministic rules only, matching every other scorer in lib/growth/ --
 * no fake ML on a dataset that doesn't exist yet.
 */

export type RemedyType =
  | "UPDATE_EXISTING_PAGE"
  | "PRICING_ALERT"
  | "ALTERNATIVES_PAGE"
  | "MIGRATION_GUIDE"
  | "EXTEND_CALCULATOR"
  | "COST_COMPARISON"
  | "SOCIAL_POST"
  | "NEWSLETTER_ITEM"
  | "PR_HOOK"
  | "COMPARISON_UPDATE"
  | "NO_ACTION";

export type RemedyRecommendation = {
  remedy: RemedyType;
  reasons: string[];
  requiresVerificationFirst: boolean;
};

function coverage(candidate: PersistedPainCandidate): number {
  return candidate.existingMilooshCoverage ?? 0;
}

/**
 * `cluster` is optional -- a fresh, still-isolated candidate can still
 * get a remedy recommendation (e.g. a fast social post), it just won't
 * qualify for PR_HOOK, which requires the corroborating multi-source
 * evidence a cluster provides (see docs/pain-radar-reddit-engine.md's
 * "A PR hook is publishable only after Miloosh has independently
 * verified enough data to support a broader finding").
 */
export function selectRemedy(candidate: PersistedPainCandidate, cluster?: PainCluster): RemedyRecommendation {
  const reasons: string[] = [];
  const severity = candidate.severity ?? 0;
  const commercial = candidate.commercialIntent ?? 0;
  const cov = coverage(candidate);
  const canBuild = candidate.canBuildAssetQuickly ?? false;
  const canDistribute = candidate.canDistributeImmediately ?? false;
  const verified = candidate.verificationState === "VERIFIED_TRUE";

  if (severity < 30 && commercial < 30) {
    return { remedy: "NO_ACTION", reasons: ["severity and commercial intent both too low to justify a build"], requiresVerificationFirst: false };
  }

  // Strong multi-source, accelerating cluster + high commercial value + not yet covered -> the PR play.
  if (cluster && cluster.uniqueSourceCount >= 3 && (cluster.trendDirection === "accelerating" || cluster.trendDirection === "exploding") && commercial >= 55) {
    reasons.push(`${cluster.uniqueSourceCount} independent sources, trend ${cluster.trendDirection}`);
    return { remedy: "PR_HOOK", reasons, requiresVerificationFirst: true };
  }

  if (candidate.normalizedPainClass === "forced-migration") {
    reasons.push("forced-migration pain -- buyers need a concrete switching path, not just an explainer");
    return { remedy: "MIGRATION_GUIDE", reasons, requiresVerificationFirst: !verified };
  }

  if (candidate.normalizedPainClass === "billing-unpredictability" || candidate.normalizedPainClass === "price-pressure") {
    if (cov >= 60) {
      reasons.push("existing Miloosh coverage is already strong -- refresh it with the current verified facts rather than building new");
      return { remedy: "UPDATE_EXISTING_PAGE", reasons, requiresVerificationFirst: !verified };
    }
    if (candidate.affiliateRelevant) {
      reasons.push("pricing pain with real modeled-cost potential and affiliate relevance -- the calculator already does this well");
      return { remedy: "EXTEND_CALCULATOR", reasons, requiresVerificationFirst: !verified };
    }
    reasons.push("pricing/billing pain with no existing coverage -- a dedicated pricing alert is the fastest honest asset");
    return { remedy: "PRICING_ALERT", reasons, requiresVerificationFirst: !verified };
  }

  if (candidate.normalizedPainClass === "loss-of-free-access") {
    reasons.push("buyers actively comparing options after losing free access -- an alternatives page answers the actual next question");
    return { remedy: "ALTERNATIVES_PAGE", reasons, requiresVerificationFirst: !verified };
  }

  if (candidate.intent === "comparison" || candidate.intent === "alternatives") {
    reasons.push("explicit comparison/alternatives intent");
    return { remedy: "COMPARISON_UPDATE", reasons, requiresVerificationFirst: false };
  }

  if (cov >= 50 && canDistribute) {
    reasons.push("coverage already exists and distribution is available now -- surface it, don't rebuild it");
    return { remedy: "SOCIAL_POST", reasons, requiresVerificationFirst: false };
  }

  if (!canBuild && canDistribute) {
    reasons.push("no quick asset build available, but distribution is -- a newsletter item can go out without a new page");
    return { remedy: "NEWSLETTER_ITEM", reasons, requiresVerificationFirst: !verified };
  }

  reasons.push("no existing coverage and no strong specific-remedy match -- default to a targeted social post while a proper asset is scoped");
  return { remedy: "SOCIAL_POST", reasons, requiresVerificationFirst: !verified };
}
