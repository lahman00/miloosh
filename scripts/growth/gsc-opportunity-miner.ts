import fs from "node:fs";
import path from "node:path";
import { loadProtection } from "@/lib/google-war/protection";
import { inspectionSchema, searchSnapshotSchema } from "@/lib/google-war/evidence";
import { classifyInspectionEvidence, resolveEvidence } from "@/lib/google-war/resolver";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";

export function readProtectedExperimentSlugs(root = process.cwd()): Set<string> {
  const protectedPages = loadProtection(root);
  const slugs = new Set(protectedPages.map(p => p.page.split("/").pop()!));
  const products = new Set(protectedPages.filter(p => p.page.startsWith("/software/")).map(p => p.page.slice(10)));
  for (const [a, b] of PUBLISHED_COMPARISONS) if (products.has(a) || products.has(b)) slugs.add(getComparisonSlug(a, b));
  return slugs;
}

export interface GscOpportunity {
  targetSlug: string;
  url: string;
  baselineImpressions: number | null;
  baselineClicks: number | null;
  baselinePosition: number | null;
  isProtected: boolean;
  opportunityType: "STRIKING_DISTANCE" | "HIGH_IMPRESSION_ZERO_CLICK" | "QUERY_EXPANSION" | "INDEX_SELECTION" | "HOLD";
  trackedQueries: string[];
  recommendedAction: string;
}

export interface ExperimentItem {
  url: string;
  queryCluster?: string[];
  baseline?: {
    impressions?: number | null;
    clicks?: number | null;
    bestPosition?: number | null;
  };
}

export function buildGscOpportunity(item: ExperimentItem, protectedCohort: Set<string>, evidence: ReturnType<typeof resolveEvidence> | null = null): GscOpportunity {
  const url = item.url;
  const slug = url.split("/").pop() ?? "";
  const imp = item.baseline?.impressions ?? null;
  const clicks = item.baseline?.clicks ?? null;
  const pos = item.baseline?.bestPosition == null ? null : Number(item.baseline.bestPosition.toFixed(1));
  const queries = item.queryCluster ?? [];
  const isProtected = protectedCohort.has(slug);

  let type: GscOpportunity["opportunityType"] = "QUERY_EXPANSION";
  let action = "";

  if (evidence?.lostIndexation || evidence?.suspectedLostIndexation) {
    type = "INDEX_SELECTION";
    action = "Historical ranking is superseded by non-indexed evidence; no ranking or title-test recommendation. Verify source/recrawl first.";
  } else if (isProtected || !evidence?.rankingEligible) {
    type = "HOLD";
    action = isProtected ? "Protected experiment cohort: observe only." : "Current indexation evidence unavailable, stale or conflicting; inspect before ranking intervention.";
  } else if (pos !== null && pos >= 8 && pos <= 20 && (imp ?? 0) >= 100) {
    type = "STRIKING_DISTANCE";
    action = isProtected
      ? "Protected experiment cohort: baseline locked; do not edit on-page content during experiment window."
      : "Review measured query ownership and existing decision support; no automatic content or schema change.";
  } else if ((imp ?? 0) >= 100 && clicks === 0 && pos !== null && pos >= 1 && pos <= 10) {
    type = "HIGH_IMPRESSION_ZERO_CLICK";
    action = isProtected
      ? "Protected experiment cohort: active measurement underway; observe without modifying page copy."
      : "Position makes CTR review meaningful; inspect query mix before proposing a controlled snippet test.";
  } else {
    type = "QUERY_EXPANSION";
    action = isProtected
      ? "Protected cohort: monitor query impressions."
      : "Collect exact query×page evidence; no inferred high-volume query or automatic expansion.";
  }

  return {
    targetSlug: slug,
    url,
    baselineImpressions: imp,
    baselineClicks: clicks,
    baselinePosition: pos,
    isProtected,
    opportunityType: type,
    trackedQueries: queries,
    recommendedAction: action,
  };
}

export function mineGscOpportunities(): {
  totalAnalyzed: number;
  strikingDistanceOpportunities: GscOpportunity[];
  highImpressionOpportunities: GscOpportunity[];
  allOpportunities: GscOpportunity[];
} {
  const root = path.join(process.cwd(), "data/growth/google-war");
  const snapshot = searchSnapshotSchema.parse(JSON.parse(fs.readFileSync(path.join(root, "search-snapshot.json"), "utf8")));
  const inspections = ["inspections.json", "reported-inspections.json"].flatMap(file => inspectionSchema.array().parse(JSON.parse(fs.readFileSync(path.join(root, file), "utf8")))).map(classifyInspectionEvidence);
  const items: ExperimentItem[] = snapshot.rows.map(r => ({ url: r.url, baseline: { impressions: r.impressions, clicks: r.clicks, bestPosition: r.position } }));

  const opportunities: GscOpportunity[] = [];
  const protectedCohort = readProtectedExperimentSlugs();

  for (const item of items) {
    opportunities.push(buildGscOpportunity(item, protectedCohort, resolveEvidence(item.url, inspections, snapshot, new Date().toISOString())));
  }

  const striking = opportunities.filter(o => o.opportunityType === "STRIKING_DISTANCE");
  const highImp = opportunities.filter(o => o.opportunityType === "HIGH_IMPRESSION_ZERO_CLICK");

  return {
    totalAnalyzed: opportunities.length,
    strikingDistanceOpportunities: striking,
    highImpressionOpportunities: highImp,
    allOpportunities: opportunities
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = mineGscOpportunities();
  const outPath = path.join(process.cwd(), "var/agents/gsc-opportunity-mining.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Analyzed ${result.totalAnalyzed} exact rows from the canonical dated GSC snapshot; no query inference.`);
  console.log(`  - Striking Distance (Pos 8-20, Imp>=100): ${result.strikingDistanceOpportunities.length}`);
  console.log(`  - CTR review (Pos<=10, Imp>=100): ${result.highImpressionOpportunities.length}`);
  console.log(`\nTop Striking Distance Opportunities:`);
  result.strikingDistanceOpportunities.forEach(o => {
    console.log(`   - [${o.targetSlug}] Pos: ${o.baselinePosition} | Imp: ${o.baselineImpressions} | Protected: ${o.isProtected} | ${o.recommendedAction}`);
  });
}
