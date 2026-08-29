import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { runFullAffiliateSweep, type AffiliateClassification } from "./full-affiliate-sweep";
import fs from "node:fs";
import path from "node:path";

export interface TopMoneyOpportunity {
  rank: number;
  slug: string;
  name: string;
  category: string;
  /** Heuristic traffic-priority signal, NOT a verified GSC measurement -- see lib/growth-audit/comparison-graph.ts. */
  heuristicSignal: number;
  programStatus:
    | "ACTIVE"
    | "APPROVED_NOT_ACTIVATED"
    | "ELIGIBLE_READY_TO_APPLY"
    | "OWNER_BLOCKED"
    | "PENDING"
    | "NEEDS_MORE_RESEARCH";
  network: string;
  commission: string;
  publishedComparisons: number;
  moneyScore: number;
  strategicAction: string;
}

const EXCLUDED_CLASSIFICATIONS = new Set<AffiliateClassification>([
  "REJECTED",
  "NO_REAL_PROGRAM_FOUND",
  "EDITORIALLY_UNSUITABLE",
]);

function opportunityStatus(classification: AffiliateClassification): TopMoneyOpportunity["programStatus"] | null {
  switch (classification) {
    case "ACTIVE_AFFILIATE":
      return "ACTIVE";
    case "APPROVED_NOT_ACTIVATED":
      return "APPROVED_NOT_ACTIVATED";
    case "APPLICATION_PENDING":
      return "PENDING";
    case "ELIGIBLE_READY_TO_APPLY":
      return "ELIGIBLE_READY_TO_APPLY";
    case "OWNER_ACTION_REQUIRED":
      return "OWNER_BLOCKED";
    case "NEEDS_MORE_RESEARCH":
      return "NEEDS_MORE_RESEARCH";
    case "REJECTED":
    case "NO_REAL_PROGRAM_FOUND":
    case "EDITORIALLY_UNSUITABLE":
      return null;
  }
}

function statusBonus(status: TopMoneyOpportunity["programStatus"]): number {
  switch (status) {
    case "ACTIVE":
      return 25;
    case "APPROVED_NOT_ACTIVATED":
      return 22;
    case "ELIGIBLE_READY_TO_APPLY":
      return 15;
    case "PENDING":
      return 12;
    case "OWNER_BLOCKED":
      return 8;
    case "NEEDS_MORE_RESEARCH":
      return 3;
  }
}

function strategicAction(
  status: TopMoneyOpportunity["programStatus"],
  name: string,
  network: string,
  comparisons: number,
  heuristicSignal: number,
): string {
  switch (status) {
    case "ACTIVE":
      return `Active monetization path. Improve conversion on the ${comparisons} existing comparison route(s) and measure qualified outbound traffic.`;
    case "APPROVED_NOT_ACTIVATED":
      return `Approval exists but activation is incomplete. Finish the evidenced activation requirement before adding public affiliate CTAs.`;
    case "PENDING":
      return `Application is pending. Preserve editorial coverage and wait for first-party approval/rejection evidence; do not reapply.`;
    case "OWNER_BLOCKED":
      return `Current relationship requires an owner-only checkpoint. Resolve only the blocker recorded in current affiliate truth.`;
    case "ELIGIBLE_READY_TO_APPLY":
      return `A current public program is evidenced. Prioritize an application only if a heuristic traffic signal of ${heuristicSignal} (NOT a measured GSC impression count) and ${comparisons} comparison route(s) justify the owner/network cost.`;
    case "NEEDS_MORE_RESEARCH":
      return `${name} has demand/coverage but no sufficiently verified current relationship. Verify the vendor's current publisher route before any application work.`;
  }
}

/**
 * Static commercial-opportunity view. This is NOT the canonical live money
 * priority engine: it has no production session/click data. It exists only to
 * rank current relationship/content opportunities using repository evidence.
 * The live revenue ranking remains lib/growth/money-priority-engine.ts.
 */
export function rankTopMoneyOpportunities(): TopMoneyOpportunity[] {
  const sweep = runFullAffiliateSweep();

  const compCounts = new Map<string, number>();
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    compCounts.set(a, (compCounts.get(a) ?? 0) + 1);
    compCounts.set(b, (compCounts.get(b) ?? 0) + 1);
  }

  const list: TopMoneyOpportunity[] = [];

  for (const product of sweep.allProducts) {
    if (EXCLUDED_CLASSIFICATIONS.has(product.classification)) continue;
    const status = opportunityStatus(product.classification);
    if (!status) continue;

    const comparisons = compCounts.get(product.slug) ?? 0;
    const network = product.network ?? "UNKNOWN";
    const commission = product.commissionStructure ?? "UNKNOWN";
    const score = product.heuristicSignal * 2 + comparisons * 1.5 + statusBonus(status);

    list.push({
      rank: 0,
      slug: product.slug,
      name: product.name,
      category: product.category,
      heuristicSignal: product.heuristicSignal,
      programStatus: status,
      network,
      commission,
      publishedComparisons: comparisons,
      moneyScore: Number(score.toFixed(1)),
      strategicAction: strategicAction(status, product.name, network, comparisons, product.heuristicSignal),
    });
  }

  list.sort((a, b) => b.moneyScore - a.moneyScore || a.slug.localeCompare(b.slug));
  list.forEach((item, index) => {
    item.rank = index + 1;
  });

  return list.slice(0, 20);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const top20 = rankTopMoneyOpportunities();
  const outPath = path.join(process.cwd(), "var/agents/top-money-opportunities.json");
  fs.writeFileSync(outPath, JSON.stringify(top20, null, 2));
  console.log("================================================================");
  console.log("      TOP 20 STATIC COMMERCIAL OPPORTUNITIES — CURRENT TRUTH    ");
  console.log("================================================================\n");
  console.log("NOTE: live first-party revenue priority is computed separately by the canonical Money Priority Engine.\n");
  top20.forEach((opportunity) => {
    console.log(`#${String(opportunity.rank).padStart(2)}. [${opportunity.name}] (Score: ${opportunity.moneyScore}) | Heuristic signal: ${opportunity.heuristicSignal} | Comps: ${opportunity.publishedComparisons} | Status: ${opportunity.programStatus}`);
    console.log(`     Network: ${opportunity.network} | Commission: ${opportunity.commission}`);
    console.log(`     Action:  ${opportunity.strategicAction}\n`);
  });
}
