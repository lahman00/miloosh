import type {
  Budget,
  CompanyStage,
  DifficultyPreference,
  MonitoringSensitivity,
  RecommendationAnswers,
  TeamSize,
  WorkStyle,
} from "@/lib/recommend/types";
import { RECOMMEND_DOMAINS, type RecommendDomain } from "@/lib/recommend/domains";
import { ECOMMERCE_SITUATIONS } from "@/lib/recommend/types";

/**
 * Sprint 10, rebuilt 2026-08-21 — the wizard (client component) hands
 * answers to the results page (server component) via a plain query
 * string, so results are server-rendered, shareable, and bookmarkable,
 * without needing a separate API round-trip just to compute a
 * recommendation (Phase 27 of the rebuild brief — already true of the
 * original architecture, preserved as-is here).
 */

export const DEFAULT_ANSWERS: RecommendationAnswers = {
  primaryNeed: null,
  teamSize: "unspecified",
  budget: "unspecified",
  companyStage: "unspecified",
  industry: "",
  workStyle: "unspecified",
  requiredIntegrations: [],
  needsAi: false,
  difficultyPreference: "no-preference",
  monitoringSensitivity: "no-preference",
  ecommerceSituation: "not-sure",
};

const TEAM_SIZES: TeamSize[] = ["solo", "small", "medium", "large", "unspecified"];
const BUDGETS: Budget[] = ["free", "low", "flexible", "unspecified"];
const COMPANY_STAGES: CompanyStage[] = ["startup", "growth", "enterprise", "unspecified"];
const WORK_STYLES: WorkStyle[] = ["remote", "office", "hybrid", "unspecified"];
const DIFFICULTY_PREFERENCES: DifficultyPreference[] = ["simple", "powerful", "no-preference"];
const MONITORING_SENSITIVITIES: MonitoringSensitivity[] = ["prefer-lightweight", "comfortable", "no-preference"];

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function pickDomain(value: string | null): RecommendDomain | null {
  return value && (RECOMMEND_DOMAINS as readonly string[]).includes(value) ? (value as RecommendDomain) : null;
}

export function answersToSearchParams(answers: RecommendationAnswers): URLSearchParams {
  const params = new URLSearchParams();
  if (answers.primaryNeed) params.set("need", answers.primaryNeed);
  params.set("team", answers.teamSize);
  params.set("budget", answers.budget);
  params.set("stage", answers.companyStage);
  if (answers.industry.trim()) params.set("industry", answers.industry.trim());
  params.set("work", answers.workStyle);
  if (answers.requiredIntegrations.length > 0) {
    params.set("integrations", answers.requiredIntegrations.join(","));
  }
  params.set("ai", answers.needsAi ? "1" : "0");
  params.set("difficulty", answers.difficultyPreference);
  if (answers.monitoringSensitivity !== "no-preference") params.set("monitoring", answers.monitoringSensitivity);
  if (answers.primaryNeed === "ecommerce_platform" && answers.ecommerceSituation !== "not-sure") {
    params.set("ecommerceSituation", answers.ecommerceSituation);
  }
  return params;
}

export function searchParamsToAnswers(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): RecommendationAnswers {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  };

  const integrations = (get("integrations") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    primaryNeed: pickDomain(get("need")),
    teamSize: pick(get("team"), TEAM_SIZES, DEFAULT_ANSWERS.teamSize),
    budget: pick(get("budget"), BUDGETS, DEFAULT_ANSWERS.budget),
    companyStage: pick(get("stage"), COMPANY_STAGES, DEFAULT_ANSWERS.companyStage),
    industry: (get("industry") ?? "").slice(0, 200),
    workStyle: pick(get("work"), WORK_STYLES, DEFAULT_ANSWERS.workStyle),
    requiredIntegrations: integrations.slice(0, 10),
    needsAi: get("ai") === "1",
    difficultyPreference: pick(get("difficulty"), DIFFICULTY_PREFERENCES, DEFAULT_ANSWERS.difficultyPreference),
    monitoringSensitivity: pick(get("monitoring"), MONITORING_SENSITIVITIES, DEFAULT_ANSWERS.monitoringSensitivity),
    ecommerceSituation: get("need") === "ecommerce_platform"
      ? pick(get("ecommerceSituation"), ECOMMERCE_SITUATIONS, DEFAULT_ANSWERS.ecommerceSituation)
      : "not-sure",
  };
}

/** Compact, human-readable summary of an answer set — for analytics/audit logs, not for display. */
export function summarizeAnswers(answers: RecommendationAnswers): string {
  const parts: string[] = [];
  if (answers.primaryNeed) parts.push(`need=${answers.primaryNeed}`);
  if (answers.teamSize !== "unspecified") parts.push(`team=${answers.teamSize}`);
  if (answers.budget !== "unspecified") parts.push(`budget=${answers.budget}`);
  if (answers.companyStage !== "unspecified") parts.push(`stage=${answers.companyStage}`);
  if (answers.workStyle !== "unspecified") parts.push(`work=${answers.workStyle}`);
  if (answers.needsAi) parts.push(`needs=ai`);
  if (answers.requiredIntegrations.length > 0) {
    parts.push(`integrations=${answers.requiredIntegrations.length}`);
  }
  if (answers.difficultyPreference !== "no-preference") parts.push(`difficulty=${answers.difficultyPreference}`);
  if (answers.monitoringSensitivity !== "no-preference") parts.push(`monitoring=${answers.monitoringSensitivity}`);
  return parts.length > 0 ? parts.join(",") : "no-answers";
}

/** True if the answer set has at least one non-default value — used to tell "no answers yet" apart from "answered but nothing matched." */
export function hasAnyAnswer(answers: RecommendationAnswers): boolean {
  return (
    answers.primaryNeed !== null ||
    answers.teamSize !== "unspecified" ||
    answers.budget !== "unspecified" ||
    answers.companyStage !== "unspecified" ||
    answers.industry.trim().length > 0 ||
    answers.workStyle !== "unspecified" ||
    answers.requiredIntegrations.length > 0 ||
    answers.needsAi ||
    answers.difficultyPreference !== "no-preference" ||
    answers.monitoringSensitivity !== "no-preference"
  );
}
