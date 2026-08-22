import { getSoftware } from "@/data/software";
import { buildIndexationPriorityList, loadCachedGscOpportunities } from "@/scripts/growth/indexation-priority";
import { scoreFactualDepth, type FactualDepthRow } from "@/scripts/growth/factual-depth-audit";

/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22), Phase 4 — crosses
 * factual depth (Phase 3) against real demand evidence (the existing
 * CACHED/INFERRED indexation-priority list) to answer one specific
 * question: where does REAL DEMAND meet a REAL, FIXABLE content
 * deficiency?
 *
 * Deliberately NOT "which page is thinnest" — a thin page nobody is
 * searching for is not a priority. Deliberately NOT "which page has the
 * most impressions" either — a rich, complete page already serving its
 * searchers well needs no work. The target is the intersection: Google is
 * already testing this page (CACHED impressions), and the page has an
 * identifiable, verifiable-with-real-facts gap (factual depth bucket C/D).
 *
 * Only covers software pages (buildIndexationPriorityList also scores
 * comparison pages, which don't have a factual-depth score of their own --
 * out of scope for this queue, in scope for the separate comparison-
 * duplication experiment already running).
 */

export interface RemediationCandidate {
  slug: string;
  name: string;
  factualDepth: FactualDepthRow;
  gscImpressions: number;
  gscPosition: number;
  strikingDistance: boolean; // position roughly 8-40, per mission instruction
  priorityScore: number;
}

export function buildRemediationQueue(maxCandidates = 10): RemediationCandidate[] {
  const gscBySlug = loadCachedGscOpportunities();
  const indexationRows = buildIndexationPriorityList(500).filter((r) => r.kind === "software" && r.evidenceType === "CACHED");

  const candidates: RemediationCandidate[] = [];
  for (const row of indexationRows) {
    const slug = row.url.replace("/software/", "");
    const software = getSoftware(slug);
    const gsc = gscBySlug.get(slug);
    if (!software || !gsc) continue;

    const factualDepth = scoreFactualDepth(software);
    if (factualDepth.bucket !== "C" && factualDepth.bucket !== "D") continue; // only real, identifiable deficiencies

    const strikingDistance = gsc.baselinePosition >= 8 && gsc.baselinePosition <= 40;
    // Real demand (impressions, inverse position) weighted against how thin
    // the page is (lower factual depth = more room for a fix to matter).
    const priorityScore = gsc.baselineImpressions * 5 + (100 - Math.min(100, gsc.baselinePosition)) + (100 - factualDepth.score) * 0.5 + (strikingDistance ? 20 : 0);

    candidates.push({
      slug,
      name: software.name,
      factualDepth,
      gscImpressions: gsc.baselineImpressions,
      gscPosition: gsc.baselinePosition,
      strikingDistance,
      priorityScore: Math.round(priorityScore * 10) / 10,
    });
  }

  return candidates.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, maxCandidates);
}

async function main() {
  const queue = buildRemediationQueue(10);
  console.log("========================================================================================");
  console.log(` REMEDIATION QUEUE — real demand (CACHED GSC) × factual-depth deficiency (bucket C/D)`);
  console.log("========================================================================================");
  if (queue.length === 0) {
    console.log("  No candidates: every page with real CACHED demand evidence already scores A/B on factual depth.");
  }
  for (const c of queue) {
    console.log(`  ${c.slug.padEnd(20)} depth ${c.factualDepth.score.toString().padStart(3)} [${c.factualDepth.bucket}]  |  ${c.gscImpressions} impr @ pos ${c.gscPosition.toFixed(1)}${c.strikingDistance ? "  (striking distance)" : ""}  |  priority ${c.priorityScore}`);
  }
  console.log("========================================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
