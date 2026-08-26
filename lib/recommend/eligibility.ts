import type { Software } from "@/data/software";
import type { RecommendationAnswers } from "@/lib/recommend/types";
import { isEligibleForDomainFromEvidence } from "@/data/recommend/domain-evidence";

/**
 * Recommend Engine Rebuild (2026-08-21) — Phase 7 (eligibility) and
 * Phase 10 (hard negative signals) of the rebuild brief.
 *
 * Two separate, sequential gates a product must pass BEFORE it's even
 * scored:
 *
 * 1. Domain eligibility (isDomainEligible) — "is this even a plausible
 *    choice for this buyer?" A product outside the selected domain
 *    never reaches scoring, so it structurally cannot outscore its way
 *    into results no matter how well it happens to match generic
 *    team-size/budget factors.
 *
 * 2. Hard negative signals (isHardExcluded) — contradictions no amount
 *    of positive scoring should paper over (Phase 10's own examples:
 *    "free plan required but product has no free tier"). These exclude
 *    outright rather than just applying a point penalty, which is what
 *    the old scoring-only model did (see scoring.ts's BUDGET_FREE_MISMATCH
 *    — still applied as a penalty for the generic no-domain fallback,
 *    but no longer sufficient on its own once a domain is selected).
 */

export function isDomainEligible(software: Software, answers: RecommendationAnswers): boolean {
  if (!answers.primaryNeed) return true; // no domain selected -> generic fallback, unchanged from the original engine
  return isEligibleForDomainFromEvidence(software.slug, answers.primaryNeed);
}

/**
 * Time-tracking products whose own stored cons explicitly describe
 * screenshot/keystroke/activity monitoring as a real feature (not
 * inferred — see data/software/hubstaff.json and time-doctor.json cons:
 * "Screenshot and keystroke activity monitoring may face employee
 * privacy resistance" / "Strict monitoring capabilities may raise
 * privacy concerns among employees"). Used only to answer the adaptive
 * monitoringSensitivity question (Phase 6) — never applied to any other
 * domain, and never treated as "bad," just as evidence for buyers who
 * said they'd prefer something lighter-touch.
 */
const HEAVY_MONITORING_SLUGS = new Set(["hubstaff", "time-doctor"]);

export function isHardExcluded(software: Software, answers: RecommendationAnswers): boolean {
  // Free plan required, and this product's own stored pricing model is a
  // confirmed non-free model with no free tier. "unknown"/undefined stays
  // eligible — absence of data is never treated as evidence of exclusion.
  if (answers.budget === "free") {
    const model = software.pricing?.model;
    const confirmedNoFreeTier = model === "paid" && !software.pricing?.hasFreeTier;
    if (confirmedNoFreeTier) return true;
  }

  // Only applies within time_tracking, and only when the buyer explicitly
  // said they'd prefer something lighter-touch — never excludes a heavy-
  // monitoring tool for any other domain or preference.
  if (
    answers.primaryNeed === "time_tracking" &&
    answers.monitoringSensitivity === "prefer-lightweight" &&
    HEAVY_MONITORING_SLUGS.has(software.slug)
  ) {
    return true;
  }

  return false;
}

export function passesEligibility(software: Software, answers: RecommendationAnswers): boolean {
  return isDomainEligible(software, answers) && !isHardExcluded(software, answers);
}
