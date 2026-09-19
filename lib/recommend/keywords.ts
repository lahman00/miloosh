/**
 * Sprint 10 — centralized keyword dictionaries the scoring engine
 * (lib/recommend/scoring.ts) uses to search real stored text
 * (`features`, `description`, `bestFor`) for a signal. Kept in one file
 * so every heuristic used to justify a score is auditable in one place —
 * "no black box" per Phase 2.
 *
 * These are text-match heuristics, not verified capability flags: a
 * product that doesn't use one of these words isn't confirmed to lack the
 * trait, it just contributes no evidence either way. Every place these
 * are used, the resulting ScoreFactor explanation says "based on stored
 * feature/description text," not "confirmed," to keep that distinction
 * honest in the UI too.
 */

import type { TeamSize, CompanyStage, DifficultyPreference } from "@/lib/recommend/types";

/** Checked against product-owned text on 2026-09-19, not alternatives[].
 * Ecwid: "embed commerce into an existing website" / "Embeddable shopping cart".
 * BigCommerce's "embedded providers" describes payments, not keeping a website.
 * PrestaShop's embed wording belongs to its Ecwid alternative, not PrestaShop.
 */
export const EMBED_KEYWORDS = ["\\bembed commerce\\b", "\\bembeddable shopping cart\\b"];
/** Shift4Shop best_for: "migrate an online store"; PrestaShop features: "migration".
 * Text evidence only; neither proves a supported migration for this buyer's records.
 */
export const MIGRATE_KEYWORDS = ["\\bmigrate an online store\\b", "\\bmigration\\b"];

export const AI_KEYWORDS = ["\\bai\\b", "artificial intelligence", "machine learning", "\\bai-powered\\b", "\\bai agent"];

/**
 * Flippa Activation + Recommend Expansion Super-Mission (2026-08-21) —
 * Phase 18. The dominance report (scripts/recommend/dominance-report.ts)
 * found a real 73% tie-at-max-score rate across scenarios, concentrated
 * in the smaller new domains: not because those products are genuinely
 * indistinguishable, but because these keyword lists were too narrow to
 * catch real, common vendor-copy synonyms already present in their
 * stored text (verified against actual data/software/*.json content
 * before adding each one below — never invented). This is "fix the
 * model," not a tie-break hack: broader, still-honest text matching
 * against real stored data, not a new scoring dimension or an artificial
 * penalty.
 */
const TEAM_SIZE_KEYWORDS: Record<Exclude<TeamSize, "unspecified">, string[]> = {
  solo: ["solo", "freelancer", "individual", "DIY landlord", "one person", "sole"],
  small: ["small team", "small business", "small landlord", "SMB", "smaller"],
  medium: ["growing team", "mid-size", "mid-market", "growing business", "mid-sized"],
  large: ["enterprise", "large team", "large organization", "large portfolio", "large-scale", "at scale", "global"],
};

/** Vendors that explicitly claim to fit every team size, e.g. "teams of any size." */
export const ANY_SIZE_KEYWORDS = ["any size", "all sizes", "teams of any size"];

export function getTeamSizeKeywords(size: Exclude<TeamSize, "unspecified">): string[] {
  return TEAM_SIZE_KEYWORDS[size];
}

const COMPANY_STAGE_KEYWORDS: Record<Exclude<CompanyStage, "unspecified">, string[]> = {
  startup: ["startup", "early-stage", "small business", "founders"],
  growth: ["growing", "scaling", "mid-market", "expanding"],
  enterprise: ["enterprise", "large organization", "global", "at scale"],
};

export function getCompanyStageKeywords(stage: Exclude<CompanyStage, "unspecified">): string[] {
  return COMPANY_STAGE_KEYWORDS[stage];
}

export const DIFFICULTY_KEYWORDS: Record<Exclude<DifficultyPreference, "no-preference">, string[]> = {
  simple: ["simple", "easy to use", "intuitive", "easy-to-use", "no-code", "all-in-one", "fast and simple", "quickly"],
  powerful: ["powerful", "advanced", "enterprise-grade", "robust", "comprehensive", "full-featured", "unified platform"],
};

/** True if `haystack` contains any of the given patterns (case-insensitive, `\b` supported). */
export function matchesAny(haystack: string, patterns: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return patterns.some((pattern) => new RegExp(pattern, "i").test(lower));
}
