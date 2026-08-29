import { getAllSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship, CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { HEURISTIC_TRAFFIC_SIGNAL } from "@/lib/growth-audit/comparison-graph";
import fs from "node:fs";
import path from "node:path";

export type AffiliateClassification =
  | "ACTIVE_AFFILIATE"
  | "APPROVED_NOT_ACTIVATED"
  | "APPLICATION_PENDING"
  | "ELIGIBLE_READY_TO_APPLY"
  | "OWNER_ACTION_REQUIRED"
  | "REJECTED"
  | "NO_REAL_PROGRAM_FOUND"
  | "EDITORIALLY_UNSUITABLE"
  | "NEEDS_MORE_RESEARCH";

export interface ProductAffiliateAudit {
  slug: string;
  name: string;
  category: string;
  gscImpressions: number;
  classification: AffiliateClassification;
  programName: string | null;
  network: string | null;
  commissionStructure: string | null;
  programUrl: string | null;
  applicationUrl: string | null;
  affiliateUrl: string | null;
  notes: string;
  ownerBlockerReason: string | null;
  portfolioGroup: string | null;
}

function relationshipForProduct(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;

  // Prefer the most product-specific relationship over broad historical
  // portfolios; within equal specificity, the newest status wins.
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

function classificationForStatus(status: CanonicalLedgerStatus): AffiliateClassification {
  switch (status) {
    case "ACTIVE":
      return "ACTIVE_AFFILIATE";
    case "READY_AND_VERIFIED":
    case "APPROVED_NEEDS_LINK":
    case "APPROVED_NEEDS_EDITORIAL_CONTENT":
      return "APPROVED_NOT_ACTIVATED";
    case "PENDING_REVIEW":
      return "APPLICATION_PENDING";
    case "OWNER_ACTION_REQUIRED":
    case "BLOCKED_FORM_DEFECT":
    case "HOLD":
      return "OWNER_ACTION_REQUIRED";
    case "REJECTED":
    case "NOT_ELIGIBLE":
      return "REJECTED";
    case "NO_REAL_PROGRAM_FOUND":
    case "PROGRAM_ENDED":
      return "NO_REAL_PROGRAM_FOUND";
    case "PROGRAM_NOT_VERIFIED":
      return "NEEDS_MORE_RESEARCH";
  }
}

export function runFullAffiliateSweep(): {
  totalAudited: number;
  classificationCounts: Record<AffiliateClassification, number>;
  activePartners: ProductAffiliateAudit[];
  eligibleToApply: ProductAffiliateAudit[];
  pendingOrApproved: ProductAffiliateAudit[];
  ownerActionRequired: ProductAffiliateAudit[];
  noProgramOrRejected: ProductAffiliateAudit[];
  allProducts: ProductAffiliateAudit[];
} {
  const software = getAllSoftware();
  const activeMap = new Map<string, (typeof ACTIVE_PARTNERS)[number]>(ACTIVE_PARTNERS.map((partner) => [partner.slug as string, partner]));
  const publicProgramMap = new Map(AFFILIATE_PROGRAMS.map((program) => [program.slug, program]));

  const results: ProductAffiliateAudit[] = [];
  const counts: Record<AffiliateClassification, number> = {
    ACTIVE_AFFILIATE: 0,
    APPROVED_NOT_ACTIVATED: 0,
    APPLICATION_PENDING: 0,
    ELIGIBLE_READY_TO_APPLY: 0,
    OWNER_ACTION_REQUIRED: 0,
    REJECTED: 0,
    NO_REAL_PROGRAM_FOUND: 0,
    EDITORIALLY_UNSUITABLE: 0,
    NEEDS_MORE_RESEARCH: 0,
  };

  for (const softwareEntry of software) {
    const active = activeMap.get(softwareEntry.slug);
    const relationship = relationshipForProduct(softwareEntry.slug);
    const publicProgram = publicProgramMap.get(softwareEntry.slug);
    const gscImpressions = HEURISTIC_TRAFFIC_SIGNAL[softwareEntry.slug] ?? 0;

    let classification: AffiliateClassification = "NEEDS_MORE_RESEARCH";
    let notes = relationship?.notes ?? publicProgram?.notes ?? "No current relationship or sufficiently verified public program record.";
    let ownerBlockerReason: string | null = relationship?.ownerBlocker ?? relationship?.formBlocker ?? null;

    // The verified live registry is the strongest operational proof and wins
    // even if an older historical relationship record contains a stale state.
    if (active?.affiliateUrl) {
      classification = "ACTIVE_AFFILIATE";
      notes = "Verified live active partner in the canonical active-partner registry.";
      ownerBlockerReason = null;
    } else if (relationship) {
      classification = classificationForStatus(relationship.status);
    } else if (publicProgram) {
      // Public research is discovery evidence only. It must never override an
      // existing relationship decision because it describes the vendor's public
      // program, not Miloosh's account-level approval/rejection state.
      if (publicProgram.programExists === "yes") {
        classification = "ELIGIBLE_READY_TO_APPLY";
      } else if (publicProgram.programExists === "no") {
        classification = "NO_REAL_PROGRAM_FOUND";
      } else {
        classification = "NEEDS_MORE_RESEARCH";
      }
    } else if (["git", "postgresql", "mysql", "redis", "nginx", "docker", "kubernetes", "linux"].includes(softwareEntry.slug)) {
      classification = "NO_REAL_PROGRAM_FOUND";
      notes = "Free/open-source project with no commercial publisher relationship recorded.";
    } else if (["signal", "telegram", "tor"].includes(softwareEntry.slug)) {
      classification = "EDITORIALLY_UNSUITABLE";
      notes = "Non-profit/security utility without a commercial affiliate relationship recorded.";
    }

    counts[classification] += 1;

    const programName = relationship?.programName ?? (publicProgram ? `${softwareEntry.name} public affiliate program` : null);
    const network = relationship?.network ?? publicProgram?.networkName ?? null;
    const commissionStructure = relationship?.commissionModel ?? publicProgram?.commissionModel ?? null;
    const programUrl = publicProgram?.sourceUrls?.[0] ?? relationship?.applicationUrl ?? null;
    const applicationUrl = relationship?.applicationUrl ?? publicProgram?.applicationUrl ?? null;
    const affiliateUrl = active?.affiliateUrl ?? relationship?.affiliateUrl ?? null;
    const portfolioGroup = relationship && relationship.productSlugs.length > 1 ? relationship.programName : null;

    results.push({
      slug: softwareEntry.slug,
      name: softwareEntry.name,
      category: softwareEntry.category,
      gscImpressions,
      classification,
      programName,
      network,
      commissionStructure,
      programUrl,
      applicationUrl,
      affiliateUrl,
      notes,
      ownerBlockerReason,
      portfolioGroup,
    });
  }

  results.sort((a, b) => b.gscImpressions - a.gscImpressions || a.slug.localeCompare(b.slug));

  return {
    totalAudited: software.length,
    classificationCounts: counts,
    activePartners: results.filter((row) => row.classification === "ACTIVE_AFFILIATE"),
    eligibleToApply: results.filter((row) => row.classification === "ELIGIBLE_READY_TO_APPLY"),
    pendingOrApproved: results.filter((row) => row.classification === "APPLICATION_PENDING" || row.classification === "APPROVED_NOT_ACTIVATED"),
    ownerActionRequired: results.filter((row) => row.classification === "OWNER_ACTION_REQUIRED"),
    noProgramOrRejected: results.filter((row) => row.classification === "NO_REAL_PROGRAM_FOUND" || row.classification === "REJECTED"),
    allProducts: results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runFullAffiliateSweep();
  const outPath = path.join(process.cwd(), "var/agents/full-affiliate-sweep.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log("================================================================");
  console.log("        MILOOSH FULL CATALOG AFFILIATE SWEEP — CURRENT TRUTH    ");
  console.log("================================================================\n");
  console.log(`✓ Audited all ${result.totalAudited} catalog products.\n`);
  console.log("CLASSIFICATION BREAKDOWN:");
  Object.entries(result.classificationCounts).forEach(([status, count]) => {
    console.log(`   - ${status.padEnd(25)}: ${count}`);
  });
  console.log("\nTOP 10 HIGH-TRAFFIC ELIGIBLE_READY_TO_APPLY CANDIDATES:");
  result.eligibleToApply.slice(0, 10).forEach((candidate) => {
    console.log(`   - [${candidate.slug}] (heuristic signal: ${candidate.gscImpressions}, NOT verified GSC) | Network: ${candidate.network ?? "Direct/unknown"} | Commission: ${candidate.commissionStructure ?? "UNKNOWN"}`);
  });
}
