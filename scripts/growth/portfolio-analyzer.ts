import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";
import { KNOWN_GSC_IMPRESSIONS } from "@/lib/growth-audit/comparison-graph";
import fs from "node:fs";
import path from "node:path";

export interface PortfolioGroup {
  name: string;
  network: string;
  commissionStructure: string;
  productsCovered: string[];
  productNames: string[];
  categoriesCovered: string[];
  totalGscImpressions: number;
  totalComparisonsCovered: number;
  /** Compatibility field: derived from CURRENT relationship state, never a guessed vendor acceptance probability. */
  approvalLikelihood: "HIGH" | "MEDIUM" | "LOW";
  ownerFriction: "LOW" | "MEDIUM" | "HIGH";
  strategicPriority: number;
  actionRequired: string;
  status: CanonicalLedgerStatus;
}

function compatibilityLikelihood(status: CanonicalLedgerStatus): PortfolioGroup["approvalLikelihood"] {
  if (["ACTIVE", "READY_AND_VERIFIED", "APPROVED_NEEDS_LINK", "APPROVED_NEEDS_EDITORIAL_CONTENT"].includes(status)) return "HIGH";
  if (["PENDING_REVIEW", "OWNER_ACTION_REQUIRED", "BLOCKED_FORM_DEFECT", "HOLD"].includes(status)) return "MEDIUM";
  return "LOW";
}

function ownerFriction(status: CanonicalLedgerStatus): PortfolioGroup["ownerFriction"] {
  if (["OWNER_ACTION_REQUIRED", "BLOCKED_FORM_DEFECT", "HOLD"].includes(status)) return "HIGH";
  if (["APPROVED_NEEDS_LINK", "APPROVED_NEEDS_EDITORIAL_CONTENT"].includes(status)) return "MEDIUM";
  return "LOW";
}

function actionForStatus(
  status: CanonicalLedgerStatus,
  ownerBlocker: string | null,
  formBlocker: string | null,
  notes: string,
): string {
  if (status === "PENDING_REVIEW") return "Wait for the vendor decision. Do not resubmit while the current application is pending.";
  if (["REJECTED", "NOT_ELIGIBLE", "PROGRAM_ENDED", "NO_REAL_PROGRAM_FOUND"].includes(status)) {
    return "No current acquisition action. Re-open only on genuinely new first-party evidence.";
  }
  if (status === "PROGRAM_NOT_VERIFIED") return "Research current first-party program availability before any owner action.";
  if (["OWNER_ACTION_REQUIRED", "BLOCKED_FORM_DEFECT", "HOLD"].includes(status)) {
    return ownerBlocker ?? formBlocker ?? notes;
  }
  if (["APPROVED_NEEDS_LINK", "APPROVED_NEEDS_EDITORIAL_CONTENT"].includes(status)) {
    return ownerBlocker ?? formBlocker ?? notes;
  }
  if (status === "ACTIVE" || status === "READY_AND_VERIFIED") return "No acquisition action; maintain the verified relationship and revenue path.";
  return notes;
}

function statusWeight(status: CanonicalLedgerStatus): number {
  switch (status) {
    case "ACTIVE":
    case "READY_AND_VERIFIED":
      return 80;
    case "APPROVED_NEEDS_LINK":
    case "APPROVED_NEEDS_EDITORIAL_CONTENT":
      return 70;
    case "PENDING_REVIEW":
      return 50;
    case "OWNER_ACTION_REQUIRED":
    case "BLOCKED_FORM_DEFECT":
    case "HOLD":
      return 30;
    case "PROGRAM_NOT_VERIFIED":
      return 10;
    case "REJECTED":
    case "NOT_ELIGIBLE":
    case "PROGRAM_ENDED":
    case "NO_REAL_PROGRAM_FOUND":
      return 0;
  }
}

export function analyzePortfolioPrograms(): PortfolioGroup[] {
  const software = getAllSoftware();
  const softwareMap = new Map(software.map(s => [s.slug, s]));

  const compCounts = new Map<string, number>();
  for (const s of software) compCounts.set(s.slug, 0);
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    compCounts.set(a, (compCounts.get(a) ?? 0) + 1);
    compCounts.set(b, (compCounts.get(b) ?? 0) + 1);
  }

  const currentPortfolios = CURRENT_AFFILIATE_LEDGER.filter(
    (relationship) => relationship.productSlugs.filter((slug) => softwareMap.has(slug)).length > 1,
  );

  const results: PortfolioGroup[] = currentPortfolios.map(relationship => {
    const productsCovered = relationship.productSlugs.filter((slug) => softwareMap.has(slug));
    let totalImp = 0;
    let totalComps = 0;
    const cats = new Set<string>();
    const names: string[] = [];

    for (const slug of productsCovered) {
      const s = softwareMap.get(slug);
      if (s) {
        names.push(s.name);
        cats.add(s.category);
      }
      totalImp += KNOWN_GSC_IMPRESSIONS[slug] ?? 0;
      totalComps += compCounts.get(slug) ?? 0;
    }

    // Status is the dominant signal. Coverage/demand are deliberately small
    // tie-breakers so a rejected or ended portfolio can never outrank a real
    // pending/approved relationship merely because its products have traffic.
    const priority = statusWeight(relationship.status) + Math.min(totalImp * 0.1, 10) + Math.min(totalComps * 0.2, 10);

    return {
      name: relationship.programName,
      network: relationship.network,
      commissionStructure: relationship.commissionModel,
      productsCovered,
      productNames: names,
      categoriesCovered: Array.from(cats),
      totalGscImpressions: totalImp,
      totalComparisonsCovered: totalComps,
      approvalLikelihood: compatibilityLikelihood(relationship.status),
      ownerFriction: ownerFriction(relationship.status),
      strategicPriority: Number(priority.toFixed(1)),
      actionRequired: actionForStatus(
        relationship.status,
        relationship.ownerBlocker,
        relationship.formBlocker,
        relationship.notes,
      ),
      status: relationship.status,
    };
  });

  results.sort((a, b) => b.strategicPriority - a.strategicPriority || a.name.localeCompare(b.name));
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const portfolios = analyzePortfolioPrograms();
  const outPath = path.join(process.cwd(), "var/agents/portfolio-programs.json");
  fs.writeFileSync(outPath, JSON.stringify(portfolios, null, 2));
  console.log("================================================================");
  console.log("       MILOOSH CURRENT PORTFOLIO AFFILIATE RELATIONSHIPS        ");
  console.log("================================================================\n");
  portfolios.forEach((p, idx) => {
    console.log(`#${idx + 1}. [${p.name}] [${p.status}] (Priority Score: ${p.strategicPriority})`);
    console.log(`    Network: ${p.network} | Commission: ${p.commissionStructure}`);
    console.log(`    Products: ${p.productNames.join(", ")} (${p.productsCovered.length} products)`);
    console.log(`    Categories: ${p.categoriesCovered.join(", ")}`);
    console.log(`    Coverage: ${p.totalComparisonsCovered} total comparisons | ${p.totalGscImpressions} GSC impressions`);
    console.log(`    Action: ${p.actionRequired}\n`);
  });
}
