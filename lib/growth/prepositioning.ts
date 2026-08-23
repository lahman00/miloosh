import type { PainForecast } from "./pain-forecast";

export type PrepositioningAction =
  | "PREPARE_ONLY"
  | "PREBUILD_DRAFT"
  | "PREBUILD_ASSET_PRIVATE"
  | "PREPARE_DISTRIBUTION_PACKET"
  | "PREPARE_PR_PACKET"
  | "WAIT";

export type PrepositioningPlan = {
  vendor: string;
  horizon: PainForecast["horizon"];
  action: PrepositioningAction;
  publishAllowed: false;
  triggerConditions: string[];
  preparation: string[];
  reasons: string[];
};

export function buildPrepositioningPlan(forecast: PainForecast): PrepositioningPlan {
  const reasons: string[] = [];
  const preparation: string[] = [];
  const triggerConditions: string[] = [
    "authoritative vendor evidence confirms the predicted change, or",
    "multiple independent demand signals confirm the pain has materialized",
  ];

  if (forecast.probabilityScore < 40 || forecast.opportunityScore < 35) {
    return {
      vendor: forecast.vendor,
      horizon: forecast.horizon,
      action: "WAIT",
      publishAllowed: false,
      triggerConditions,
      preparation,
      reasons: ["forecast below prepositioning threshold"],
    };
  }

  preparation.push("snapshot current official pricing/docs/terms with verification timestamp");
  preparation.push("identify existing Miloosh destination pages and coverage gaps");
  preparation.push("prepare source checklist and verification queries");

  if (forecast.probabilityScore >= 55) {
    preparation.push("draft buyer-facing explainer without asserting the predicted event occurred");
    preparation.push("prepare internal links, UTM plan, CTA path and analytics asset ID");
    reasons.push("material forecast probability supports private drafting");
  }

  if (forecast.recommendedAction === "PREPARE_MIGRATION_GUIDE") {
    preparation.push("prepare migration checklist, alternatives matrix and switching-cost questions");
  }

  if (forecast.recommendedAction === "PREPARE_PRICING_ALERT") {
    preparation.push("prepare before/after pricing comparison template and team-cost scenarios");
  }

  if (forecast.opportunityScore >= 70) {
    preparation.push("prepare channel-specific distribution copy and unique UTM identifiers");
    reasons.push("high opportunity supports distribution prepositioning");
  }

  if (forecast.opportunityScore >= 80 && forecast.confidence === "HIGH") {
    preparation.push("prepare journalist/source packet with methodology and evidence placeholders only");
    reasons.push("high-confidence high-opportunity forecast supports PR preparation");
    return {
      vendor: forecast.vendor,
      horizon: forecast.horizon,
      action: "PREPARE_PR_PACKET",
      publishAllowed: false,
      triggerConditions,
      preparation,
      reasons,
    };
  }

  if (forecast.opportunityScore >= 70) {
    return {
      vendor: forecast.vendor,
      horizon: forecast.horizon,
      action: "PREPARE_DISTRIBUTION_PACKET",
      publishAllowed: false,
      triggerConditions,
      preparation,
      reasons,
    };
  }

  if (forecast.probabilityScore >= 65) {
    return {
      vendor: forecast.vendor,
      horizon: forecast.horizon,
      action: "PREBUILD_ASSET_PRIVATE",
      publishAllowed: false,
      triggerConditions,
      preparation,
      reasons,
    };
  }

  if (forecast.probabilityScore >= 55) {
    return {
      vendor: forecast.vendor,
      horizon: forecast.horizon,
      action: "PREBUILD_DRAFT",
      publishAllowed: false,
      triggerConditions,
      preparation,
      reasons,
    };
  }

  return {
    vendor: forecast.vendor,
    horizon: forecast.horizon,
    action: "PREPARE_ONLY",
    publishAllowed: false,
    triggerConditions,
    preparation,
    reasons,
  };
}
