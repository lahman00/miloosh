import type { CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";
import { CURRENT_AFFILIATE_LEDGER as CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getAllSoftware } from "@/data/software";
import { verifyProjectIdentity, ProjectIdentityError } from "@/lib/project-guard";
import fs from "node:fs";
import path from "node:path";

export const ALL_CANONICAL_STATUSES: readonly CanonicalLedgerStatus[] = [
  "ACTIVE",
  "APPROVED_NEEDS_LINK",
  "APPROVED_NEEDS_EDITORIAL_CONTENT",
  "PENDING_REVIEW",
  "READY_AND_VERIFIED",
  "BLOCKED_FORM_DEFECT",
  "OWNER_ACTION_REQUIRED",
  "REJECTED",
  "HOLD",
  "NO_REAL_PROGRAM_FOUND",
  "PROGRAM_NOT_VERIFIED",
  "PROGRAM_ENDED",
  "NOT_ELIGIBLE"
] as const;

export interface LedgerSummaryReport {
  timestamp: string;
  totalProgramRelationships: number;
  statusBreakdown: Record<CanonicalLedgerStatus, number>;
  sumOfStatusBuckets: number;
  isStatusSumConsistent: boolean;
  totalCatalogProducts: number;
  catalogProductsWithProgramRelationship: number;
  catalogProductsWithoutProgramRelationship: number;
  activeCatalogProductsCovered: number;
  pendingCatalogProductsCovered: number;
  ownerBlockedCatalogProductsCovered: number;
  formBlockedCatalogProductsCovered: number;
  rejectedCatalogProductsCovered: number;
  holdCatalogProductsCovered: number;
  noProgramCatalogProductsCount: number;
  unverifiedCatalogProductsCount: number;
  sumOfCatalogCoverageBuckets: number;
  isCatalogCoverageExhaustive: boolean;
  noProgramSlugs: string[];
  unverifiedSlugs: string[];
}

export function computeLedgerSummary(): LedgerSummaryReport {
  const software = getAllSoftware();
  const catalogSlugs = new Set(software.map(s => s.slug));
  const ledger = CANONICAL_AFFILIATE_LEDGER;

  const statusBreakdown: Record<CanonicalLedgerStatus, number> = {
    ACTIVE: 0,
    APPROVED_NEEDS_LINK: 0,
    APPROVED_NEEDS_EDITORIAL_CONTENT: 0,
    PENDING_REVIEW: 0,
    READY_AND_VERIFIED: 0,
    BLOCKED_FORM_DEFECT: 0,
    OWNER_ACTION_REQUIRED: 0,
    REJECTED: 0,
    HOLD: 0,
    NO_REAL_PROGRAM_FOUND: 0,
    PROGRAM_NOT_VERIFIED: 0,
    PROGRAM_ENDED: 0,
    NOT_ELIGIBLE: 0
  };

  const coveredCatalogSlugs = new Set<string>();
  const activeSlugs = new Set<string>();
  const pendingSlugs = new Set<string>();
  const rejectedSlugs = new Set<string>();
  const formBlockedSlugs = new Set<string>();
  const ownerBlockedSlugs = new Set<string>();
  const holdSlugs = new Set<string>();
  const explicitNoProgramSlugs = new Set<string>();
  const explicitUnverifiedSlugs = new Set<string>();

  for (const prog of ledger) {
    statusBreakdown[prog.status] = (statusBreakdown[prog.status] ?? 0) + 1;

    for (const slug of prog.productSlugs) {
      if (!catalogSlugs.has(slug)) continue;
      coveredCatalogSlugs.add(slug);

      if (prog.status === "ACTIVE") activeSlugs.add(slug);
      else if (prog.status === "PENDING_REVIEW") pendingSlugs.add(slug);
      else if (prog.status === "REJECTED" || prog.status === "NOT_ELIGIBLE") rejectedSlugs.add(slug);
      else if (prog.status === "BLOCKED_FORM_DEFECT") formBlockedSlugs.add(slug);
      else if (prog.status === "OWNER_ACTION_REQUIRED") ownerBlockedSlugs.add(slug);
      else if (prog.status === "HOLD") holdSlugs.add(slug);

      if (prog.status === "NO_REAL_PROGRAM_FOUND" || prog.status === "PROGRAM_ENDED") explicitNoProgramSlugs.add(slug);
      if (prog.status === "PROGRAM_NOT_VERIFIED") explicitUnverifiedSlugs.add(slug);
    }
  }

  const sumOfStatusBuckets = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
  const isStatusSumConsistent = sumOfStatusBuckets === ledger.length;

  // Absence of a relationship is UNKNOWN, never evidence that a vendor has no
  // program. The old implementation maintained a large hand-written
  // "noProgram" list and therefore converted stale research into false
  // certainty. Current truth is deliberately conservative.
  const noRelationshipSlugs = software
    .map((entry) => entry.slug)
    .filter((slug) => !coveredCatalogSlugs.has(slug));

  const unverifiedSlugs = Array.from(new Set([...explicitUnverifiedSlugs, ...noRelationshipSlugs])).sort();
  const noProgramSlugs = [...explicitNoProgramSlugs].sort();

  const catalogProductsWithProgramRelationship = coveredCatalogSlugs.size;
  const catalogProductsWithoutProgramRelationship = noRelationshipSlugs.length;
  const sumOfCatalogCoverageBuckets = catalogProductsWithProgramRelationship + catalogProductsWithoutProgramRelationship;
  const isCatalogCoverageExhaustive = sumOfCatalogCoverageBuckets === software.length;

  return {
    timestamp: new Date().toISOString(),
    totalProgramRelationships: ledger.length,
    statusBreakdown,
    sumOfStatusBuckets,
    isStatusSumConsistent,
    totalCatalogProducts: software.length,
    catalogProductsWithProgramRelationship,
    catalogProductsWithoutProgramRelationship,
    activeCatalogProductsCovered: activeSlugs.size,
    pendingCatalogProductsCovered: pendingSlugs.size,
    ownerBlockedCatalogProductsCovered: ownerBlockedSlugs.size,
    formBlockedCatalogProductsCovered: formBlockedSlugs.size,
    rejectedCatalogProductsCovered: rejectedSlugs.size,
    holdCatalogProductsCovered: holdSlugs.size,
    noProgramCatalogProductsCount: noProgramSlugs.length,
    unverifiedCatalogProductsCount: unverifiedSlugs.length,
    sumOfCatalogCoverageBuckets,
    isCatalogCoverageExhaustive,
    noProgramSlugs,
    unverifiedSlugs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    verifyProjectIdentity();
  } catch (err) {
    console.error(err instanceof ProjectIdentityError ? err.message : err);
    process.exit(1);
  }
  const summary = computeLedgerSummary();
  const outPath = path.join(process.cwd(), "var/agents/canonical-affiliate-ledger-summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log("================================================================");
  console.log("          MILOOSH CURRENT AFFILIATE LEDGER SUMMARY              ");
  console.log("================================================================\n");

  console.log("SECTION A — PROGRAM RELATIONSHIPS:");
  console.log(`  Program Relationships Total:                ${summary.totalProgramRelationships}`);
  ALL_CANONICAL_STATUSES.forEach(status => {
    const count = summary.statusBreakdown[status] ?? 0;
    console.log(`    - ${status.padEnd(35)}: ${count}`);
  });
  console.log(`  Sum of Program Status Buckets:              ${summary.sumOfStatusBuckets} (Match: ${summary.isStatusSumConsistent})\n`);

  console.log("SECTION B — CATALOG PRODUCT COVERAGE:");
  console.log(`  Catalog Products Total:                     ${summary.totalCatalogProducts}`);
  console.log(`  Products Covered by >=1 Relationship:       ${summary.catalogProductsWithProgramRelationship}`);
  console.log(`  Products Without Relationship Evidence:     ${summary.catalogProductsWithoutProgramRelationship}`);
  console.log(`    - Active Monetization:                    ${summary.activeCatalogProductsCovered}`);
  console.log(`    - Pending Programs:                       ${summary.pendingCatalogProductsCovered}`);
  console.log(`    - Owner-Blocked Programs:                 ${summary.ownerBlockedCatalogProductsCovered}`);
  console.log(`    - Form-Blocked Programs:                  ${summary.formBlockedCatalogProductsCovered}`);
  console.log(`    - Rejected / Not Eligible:                ${summary.rejectedCatalogProductsCovered}`);
  console.log(`    - Hold Programs:                          ${summary.holdCatalogProductsCovered}`);
  console.log(`  Explicit NO_REAL_PROGRAM / ENDED Products:  ${summary.noProgramCatalogProductsCount}`);
  console.log(`  Unverified / No Relationship Evidence:      ${summary.unverifiedCatalogProductsCount}`);
  console.log(`  Relationship + No-Relationship Coverage:    ${summary.sumOfCatalogCoverageBuckets} (Match: ${summary.isCatalogCoverageExhaustive})\n`);
  console.log("================================================================");
}
