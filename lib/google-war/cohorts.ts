import { FROZEN_COHORTS } from "@/data/growth/frozen-cohorts";
import { TREATMENT_COHORT, CONTROL_COHORT, EXPERIMENT_STARTED_AT } from "@/data/experiments/comparison-quality-cohort";
import rankingChanges from "@/docs/growth/receipts/20260926-ranking-war/changes.json";
import rankingControls from "@/docs/growth/receipts/20260926-ranking-war/controls.json";
import comparisonTreatment from "@/docs/growth/receipts/20260926-google-war-phase2/comparison-treatment.json";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";

export function canonicalCohortPage(page: string) {
  if (!page.startsWith("/compare/")) return page;
  const pair = PUBLISHED_COMPARISONS.find(([a, b]) => [getComparisonSlug(a, b), getComparisonSlug(b, a)].includes(page.slice(9)));
  return pair ? `/compare/${getComparisonSlug(...pair)}` : page;
}

export type Cohort = {
  id: string; recordedDate: string; intervention: string; source: string;
  treatment: string[]; control: string[]; controlDesign: "NONRANDOM_HELD_OUT" | "NATURAL_NOT_HELD_OUT" | "NONE";
};
/** Canonical read model. Membership is derived, never copied away from the
 * editorial registries. Deployment dates must come from deployment receipts. */
export function cohortRegistry(): Cohort[] {
  const cohorts: Cohort[] = [
    ...FROZEN_COHORTS.map(c => ({ id: c.wave, recordedDate: "2026-09-26", intervention: "software factual-depth / decision support", source: "data/growth/frozen-cohorts.ts",
      treatment: c.treatment.map(s => `/software/${s}`), control: c.control.map(s => `/software/${s}`), controlDesign: "NONRANDOM_HELD_OUT" as const })),
    { id: "comparison-quality-20260822", recordedDate: EXPERIMENT_STARTED_AT, intervention: "pair-specific who-should-choose", source: "data/experiments/comparison-quality-cohort.ts",
      treatment: TREATMENT_COHORT.map(s => `/compare/${s}`), control: CONTROL_COHORT.map(s => `/compare/${s}`), controlDesign: "NONRANDOM_HELD_OUT" },
    { id: "ranking-intent-20260926", recordedDate: rankingChanges.generatedAt, intervention: "SERP metadata intent alignment", source: "docs/growth/receipts/20260926-ranking-war/changes.json",
      treatment: rankingChanges.changesExecuted.map(r => r.url), control: ["/software/umbraco", ...rankingControls.naturalControlSet.map(s => `/software/${s}`)], controlDesign: "NATURAL_NOT_HELD_OUT" },
    { id: "comparison-factual-depth-20260926", recordedDate: comparisonTreatment.generatedAt, intervention: "constituent product enrichment", source: "docs/growth/receipts/20260926-google-war-phase2/comparison-treatment.json",
      treatment: comparisonTreatment.treatmentExecuted.comparisonsThisImproves.map(s => `/compare/${s}`), control: [], controlDesign: "NONE" },
  ];
  return cohorts.map(c => ({ ...c, treatment: [...new Set(c.treatment.map(canonicalCohortPage))], control: [...new Set(c.control.map(canonicalCohortPage))] }));
}
export function cohortOverlaps(cohorts: Cohort[]) {
  const pages = new Map<string, string[]>();
  for (const c of cohorts) for (const [arm, urls] of [["treatment", c.treatment], ["control", c.control]] as const)
    for (const page of urls) pages.set(page, [...(pages.get(page) ?? []), `${c.id}:${arm}`]);
  return [...pages].filter(([, groups]) => groups.length > 1).map(([page, groups]) => ({ page, groups, status: "OVERLAP_REQUIRES_REVIEW" }));
}
