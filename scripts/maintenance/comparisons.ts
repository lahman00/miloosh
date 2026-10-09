import { getAllSoftware, type Software } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAffiliateProgram } from "@/data/revenue/affiliate-programs";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * Sprint 12 Phase 6 — Comparison Opportunity Agent. Suggests candidate
 * /compare pairs from the verified dataset only. Never writes to
 * data/comparisons.ts or anywhere else — every candidate is a suggestion
 * for a human to review and add deliberately, the same way the 20
 * existing pairs were curated by hand in Sprint 7.
 */

const MIN_FEATURES_FOR_MEANINGFUL_COMPARISON = 3;
const MAX_CANDIDATES_IN_REPORT = 30;

export type ComparisonCandidate = {
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  priority: number;
  reasons: string[];
};

function isPublished(published: Set<string>, slugA: string, slugB: string): boolean {
  return published.has([slugA, slugB].sort().join("-vs-"));
}

function hasEnoughData(software: Software): boolean {
  return software.features.length >= MIN_FEATURES_FOR_MEANINGFUL_COMPARISON;
}

function isDirectAlternative(a: Software, b: Software): boolean {
  return a.alternatives.some((alt) => alt.slug === b.slug) || b.alternatives.some((alt) => alt.slug === a.slug);
}

async function run() {
  const allSoftware = getAllSoftware();
  const publishedKeys = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => [a, b].sort().join("-vs-")));

  const comparisonCountBySlug = new Map<string, number>();
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    comparisonCountBySlug.set(a, (comparisonCountBySlug.get(a) ?? 0) + 1);
    comparisonCountBySlug.set(b, (comparisonCountBySlug.get(b) ?? 0) + 1);
  }

  const candidates: ComparisonCandidate[] = [];
  let skippedInsufficientData = 0;
  let skippedNoRelevance = 0;

  for (let i = 0; i < allSoftware.length; i++) {
    for (let j = i + 1; j < allSoftware.length; j++) {
      const a = allSoftware[i];
      const b = allSoftware[j];

      if (isPublished(publishedKeys, a.slug, b.slug)) continue;

      if (!hasEnoughData(a) || !hasEnoughData(b)) {
        skippedInsufficientData++;
        continue;
      }

      const sameCategory = a.category === b.category;
      const directAlternative = isDirectAlternative(a, b);

      if (!sameCategory && !directAlternative) {
        skippedNoRelevance++;
        continue;
      }

      const reasons: string[] = [];
      let priority = 0;

      if (directAlternative) {
        priority += 40;
        reasons.push("Each lists the other as a direct alternative in its own data file.");
      }
      if (sameCategory) {
        priority += 20;
        reasons.push(`Both are categorized as "${a.category}".`);
      }

      const programA = getAffiliateProgram(a.slug);
      const programB = getAffiliateProgram(b.slug);
      if (programA?.programExists === "yes" && programB?.programExists === "yes") {
        priority += 10;
        reasons.push("Both have a confirmed affiliate program — this comparison could carry commercial value once activated.");
      }

      const existingA = comparisonCountBySlug.get(a.slug) ?? 0;
      const existingB = comparisonCountBySlug.get(b.slug) ?? 0;
      const gapBonus = Math.max(0, 10 - (existingA + existingB));
      if (gapBonus > 0) {
        priority += gapBonus;
        reasons.push(`Coverage gap: ${a.name} appears in ${existingA} published comparison(s), ${b.name} in ${existingB}.`);
      }

      candidates.push({ slugA: a.slug, slugB: b.slug, nameA: a.name, nameB: b.name, priority, reasons });
    }
  }

  candidates.sort((x, y) => y.priority - x.priority);

  const issues: MaintenanceIssue[] = candidates.slice(0, MAX_CANDIDATES_IN_REPORT).map((candidate) => ({
    id: `comparison-opportunity-${candidate.slugA}-${candidate.slugB}`,
    severity: "info",
    title: `Candidate comparison: ${candidate.nameA} vs ${candidate.nameB}`,
    description: `Priority ${candidate.priority}. ${candidate.reasons.join(" ")}`,
    location: getComparisonSlug(candidate.slugA, candidate.slugB),
  }));

  return {
    summary: `Evaluated ${(allSoftware.length * (allSoftware.length - 1)) / 2} possible pairs (${PUBLISHED_COMPARISONS.length} already published). Found ${candidates.length} candidate(s) with enough data and real relevance (skipped ${skippedInsufficientData} for thin data, ${skippedNoRelevance} for no category/alternative relationship). Nothing was published — see docs/maintenance-system.md.`,
    issues,
    data: {
      totalCandidates: candidates.length,
      skippedInsufficientData,
      skippedNoRelevance,
      topCandidates: candidates.slice(0, MAX_CANDIDATES_IN_REPORT),
    },
  };
}

export async function executeComparisonsAgent() {
  const report = await runAgent("comparisons", run);

  const extra = report.data
    ? [
        "## Top candidates",
        "",
        "| Pair | Priority | Why |",
        "|---|---|---|",
        ...report.data.topCandidates.map(
          (c) => `| ${c.nameA} vs ${c.nameB} | ${c.priority} | ${c.reasons.join(" ")} |`
        ),
        "",
        "No comparison was published by this agent — these are suggestions for a human to review and add manually, the same way the existing 20 pairs were curated.",
        "",
      ].join("\n")
    : "";

  writeReport(report, extra);
  return report;
}

async function main() {
  const report = await executeComparisonsAgent();
  console.log(`[comparisons] ${report.summary}`);
  console.log(`[comparisons] run status: ${report.run.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
