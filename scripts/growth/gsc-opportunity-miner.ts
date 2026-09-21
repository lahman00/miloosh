import fs from "node:fs";
import path from "node:path";

const LEGACY_PROTECTED_COHORT = new Set([
  "pipedrive", "airtable", "semrush", "freshdesk", "buffer",
  "ringcentral", "help-scout", "intercom", "front"
]);

export function readProtectedExperimentSlugs(root = process.cwd()): Set<string> {
  const protectedSlugs = new Set(LEGACY_PROTECTED_COHORT);
  const docsDir = path.join(root, "docs");
  if (!fs.existsSync(docsDir)) return protectedSlugs;

  for (const filename of fs.readdirSync(docsDir).filter((name) => /^work-revenue-experiment-receipt-.*\.json$/.test(name))) {
    const receiptPath = path.join(docsDir, filename);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf-8")) as { experiments?: Array<{ page?: string; decision?: string }> };
    for (const experiment of receipt.experiments ?? []) {
      if (experiment.decision !== "MEASURING" || !experiment.page?.startsWith("/software/")) continue;
      protectedSlugs.add(experiment.page.slice("/software/".length));
    }
  }

  return protectedSlugs;
}

export interface GscOpportunity {
  targetSlug: string;
  url: string;
  baselineImpressions: number;
  baselineClicks: number;
  baselinePosition: number;
  isProtected: boolean;
  opportunityType: "STRIKING_DISTANCE" | "HIGH_IMPRESSION_ZERO_CLICK" | "QUERY_EXPANSION";
  trackedQueries: string[];
  recommendedAction: string;
}

export interface ExperimentItem {
  url: string;
  queryCluster?: string[];
  baseline?: {
    impressions?: number;
    clicks?: number;
    bestPosition?: number;
  };
}

export function buildGscOpportunity(item: ExperimentItem, protectedCohort: Set<string>): GscOpportunity {
  const url = item.url;
  const slug = url.split("/").pop() ?? "";
  const imp = item.baseline?.impressions ?? 0;
  const clicks = item.baseline?.clicks ?? 0;
  const pos = Number((item.baseline?.bestPosition ?? 0).toFixed(1));
  const queries = item.queryCluster ?? [];
  const isProtected = protectedCohort.has(slug);

  let type: GscOpportunity["opportunityType"] = "QUERY_EXPANSION";
  let action = "";

  if (pos >= 8 && pos <= 30) {
    type = "STRIKING_DISTANCE";
    action = isProtected
      ? "Protected experiment cohort: baseline locked; do not edit on-page content during experiment window."
      : "Striking distance keyword: deepen substitute comparison bridges and update verified pricing schema to improve SERP rank.";
  } else if (imp >= 20 && clicks === 0) {
    type = "HIGH_IMPRESSION_ZERO_CLICK";
    action = isProtected
      ? "Protected experiment cohort: active measurement underway; observe without modifying page copy."
      : "High impressions with 0 clicks: optimize meta description and schema rich snippets to increase CTR.";
  } else {
    type = "QUERY_EXPANSION";
    action = isProtected
      ? "Protected cohort: monitor query impressions."
      : "Expand relevant direct substitute comparisons aligned with high-volume search queries.";
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
  const expPath = path.join(process.cwd(), "var/agents/first-click-experiment.json");
  let items: ExperimentItem[] = [];
  if (fs.existsSync(expPath)) {
    try {
      items = JSON.parse(fs.readFileSync(expPath, "utf-8")) as ExperimentItem[];
    } catch {}
  }

  const opportunities: GscOpportunity[] = [];
  const protectedCohort = readProtectedExperimentSlugs();

  for (const item of items) {
    opportunities.push(buildGscOpportunity(item, protectedCohort));
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
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ GSC Search Intent Mining: Analyzed ${result.totalAnalyzed} target URLs from 28-day snapshot.`);
  console.log(`  - Striking Distance (Pos 8-30):        ${result.strikingDistanceOpportunities.length}`);
  console.log(`  - High-Impression Zero-Click (Imp>=20): ${result.highImpressionOpportunities.length}`);
  console.log(`\nTop Striking Distance Opportunities:`);
  result.strikingDistanceOpportunities.forEach(o => {
    console.log(`   - [${o.targetSlug}] Pos: ${o.baselinePosition} | Imp: ${o.baselineImpressions} | Protected: ${o.isProtected} | ${o.recommendedAction}`);
  });
}
