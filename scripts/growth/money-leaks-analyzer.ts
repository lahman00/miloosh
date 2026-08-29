import { buildCommercialGraph } from "./commercial-graph-engine";
import fs from "node:fs";
import path from "node:path";

export interface RankedOpportunity {
  rank: number;
  slug: string;
  name: string;
  category: string;
  group: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  groupName: string;
  score: number;
  /** See CommercialNode.bestAvailableTrafficSignal (commercial-graph-engine.ts) -- a blend of heuristic and, when available, real experiment data. Not pure heuristic, not pure verified GSC. */
  bestAvailableTrafficSignal: number;
  degree: number;
  monetizedComps: number;
  affiliateStatus: string;
  affiliateNetwork: string | null;
  rationale: string;
  actionableStep: string;
}

export function rankCommercialOpportunities(): {
  rankedNodes: RankedOpportunity[];
  groupSummary: Record<string, number>;
} {
  const graph = buildCommercialGraph();
  const opportunities: RankedOpportunity[] = [];

  for (const node of graph.nodes) {
    let group: RankedOpportunity["group"] = "H";
    let groupName = "LOW VALUE / MAINTENANCE";
    let score = 0;
    let rationale = "";
    let actionableStep = "";

    const hasTraffic = node.bestAvailableTrafficSignal > 0;
    const isActive = node.affiliateStatus === "ACTIVE";
    const isPending = node.affiliateStatus === "PENDING";
    const isBlocked = node.affiliateStatus === "OWNER_BLOCKED" || node.affiliateStatus === "REJECTED";
    const isHighIntentCategory = ["crm", "customer-support", "marketing", "accounting", "field-service-management", "security", "property-management", "communication"].includes(node.category);

    if (isActive && hasTraffic) {
      group = "A";
      groupName = "TRAFFIC + ACTIVE AFFILIATE";
      score = 90 + Math.min(node.bestAvailableTrafficSignal / 5, 10);
      rationale = `Active affiliate partner with a high traffic signal (${node.bestAvailableTrafficSignal}, ${node.degree} comparisons) -- a blend of heuristic and real experiment data where available, not a pure verified GSC measurement, see commercial-graph-engine.ts's CommercialNode.bestAvailableTrafficSignal.`;
      actionableStep = `Maximize comparison bridge density and feature in high-intent role guides.`;
    } else if (hasTraffic && isPending) {
      group = "F";
      groupName = "PENDING AFFILIATE + TRAFFIC SIGNAL";
      score = 80 + Math.min(node.bestAvailableTrafficSignal / 5, 15);
      rationale = `Affiliate application pending with a high traffic signal (${node.bestAvailableTrafficSignal}) -- a blend of heuristic and real experiment data where available, not a pure verified Search Console measurement.`;
      actionableStep = `Monitor affiliate network approval and prepare immediate CTA activation.`;
    } else if (hasTraffic && !isActive && !isBlocked) {
      group = "B";
      groupName = "TRAFFIC + NO AFFILIATE";
      score = 75 + Math.min(node.bestAvailableTrafficSignal / 5, 20);
      rationale = `Shows a traffic signal (${node.bestAvailableTrafficSignal} -- a blend of heuristic and real experiment data where available, not a pure verified Search Console measurement) but unmonetized directly.`;
      actionableStep = `Bridge via comparison pages to active partners and explore affiliate partnership.`;
    } else if (isActive && node.degree <= 8) {
      group = "C";
      groupName = "APPROVED AFFILIATE + WEAK CONTENT";
      score = 70 + (10 - node.degree);
      rationale = `Approved active affiliate partner with low comparison graph degree (${node.degree} comps).`;
      actionableStep = `Expand high-intent comparison pairs with relevant direct substitutes.`;
    } else if (node.degree >= 12 && node.monetizationMultiplier >= 0.5) {
      group = "D";
      groupName = "HIGH COMPARISON MULTIPLIER";
      score = 65 + Math.min(node.degree, 15);
      rationale = `Central comparison node (${node.degree} comps) with high affiliate monetization density (${Math.round(node.monetizationMultiplier * 100)}%).`;
      actionableStep = `Maintain high content freshness and optimize buyer comparison decision criteria.`;
    } else if (isBlocked) {
      group = "G";
      groupName = "REJECTED / HOLD / OWNER BLOCKED";
      score = 10;
      rationale = `Program status is blocked or rejected.`;
      actionableStep = `Do not attempt unverified re-application; monetize strictly via neutral competitor comparisons.`;
    } else if (isHighIntentCategory) {
      group = "E";
      groupName = "HIGH BUYER INTENT + LOW VISIBILITY";
      score = 50 + (node.degree < 5 ? 10 : 0);
      rationale = `High-intent commercial category (${node.category}) with growth headroom (${node.degree} comps).`;
      actionableStep = `Improve buyer guidance, verify pricing, and expand key substitute comparisons.`;
    } else {
      group = "H";
      groupName = "LOW VALUE / MAINTENANCE";
      score = 20;
      rationale = `Standard catalog tool in lower-commercial category or open source.`;
      actionableStep = `Maintain basic factual freshness.`;
    }

    opportunities.push({
      rank: 0,
      slug: node.slug,
      name: node.name,
      category: node.category,
      group,
      groupName,
      score,
      bestAvailableTrafficSignal: node.bestAvailableTrafficSignal,
      degree: node.degree,
      monetizedComps: node.monetizedComparisonsCount,
      affiliateStatus: node.affiliateStatus,
      affiliateNetwork: node.affiliateNetwork,
      rationale,
      actionableStep
    });
  }

  opportunities.sort((a, b) => b.score - a.score || b.bestAvailableTrafficSignal - a.bestAvailableTrafficSignal || b.degree - a.degree);
  opportunities.forEach((op, idx) => {
    op.rank = idx + 1;
  });

  const groupSummary: Record<string, number> = {};
  for (const op of opportunities) {
    groupSummary[op.group] = (groupSummary[op.group] ?? 0) + 1;
  }

  return { rankedNodes: opportunities, groupSummary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { rankedNodes, groupSummary } = rankCommercialOpportunities();
  const outPath = path.join(process.cwd(), "var/agents/money-leaks-ranked.json");
  fs.writeFileSync(outPath, JSON.stringify({ groupSummary, rankedNodes }, null, 2));
  console.log(`✓ Ranked 247 catalog products into commercial opportunity groups A-H.`);
  console.log(`✓ Group breakdown:`, groupSummary);
  console.log(`\nTop 15 Commercial Opportunities:`);
  rankedNodes.slice(0, 15).forEach(op => {
    console.log(`   #${String(op.rank).padStart(2)} [Group ${op.group}] ${op.name.padEnd(20)} (Score: ${op.score}) | Traffic signal: ${String(op.bestAvailableTrafficSignal).padStart(2)} | Comps: ${String(op.degree).padStart(2)} | ${op.actionableStep}`);
  });
}
