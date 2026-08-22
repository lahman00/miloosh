import fs from "node:fs";
import path from "node:path";
import { getSoftware } from "@/data/software";
import { getComparisonsInvolving } from "@/data/comparisons";
import { generateComparisonData } from "@/lib/comparison";
import { TREATMENT_COHORT, CONTROL_COHORT, EXPERIMENT_STARTED_AT } from "@/data/experiments/comparison-quality-cohort";

/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22) — permanent
 * experiment tooling, item #11/#14. Records a real, reproducible Day-0
 * baseline for both cohorts: word-overlap similarity of each page's
 * whoShouldChoose text against its SIBLING comparisons (other comparisons
 * sharing at least one of the two products) — the same Jaccard-overlap
 * methodology the original cached finding used (var/agents/latest-report.json,
 * content-comparison-similarity-analyzer), so a later re-run is directly
 * comparable.
 *
 * Output goes to var/experiments/ — gitignored, generated, loaded only by
 * a future re-run of THIS script (never a compile-time import elsewhere;
 * see the 2026-08-22 production incident this mission's own P0 fixed for
 * exactly why that matters). Safe to delete and regenerate at any time.
 */

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function parseSlug(slug: string): { slugA: string; slugB: string } | null {
  const marker = slug.indexOf("-vs-");
  if (marker === -1) return null;
  return { slugA: slug.slice(0, marker), slugB: slug.slice(marker + 4) };
}

/**
 * For one side of one comparison (e.g. Notion's whoShouldChoose text on
 * notion-vs-clickup), the average Jaccard similarity of that text against
 * the SAME product's whoShouldChoose text on every OTHER comparison it
 * appears in. This is exactly what generateWhoShouldChoosePairAware is
 * trying to lower for the treatment cohort — a real, measurable proxy for
 * "does this text actually change per comparison, or read the same
 * everywhere."
 */
function averageSiblingSimilarity(productSlug: string, otherSlug: string, ownText: string): number {
  const siblings = getComparisonsInvolving(productSlug).filter(([a, b]) => !(a === otherSlug || b === otherSlug));
  if (siblings.length === 0) return 0;

  const scores: number[] = [];
  for (const [a, b] of siblings) {
    const siblingOtherSlug = a === productSlug ? b : a;
    const siblingOther = getSoftware(siblingOtherSlug);
    const self = getSoftware(productSlug);
    if (!self || !siblingOther) continue;
    const siblingData = generateComparisonData(self.slug === a ? self : siblingOther, self.slug === a ? siblingOther : self);
    const siblingText = siblingData.softwareA.slug === productSlug ? siblingData.whoShouldChooseA : siblingData.whoShouldChooseB;
    scores.push(jaccardSimilarity(ownText, siblingText));
  }
  return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
}

type CohortRow = {
  slug: string;
  side: "A" | "B";
  productSlug: string;
  productName: string;
  wordCount: number;
  avgSiblingSimilarity: number;
};

function measureCohort(cohort: readonly string[]): CohortRow[] {
  const rows: CohortRow[] = [];
  for (const slug of cohort) {
    const parsed = parseSlug(slug);
    if (!parsed) continue;
    const softwareA = getSoftware(parsed.slugA);
    const softwareB = getSoftware(parsed.slugB);
    if (!softwareA || !softwareB) continue;

    const data = generateComparisonData(softwareA, softwareB);
    for (const [side, product, text] of [
      ["A", softwareA, data.whoShouldChooseA],
      ["B", softwareB, data.whoShouldChooseB],
    ] as const) {
      const otherSlug = side === "A" ? softwareB.slug : softwareA.slug;
      rows.push({
        slug,
        side,
        productSlug: product.slug,
        productName: product.name,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        avgSiblingSimilarity: Math.round(averageSiblingSimilarity(product.slug, otherSlug, text) * 1000) / 1000,
      });
    }
  }
  return rows;
}

async function main() {
  const treatment = measureCohort(TREATMENT_COHORT);
  const control = measureCohort(CONTROL_COHORT);

  const avg = (rows: CohortRow[]) => (rows.length > 0 ? rows.reduce((s, r) => s + r.avgSiblingSimilarity, 0) / rows.length : 0);

  const baseline = {
    experimentStartedAt: EXPERIMENT_STARTED_AT,
    recordedAt: new Date().toISOString(),
    treatment: { rows: treatment, avgSiblingSimilarity: Math.round(avg(treatment) * 1000) / 1000 },
    control: { rows: control, avgSiblingSimilarity: Math.round(avg(control) * 1000) / 1000 },
    note: "Day-0 baseline only. Real ranking/indexation impact cannot be measured yet -- Google hasn't had time to re-crawl anything. This file exists so a future re-run has a real Day-0 to compare against, not so this run itself proves anything.",
  };

  const outDir = path.join(process.cwd(), "var", "experiments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "comparison-quality-day0.json");
  fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2));

  console.log(`Treatment avg sibling similarity (whoShouldChoose text): ${baseline.treatment.avgSiblingSimilarity}`);
  console.log(`Control avg sibling similarity (whoShouldChoose text):   ${baseline.control.avgSiblingSimilarity}`);
  console.log(`Written to ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
