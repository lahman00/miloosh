export type ForecastHorizon = "7d" | "30d" | "90d";

export type ForecastSignalType =
  | "pricing-page-change"
  | "terms-change"
  | "free-tier-contraction"
  | "plan-renaming"
  | "seat-minimum-change"
  | "usage-credit-model"
  | "ai-pricing-change"
  | "feature-gating-change"
  | "sunset-deprecation"
  | "migration-policy-change"
  | "support-policy-change"
  | "contract-change"
  | "release-note-risk"
  | "community-sentiment-acceleration"
  | "search-demand-anomaly"
  | "competitor-price-gap"
  | "acquisition-ma"
  | "layoff-support-risk"
  | "other";

export type ForecastSignal = {
  id: string;
  vendor: string;
  product?: string;
  type: ForecastSignalType;
  observedAt: string;
  sourceUrl: string;
  sourceReliability: number;
  magnitude: number;
  novelty: number;
  buyerImpact: number;
  confidence: number;
  notes?: string;
};

export type ForecastContext = {
  vendor: string;
  existingPainVelocity?: number;
  currentSearchDemand?: number;
  existingMilooshCoverage?: number;
  affiliateRelevant?: boolean;
};

export type PainForecast = {
  vendor: string;
  horizon: ForecastHorizon;
  probabilityScore: number;
  severityScore: number;
  opportunityScore: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  likelyPainClasses: string[];
  evidence: ForecastSignal[];
  recommendedAction:
    | "PREBUILD_ASSET"
    | "PREPARE_PR_POSITION"
    | "PREPARE_MIGRATION_GUIDE"
    | "PREPARE_PRICING_ALERT"
    | "MONITOR_CLOSELY"
    | "NO_ACTION";
  reasons: string[];
};

const SIGNAL_WEIGHTS: Record<ForecastSignalType, number> = {
  "pricing-page-change": 1.15,
  "terms-change": 1.05,
  "free-tier-contraction": 1.35,
  "plan-renaming": 0.75,
  "seat-minimum-change": 1.25,
  "usage-credit-model": 1.2,
  "ai-pricing-change": 1.2,
  "feature-gating-change": 1.15,
  "sunset-deprecation": 1.4,
  "migration-policy-change": 1.2,
  "support-policy-change": 0.9,
  "contract-change": 1.15,
  "release-note-risk": 0.8,
  "community-sentiment-acceleration": 1,
  "search-demand-anomaly": 0.95,
  "competitor-price-gap": 0.8,
  "acquisition-ma": 0.65,
  "layoff-support-risk": 0.65,
  other: 0.5,
};

function clamp(value: number | undefined, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value ?? fallback));
}

function recencyFactor(observedAt: string, now = new Date()): number {
  const seen = new Date(observedAt).getTime();
  if (!Number.isFinite(seen)) return 0.5;
  const hours = Math.max(0, (now.getTime() - seen) / 3_600_000);
  if (hours <= 24) return 1;
  if (hours <= 72) return 0.92;
  if (hours <= 168) return 0.8;
  if (hours <= 720) return 0.6;
  return 0.35;
}

function signalStrength(signal: ForecastSignal, now?: Date): number {
  const reliability = clamp(signal.sourceReliability, 50) / 100;
  const magnitude = clamp(signal.magnitude, 50) / 100;
  const novelty = clamp(signal.novelty, 50) / 100;
  const impact = clamp(signal.buyerImpact, 50) / 100;
  const confidence = clamp(signal.confidence, 50) / 100;
  const weight = SIGNAL_WEIGHTS[signal.type] ?? 0.5;
  const recency = recencyFactor(signal.observedAt, now);

  return (
    (reliability * 0.22 + magnitude * 0.2 + novelty * 0.12 + impact * 0.28 + confidence * 0.18) *
    weight *
    recency
  );
}

function horizonMultiplier(type: ForecastSignalType, horizon: ForecastHorizon): number {
  const immediate = new Set<ForecastSignalType>([
    "pricing-page-change",
    "free-tier-contraction",
    "seat-minimum-change",
    "usage-credit-model",
    "ai-pricing-change",
    "feature-gating-change",
    "sunset-deprecation",
    "contract-change",
  ]);
  const strategic = new Set<ForecastSignalType>([
    "acquisition-ma",
    "layoff-support-risk",
    "competitor-price-gap",
    "community-sentiment-acceleration",
    "search-demand-anomaly",
  ]);

  if (horizon === "7d") return immediate.has(type) ? 1.15 : strategic.has(type) ? 0.65 : 0.9;
  if (horizon === "30d") return immediate.has(type) ? 1 : strategic.has(type) ? 0.95 : 1;
  return immediate.has(type) ? 0.75 : strategic.has(type) ? 1.2 : 1;
}

function painClasses(signals: ForecastSignal[]): string[] {
  const result = new Set<string>();
  for (const signal of signals) {
    if (["pricing-page-change", "seat-minimum-change", "contract-change"].includes(signal.type)) result.add("price-pressure");
    if (["free-tier-contraction", "feature-gating-change"].includes(signal.type)) result.add("loss-of-free-access");
    if (["usage-credit-model", "ai-pricing-change"].includes(signal.type)) result.add("billing-unpredictability");
    if (["sunset-deprecation", "migration-policy-change"].includes(signal.type)) result.add("forced-migration");
    if (["support-policy-change", "layoff-support-risk"].includes(signal.type)) result.add("support-degradation");
    if (["community-sentiment-acceleration", "search-demand-anomaly"].includes(signal.type)) result.add("buyer-anxiety");
  }
  return [...result];
}

function pickAction(classes: string[], opportunity: number, probability: number): PainForecast["recommendedAction"] {
  if (probability < 35 || opportunity < 30) return "NO_ACTION";
  if (classes.includes("forced-migration")) return "PREPARE_MIGRATION_GUIDE";
  if (classes.includes("billing-unpredictability") || classes.includes("price-pressure")) return "PREPARE_PRICING_ALERT";
  if (opportunity >= 75 && classes.length >= 2) return "PREPARE_PR_POSITION";
  if (probability >= 65) return "PREBUILD_ASSET";
  return "MONITOR_CLOSELY";
}

export function forecastPain(
  context: ForecastContext,
  signals: ForecastSignal[],
  horizon: ForecastHorizon,
  now = new Date(),
): PainForecast {
  const relevant = signals.filter((signal) => signal.vendor.toLowerCase() === context.vendor.toLowerCase());

  if (relevant.length === 0) {
    return {
      vendor: context.vendor,
      horizon,
      probabilityScore: 0,
      severityScore: 0,
      opportunityScore: 0,
      confidence: "LOW",
      likelyPainClasses: [],
      evidence: [],
      recommendedAction: "NO_ACTION",
      reasons: ["no forecast evidence"],
    };
  }

  const strengths = relevant.map((signal) => signalStrength(signal, now) * horizonMultiplier(signal.type, horizon));
  const maxStrength = Math.max(...strengths, 0);
  const reinforcing = Math.min(1, strengths.reduce((sum, value) => sum + value, 0) / 2.2);
  const diversity = new Set(relevant.map((signal) => signal.type)).size;
  const painVelocity = clamp(context.existingPainVelocity, 0) / 100;

  const probabilityScore = Math.round(
    Math.min(100, (maxStrength * 0.55 + reinforcing * 0.25 + Math.min(diversity / 5, 1) * 0.1 + painVelocity * 0.1) * 100),
  );

  const severityScore = Math.round(
    relevant.reduce((sum, signal) => sum + clamp(signal.buyerImpact, 50) * signalStrength(signal, now), 0) /
      Math.max(1, relevant.reduce((sum, signal) => sum + signalStrength(signal, now), 0)),
  );

  const demand = clamp(context.currentSearchDemand, 30);
  const coverage = clamp(context.existingMilooshCoverage, 0);
  const opportunityScore = Math.round(
    Math.min(100, probabilityScore * 0.45 + severityScore * 0.25 + demand * 0.2 + (100 - coverage) * 0.1 + (context.affiliateRelevant ? 3 : 0)),
  );

  const classes = painClasses(relevant);
  const highQualitySignals = relevant.filter((signal) => signal.sourceReliability >= 75 && signal.confidence >= 70).length;
  const confidence: PainForecast["confidence"] =
    highQualitySignals >= 3 && diversity >= 2 ? "HIGH" : highQualitySignals >= 1 ? "MEDIUM" : "LOW";

  const reasons = [
    `${relevant.length} predictive signal(s)`,
    `${diversity} distinct signal type(s)`,
    `forecast probability ${probabilityScore}/100`,
  ];
  if (painVelocity >= 0.6) reasons.push("existing pain velocity reinforces forecast");
  if (classes.length >= 2) reasons.push("multiple likely pain classes");

  return {
    vendor: context.vendor,
    horizon,
    probabilityScore,
    severityScore,
    opportunityScore,
    confidence,
    likelyPainClasses: classes,
    evidence: [...relevant].sort((a, b) => b.observedAt.localeCompare(a.observedAt)),
    recommendedAction: pickAction(classes, opportunityScore, probabilityScore),
    reasons,
  };
}

export function rankForecasts(forecasts: PainForecast[]): PainForecast[] {
  return [...forecasts].sort(
    (a, b) =>
      b.opportunityScore - a.opportunityScore ||
      b.probabilityScore - a.probabilityScore ||
      a.vendor.localeCompare(b.vendor),
  );
}
