import { rankCommercialOpportunities } from "./money-leaks-analyzer";
import { auditCategoryIntelligence } from "./category-intelligence";
import { mineGscOpportunities } from "./gsc-opportunity-miner";
import fs from "node:fs";
import path from "node:path";

export interface PriorityActionItem {
  rank: number;
  type: "AFFILIATE_MONETIZATION" | "STRIKING_DISTANCE_SEO" | "ROLE_GUIDE_EXPANSION" | "DATA_FRESHNESS" | "COMPARISON_BRIDGE";
  title: string;
  target: string;
  category: string;
  priorityScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  effort: "LOW" | "MEDIUM" | "HIGH";
  rationale: string;
  exactAction: string;
  suppressionReason?: string;
}

export function runCommercialPriorityEngine(): {
  generatedAt: string;
  totalPrioritized: number;
  topOpportunities: PriorityActionItem[];
  allOpportunities: PriorityActionItem[];
} {
  const leaks = rankCommercialOpportunities();
  const catAudit = auditCategoryIntelligence();
  const gscAudit = mineGscOpportunities();

  const items: PriorityActionItem[] = [];

  // 1. High-traffic striking distance SEO opportunities
  for (const g of gscAudit.strikingDistanceOpportunities) {
    if (!g.isProtected) {
      items.push({
        rank: 0,
        type: "STRIKING_DISTANCE_SEO",
        title: `Optimize SERP rank for striking distance target: ${g.targetSlug}`,
        target: g.url,
        category: "seo",
        priorityScore: 92 + Math.min(g.baselineImpressions, 8),
        confidence: "HIGH",
        effort: "LOW",
        rationale: `Currently ranks in position ${g.baselinePosition} with ${g.baselineImpressions} impressions. Small factual updates and schema optimization can push this to page 1.`,
        exactAction: `Deepen direct competitor comparison bridges and verify structured pricing schema.`
      });
    }
  }

  // 2. High-traffic unmonetized tools (Group B)
  for (const op of leaks.rankedNodes.filter(n => n.group === "B").slice(0, 8)) {
    items.push({
      rank: 0,
      type: "AFFILIATE_MONETIZATION",
      title: `Bridge traffic from unmonetized high-volume tool: ${op.name}`,
      target: `/software/${op.slug}`,
      category: op.category,
      priorityScore: op.score,
      confidence: "HIGH",
      effort: "MEDIUM",
      rationale: `${op.name} shows a heuristic traffic signal of ${op.gscImpressions} (NOT verified GSC impressions -- see lib/growth-audit/comparison-graph.ts) and participates in ${op.degree} comparisons.`,
      exactAction: `Ensure comparison pages route traffic effectively to active partners in ${op.category} while exploring direct affiliate partnership.`
    });
  }

  // 3. Active affiliate partners needing comparison depth (Group C)
  for (const op of leaks.rankedNodes.filter(n => n.group === "C")) {
    items.push({
      rank: 0,
      type: "COMPARISON_BRIDGE",
      title: `Expand comparison bridges for active partner: ${op.name}`,
      target: `/software/${op.slug}`,
      category: op.category,
      priorityScore: op.score,
      confidence: "HIGH",
      effort: "LOW",
      rationale: `Active affiliate partner with only ${op.degree} comparison routes.`,
      exactAction: `Add 2-3 genuine direct substitute comparisons against close market competitors.`
    });
  }

  // 4. Strategic Tier 1 Category Headroom
  for (const cat of catAudit.categories.filter(c => c.tier === "TIER 1 (Strategic)" && c.roleGuidesCount < 4)) {
    items.push({
      rank: 0,
      type: "ROLE_GUIDE_EXPANSION",
      title: `Deepen buyer guide coverage for Tier 1 category: ${cat.name}`,
      target: `/category/${cat.slug}`,
      category: cat.slug,
      priorityScore: 78,
      confidence: "MEDIUM",
      effort: "MEDIUM",
      rationale: `${cat.name} is a high commercial intent category with ${cat.productCount} products and ${cat.comparisonCount} comparisons but only ${cat.roleGuidesCount} role guides.`,
      exactAction: `Evaluate high-intent buyer personas (e.g. accounting, VoIP) for future role guide additions once search query demand is verified.`
    });
  }

  items.sort((a, b) => b.priorityScore - a.priorityScore);
  items.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return {
    generatedAt: new Date().toISOString(),
    totalPrioritized: items.length,
    topOpportunities: items.slice(0, 25),
    allOpportunities: items
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runCommercialPriorityEngine();
  const outPath = path.join(process.cwd(), "var/agents/commercial-priority-engine.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`================================================================`);
  console.log(`          MILOOSH COMMERCIAL PRIORITY ENGINE REPORT              `);
  console.log(`================================================================\n`);
  console.log(`✓ Ranked ${result.totalPrioritized} prioritized commercial actions based on real repository and affiliate state, plus a heuristic traffic signal (NOT verified GSC data -- see lib/growth-audit/comparison-graph.ts).\n`);
  console.log(`TOP 15 ACTIONABLE OPPORTUNITIES:`);
  result.topOpportunities.slice(0, 15).forEach(op => {
    console.log(` #${String(op.rank).padStart(2)} [${op.type}] (Score: ${op.priorityScore}) | ${op.title}`);
    console.log(`     Target: ${op.target} | Effort: ${op.effort} | Confidence: ${op.confidence}`);
    console.log(`     Rationale: ${op.rationale}`);
    console.log(`     Action:    ${op.exactAction}\n`);
  });
}
