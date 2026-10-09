import { PUBLISHED_COMPARISONS, getComparisonSlug, getComparisonsInvolving } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { readAgentReport } from "@/lib/maintenance/report-io";
import type { MaintenanceReport } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * TRAFFIC ACQUISITION WAR MODE mission (2026-08-22) Phase 16 — a scored
 * shortlist of the comparison pages most worth spending distribution
 * effort (social posts, outreach) on, built entirely from data already in
 * the repo. GSC access remains blocked (see final report), so this
 * deliberately does NOT claim to measure real search demand — every
 * signal here is a documented PROXY, and the report says so explicitly:
 *
 *   - connectivity: how many OTHER published comparisons each
 *     participant appears in. A product compared against many peers is
 *     more likely a well-known, frequently-evaluated category entry —
 *     correlated with real demand, not proof of it.
 *   - freshness: average of both participants' freshness score
 *     (var/maintenance/freshness.json) — a well-documented page has more
 *     complete, citable facts, which matters for how good a page looks
 *     to a stranger who clicks through from social.
 *   - commercialSurface: whether either side has a live affiliate CTA —
 *     distribution effort on a page with zero monetization upside is
 *     lower-leverage than one where a click can become revenue.
 *
 * Extracted as its own script (not folded into scripts/analytics/report.ts)
 * because it scores static catalog/graph data, not analytics events — a
 * different input entirely, same as how scripts/affiliate/ledger.ts and
 * scripts/analytics/report.ts stay separate despite both being "growth"
 * reports.
 */

type FreshnessIssueData = { location: string; title: string };

function loadFreshnessScores(): Map<string, number> {
  const report = readAgentReport<unknown>("freshness") as MaintenanceReport<unknown> | null;
  const scores = new Map<string, number>();
  if (!report) return scores;
  for (const issue of report.issues as FreshnessIssueData[]) {
    const match = issue.title.match(/freshness score: (\d+)\/100/);
    if (match && issue.location) scores.set(issue.location, Number(match[1]));
  }
  return scores;
}

export interface DistributionShortlistRow {
  slug: string;
  productA: string;
  productB: string;
  connectivity: number;
  avgFreshness: number;
  commercialSurface: boolean;
  score: number;
}

export function buildDistributionShortlist(topN = 20): DistributionShortlistRow[] {
  const freshnessScores = loadFreshnessScores();

  const rows: DistributionShortlistRow[] = [];
  for (const [aSlug, bSlug] of PUBLISHED_COMPARISONS) {
    const softwareA = getSoftware(aSlug);
    const softwareB = getSoftware(bSlug);
    if (!softwareA || !softwareB) continue;

    const connectivity = getComparisonsInvolving(aSlug).length + getComparisonsInvolving(bSlug).length;
    const freshA = freshnessScores.get(aSlug) ?? 70; // 70 = a reasonable unscored default, not a claim of actual freshness
    const freshB = freshnessScores.get(bSlug) ?? 70;
    const avgFreshness = Math.round((freshA + freshB) / 2);
    const commercialSurface = shouldShowAffiliateDisclosure(softwareA) || shouldShowAffiliateDisclosure(softwareB);

    // Deliberately simple, auditable weights -- not a black-box model.
    // connectivity dominates (the only demand-correlated proxy available
    // without GSC); freshness and commercial surface break ties.
    const score = connectivity * 3 + avgFreshness * 0.3 + (commercialSurface ? 15 : 0);

    rows.push({
      slug: getComparisonSlug(aSlug, bSlug),
      productA: softwareA.name,
      productB: softwareB.name,
      connectivity,
      avgFreshness,
      commercialSurface,
      score: Math.round(score * 10) / 10,
    });
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, topN);
}

async function main() {
  const shortlist = buildDistributionShortlist(20);
  console.log("========================================================================================");
  console.log(" TOP 20 DISTRIBUTION-WORTHY MILOOSH COMPARISON PAGES");
  console.log(" (PROXY SIGNALS ONLY -- GSC access is blocked this session, so nothing here is real search");
  console.log("  demand data. connectivity = how many other published comparisons each side appears in.)");
  console.log("========================================================================================");
  console.log(`   ${"COMPARISON".padEnd(38)} CONN.  FRESH  COMMERCIAL  SCORE`);
  for (const row of shortlist) {
    console.log(`   ${row.slug.padEnd(38)} ${row.connectivity.toString().padStart(5)}  ${row.avgFreshness.toString().padStart(5)}  ${row.commercialSurface ? "yes".padStart(10) : "no".padStart(10)}  ${row.score}`);
  }
  console.log("========================================================================================\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
