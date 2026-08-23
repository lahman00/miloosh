import type { ForecastHorizon, PainForecast } from "./pain-forecast";

export type ForecastOutcomeType =
  | "PAIN_MATERIALIZED"
  | "NO_MATERIAL_PAIN"
  | "PARTIAL"
  | "UNKNOWN";

export type ForecastOutcome = {
  forecastId: string;
  vendor: string;
  horizon: ForecastHorizon;
  forecastedAt: string;
  evaluationAt: string;
  outcome: ForecastOutcomeType;
  actualPainClasses: string[];
  firstPainObservedAt?: string;
  evidenceUrls: string[];
  notes?: string;
};

export type ForecastRecord = {
  id: string;
  forecastedAt: string;
  forecast: PainForecast;
};

export type BacktestResult = {
  forecastId: string;
  vendor: string;
  horizon: ForecastHorizon;
  probabilityScore: number;
  predictedPositive: boolean;
  actualPositive: boolean | null;
  classification: "TRUE_POSITIVE" | "FALSE_POSITIVE" | "TRUE_NEGATIVE" | "FALSE_NEGATIVE" | "UNRESOLVED";
  leadTimeHours?: number;
  classOverlap: number;
};

export type CalibrationSummary = {
  evaluated: number;
  unresolved: number;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  precision: number | null;
  recall: number | null;
  falsePositiveRate: number | null;
  averageLeadTimeHours: number | null;
  brierScore: number | null;
  byHorizon: Partial<Record<ForecastHorizon, CalibrationSummary>>;
};

function parseTime(value: string): number | null {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function overlapScore(predicted: string[], actual: string[]): number {
  if (predicted.length === 0 && actual.length === 0) return 1;
  if (predicted.length === 0 || actual.length === 0) return 0;
  const a = new Set(predicted);
  const b = new Set(actual);
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : round(intersection / union);
}

export function evaluateForecast(
  record: ForecastRecord,
  outcome: ForecastOutcome,
  positiveThreshold = 60,
): BacktestResult {
  const predictedPositive = record.forecast.probabilityScore >= positiveThreshold;
  const actualPositive =
    outcome.outcome === "PAIN_MATERIALIZED" || outcome.outcome === "PARTIAL"
      ? true
      : outcome.outcome === "NO_MATERIAL_PAIN"
        ? false
        : null;

  let classification: BacktestResult["classification"] = "UNRESOLVED";
  if (actualPositive === true) classification = predictedPositive ? "TRUE_POSITIVE" : "FALSE_NEGATIVE";
  if (actualPositive === false) classification = predictedPositive ? "FALSE_POSITIVE" : "TRUE_NEGATIVE";

  let leadTimeHours: number | undefined;
  const forecasted = parseTime(record.forecastedAt);
  const painObserved = outcome.firstPainObservedAt ? parseTime(outcome.firstPainObservedAt) : null;
  if (forecasted !== null && painObserved !== null && painObserved >= forecasted) {
    leadTimeHours = round((painObserved - forecasted) / 3_600_000, 1);
  }

  return {
    forecastId: record.id,
    vendor: record.forecast.vendor,
    horizon: record.forecast.horizon,
    probabilityScore: record.forecast.probabilityScore,
    predictedPositive,
    actualPositive,
    classification,
    leadTimeHours,
    classOverlap: overlapScore(record.forecast.likelyPainClasses, outcome.actualPainClasses),
  };
}

function summarizeFlat(results: BacktestResult[]): Omit<CalibrationSummary, "byHorizon"> {
  const resolved = results.filter((result) => result.actualPositive !== null);
  const unresolved = results.length - resolved.length;
  const truePositive = resolved.filter((result) => result.classification === "TRUE_POSITIVE").length;
  const falsePositive = resolved.filter((result) => result.classification === "FALSE_POSITIVE").length;
  const trueNegative = resolved.filter((result) => result.classification === "TRUE_NEGATIVE").length;
  const falseNegative = resolved.filter((result) => result.classification === "FALSE_NEGATIVE").length;

  const precisionDenominator = truePositive + falsePositive;
  const recallDenominator = truePositive + falseNegative;
  const falsePositiveDenominator = falsePositive + trueNegative;
  const leadTimes = resolved
    .map((result) => result.leadTimeHours)
    .filter((value): value is number => typeof value === "number");

  const brierValues = resolved.map((result) => {
    const probability = result.probabilityScore / 100;
    const actual = result.actualPositive ? 1 : 0;
    return (probability - actual) ** 2;
  });

  return {
    evaluated: resolved.length,
    unresolved,
    truePositive,
    falsePositive,
    trueNegative,
    falseNegative,
    precision: precisionDenominator ? round(truePositive / precisionDenominator) : null,
    recall: recallDenominator ? round(truePositive / recallDenominator) : null,
    falsePositiveRate: falsePositiveDenominator ? round(falsePositive / falsePositiveDenominator) : null,
    averageLeadTimeHours: leadTimes.length ? round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length, 1) : null,
    brierScore: brierValues.length ? round(brierValues.reduce((a, b) => a + b, 0) / brierValues.length) : null,
  };
}

export function summarizeCalibration(results: BacktestResult[]): CalibrationSummary {
  const base = summarizeFlat(results);
  const horizons: ForecastHorizon[] = ["7d", "30d", "90d"];
  const byHorizon: CalibrationSummary["byHorizon"] = {};

  for (const horizon of horizons) {
    const subset = results.filter((result) => result.horizon === horizon);
    if (subset.length === 0) continue;
    const summary = summarizeFlat(subset);
    byHorizon[horizon] = { ...summary, byHorizon: {} };
  }

  return { ...base, byHorizon };
}

export type CalibrationBand = {
  minProbability: number;
  maxProbability: number;
  count: number;
  observedRate: number | null;
};

export function calibrationBands(results: BacktestResult[]): CalibrationBand[] {
  const bands = [
    [0, 19],
    [20, 39],
    [40, 59],
    [60, 79],
    [80, 100],
  ] as const;

  return bands.map(([minProbability, maxProbability]) => {
    const subset = results.filter(
      (result) =>
        result.actualPositive !== null &&
        result.probabilityScore >= minProbability &&
        result.probabilityScore <= maxProbability,
    );
    const positives = subset.filter((result) => result.actualPositive === true).length;
    return {
      minProbability,
      maxProbability,
      count: subset.length,
      observedRate: subset.length ? round(positives / subset.length) : null,
    };
  });
}
