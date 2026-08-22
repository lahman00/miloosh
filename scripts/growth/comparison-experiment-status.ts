import fs from "node:fs";
import path from "node:path";
import { TREATMENT_COHORT, CONTROL_COHORT, EXPERIMENT_STARTED_AT } from "@/data/experiments/comparison-quality-cohort";
import { loadPrioritySnapshot } from "@/scripts/growth/indexation-priority";

/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22), Phase 6 — permanent
 * status command for the pair-aware whoShouldChoose experiment (added in
 * lib/comparison.ts / data/experiments/comparison-quality-cohort.ts).
 * Protects the methodology: this reports on the experiment, it never
 * expands it. Run any time to see where the experiment currently stands;
 * re-run scripts/experiments/comparison-quality-baseline.ts first if you
 * want the similarity numbers refreshed.
 *
 * GSC columns (impressions/clicks/CTR/position) come from the committed,
 * reviewed data/seo/priority-snapshot.json (see scripts/growth/generate-
 * priority-snapshot.ts and its own provenance fields for exact freshness)
 * -- comparison-level GSC rows are rarer than software-page rows, so most
 * rows will honestly show "no cached evidence yet" rather than a
 * fabricated number.
 */

const DAY0_PATH = path.join(process.cwd(), "var", "experiments", "comparison-quality-day0.json");

interface Day0Baseline {
  experimentStartedAt: string;
  recordedAt: string;
  treatment: { avgSiblingSimilarity: number };
  control: { avgSiblingSimilarity: number };
}

function loadDay0(): Day0Baseline | null {
  try {
    const raw = fs.readFileSync(DAY0_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Day0Baseline;
    if (typeof parsed?.treatment?.avgSiblingSimilarity !== "number" || typeof parsed?.control?.avgSiblingSimilarity !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function gscRowFor(slug: string, snapshotByUrl: Map<string, { impressions: number; clicks: number; ctr: number; position: number }>): string {
  const gsc = snapshotByUrl.get(`/compare/${slug}`);
  if (!gsc) return "no cached GSC evidence yet";
  return `${gsc.impressions} impr / ${gsc.clicks} clicks (${(gsc.ctr * 100).toFixed(2)}% CTR) @ pos ${gsc.position.toFixed(1)}`;
}

function elapsedDays(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000));
}

async function main() {
  const day0 = loadDay0();
  const snapshotByUrl = loadPrioritySnapshot();

  console.log("========================================================================================");
  console.log(` COMPARISON QUALITY EXPERIMENT STATUS — started ${EXPERIMENT_STARTED_AT} (${elapsedDays(EXPERIMENT_STARTED_AT)} day(s) elapsed)`);
  console.log("========================================================================================");
  console.log(`  Treatment cohort: ${TREATMENT_COHORT.length} URLs — generateWhoShouldChoosePairAware() applied`);
  console.log(`  Control cohort:   ${CONTROL_COHORT.length} URLs — original generateWhoShouldChoose(), unchanged`);
  console.log("");

  if (day0) {
    console.log(`  Day-0 baseline (recorded ${day0.recordedAt}):`);
    console.log(`    Treatment avg sibling similarity: ${day0.treatment.avgSiblingSimilarity}`);
    console.log(`    Control avg sibling similarity:   ${day0.control.avgSiblingSimilarity}`);
  } else {
    console.log("  No Day-0 baseline found locally -- run scripts/experiments/comparison-quality-baseline.ts to generate one.");
  }
  console.log("");

  console.log("  Treatment URLs — indexation/demand evidence:");
  for (const slug of TREATMENT_COHORT) console.log(`    /compare/${slug.padEnd(38)} ${gscRowFor(slug, snapshotByUrl)}`);
  console.log("");
  console.log("  Control URLs — indexation/demand evidence:");
  for (const slug of CONTROL_COHORT) console.log(`    /compare/${slug.padEnd(38)} ${gscRowFor(slug, snapshotByUrl)}`);
  console.log("");

  const treatmentWithEvidence = TREATMENT_COHORT.filter((s) => snapshotByUrl.has(`/compare/${s}`)).length;
  const controlWithEvidence = CONTROL_COHORT.filter((s) => snapshotByUrl.has(`/compare/${s}`)).length;
  console.log(`  Real cached demand evidence: ${treatmentWithEvidence}/${TREATMENT_COHORT.length} treatment URLs, ${controlWithEvidence}/${CONTROL_COHORT.length} control URLs.`);
  console.log("  This is Day-0-class tooling -- indexation/ranking impact cannot be claimed until Google re-crawls and fresh GSC data is pulled. Do not compare treatment vs. control conversion/CTR from a tiny or zero sample.");
  console.log("========================================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
