import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { runFullAffiliateSweep, type AffiliateClassification } from "./full-affiliate-sweep";
import fs from "node:fs";
import path from "node:path";

export type CanonicalAffiliateStatus =
  | "ACTIVE"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "READY_AND_VERIFIED"
  | "BLOCKED_FORM_DEFECT"
  | "OWNER_ACTION_REQUIRED"
  | "NO_REAL_PROGRAM_FOUND"
  | "EDITORIALLY_UNSUITABLE"
  | "UNVERIFIED_PROGRAM";

export interface CanonicalAffiliateRecord {
  slug: string;
  name: string;
  category: string;
  gscImpressions: number;
  status: CanonicalAffiliateStatus;
  network: string;
  commission: string;
  applicationUrl: string | null;
  affiliateUrl: string | null;
  evidenceSource: string;
  evidenceTimestamp: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  ownerBlocker: string | null;
  nextAction: string;
}

function statusFromSweep(classification: AffiliateClassification): CanonicalAffiliateStatus {
  switch (classification) {
    case "ACTIVE_AFFILIATE":
      return "ACTIVE";
    case "APPLICATION_PENDING":
      return "PENDING_REVIEW";
    case "REJECTED":
      return "REJECTED";
    case "APPROVED_NOT_ACTIVATED":
    case "ELIGIBLE_READY_TO_APPLY":
      return "READY_AND_VERIFIED";
    case "OWNER_ACTION_REQUIRED":
      return "OWNER_ACTION_REQUIRED";
    case "NO_REAL_PROGRAM_FOUND":
      return "NO_REAL_PROGRAM_FOUND";
    case "EDITORIALLY_UNSUITABLE":
      return "EDITORIALLY_UNSUITABLE";
    case "NEEDS_MORE_RESEARCH":
      return "UNVERIFIED_PROGRAM";
  }
}

function currentRelationshipForProduct(slug: string) {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0] ?? null;
}

function nextActionFor(
  classification: AffiliateClassification,
  ownerBlocker: string | null,
  applicationUrl: string | null,
): string {
  switch (classification) {
    case "ACTIVE_AFFILIATE":
      return "Live. Measure qualified outbound clicks, network conversions, commissions and payout state separately.";
    case "APPROVED_NOT_ACTIVATED":
      return "Approval exists but activation is incomplete. Finish only the evidenced activation requirement before publishing affiliate CTAs.";
    case "APPLICATION_PENDING":
      return "Wait for first-party vendor/network decision. Do not reapply or invent an outcome.";
    case "ELIGIBLE_READY_TO_APPLY":
      return applicationUrl
        ? `Current public publisher route is evidenced at ${applicationUrl}. Apply only when commercial demand justifies the owner/network cost.`
        : "A current public program is evidenced, but the application route is incomplete. Verify the real route before owner action.";
    case "OWNER_ACTION_REQUIRED":
      return ownerBlocker ? `Owner checkpoint: ${ownerBlocker}` : "Owner-only checkpoint is recorded; verify the exact current blocker before acting.";
    case "REJECTED":
      return "Do not reapply without material new evidence or a materially changed publisher profile.";
    case "NO_REAL_PROGRAM_FOUND":
      return "No current monetization relationship to pursue. Re-open only if new vendor evidence appears.";
    case "EDITORIALLY_UNSUITABLE":
      return "Do not force affiliate monetization onto an unsuitable editorial surface.";
    case "NEEDS_MORE_RESEARCH":
      return "Verify the vendor's current publisher program directly before any application or monetization claim.";
  }
}

/**
 * Compatibility projection for older reporting code. It is intentionally NOT
 * an independent source of truth. All relationship status comes from the
 * current-truth-driven full sweep; this file contains no hard-coded active,
 * pending, rejected, blocked or no-program product lists.
 */
export function buildCanonicalAffiliateState(): {
  totalAudited: number;
  statusCounts: Record<CanonicalAffiliateStatus, number>;
  records: CanonicalAffiliateRecord[];
} {
  const sweep = runFullAffiliateSweep();
  const publicProgramMap = new Map(AFFILIATE_PROGRAMS.map((program) => [program.slug, program]));

  const counts: Record<CanonicalAffiliateStatus, number> = {
    ACTIVE: 0,
    PENDING_REVIEW: 0,
    REJECTED: 0,
    READY_AND_VERIFIED: 0,
    BLOCKED_FORM_DEFECT: 0,
    OWNER_ACTION_REQUIRED: 0,
    NO_REAL_PROGRAM_FOUND: 0,
    EDITORIALLY_UNSUITABLE: 0,
    UNVERIFIED_PROGRAM: 0,
  };

  const records = sweep.allProducts.map((product): CanonicalAffiliateRecord => {
    const status = statusFromSweep(product.classification);
    const relationship = currentRelationshipForProduct(product.slug);
    const publicProgram = publicProgramMap.get(product.slug);
    counts[status] += 1;

    let evidenceSource = "Catalog discovery queue";
    let evidenceTimestamp = "UNKNOWN";
    let confidence: CanonicalAffiliateRecord["confidence"] = "LOW";

    if (product.classification === "ACTIVE_AFFILIATE") {
      evidenceSource = "data/affiliate/active-partners.ts plus current relationship evidence";
      evidenceTimestamp = relationship?.statusUpdatedAt ?? publicProgram?.lastVerifiedAt ?? "UNKNOWN";
      confidence = "HIGH";
    } else if (relationship) {
      evidenceSource = `data/affiliate/current-affiliate-truth.ts (${relationship.programId})`;
      evidenceTimestamp = relationship.statusUpdatedAt;
      confidence = "HIGH";
    } else if (publicProgram) {
      evidenceSource = "data/revenue/affiliate-programs.ts public-program research";
      evidenceTimestamp = publicProgram.lastVerifiedAt;
      confidence = publicProgram.confidence === "high" ? "HIGH" : publicProgram.confidence === "medium" ? "MEDIUM" : "LOW";
    }

    return {
      slug: product.slug,
      name: product.name,
      category: product.category,
      gscImpressions: product.gscImpressions,
      status,
      network: product.network ?? "UNKNOWN",
      commission: product.commissionStructure ?? "UNKNOWN",
      applicationUrl: product.applicationUrl,
      affiliateUrl: product.affiliateUrl,
      evidenceSource,
      evidenceTimestamp,
      confidence,
      ownerBlocker: product.ownerBlockerReason,
      nextAction: nextActionFor(product.classification, product.ownerBlockerReason, product.applicationUrl),
    };
  });

  records.sort((a, b) => b.gscImpressions - a.gscImpressions || a.slug.localeCompare(b.slug));

  return {
    totalAudited: sweep.totalAudited,
    statusCounts: counts,
    records,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = buildCanonicalAffiliateState();
  const outPath = path.join(process.cwd(), "var/agents/canonical-affiliate-reconciliation.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log("================================================================");
  console.log("     MILOOSH AFFILIATE RECONCILIATION — CURRENT TRUTH PROJECTION");
  console.log("================================================================\n");
  console.log(`✓ Reconciled ${result.totalAudited} catalog software products without hard-coded relationship lists.\n`);
  console.log("STATUS BREAKDOWN:");
  Object.entries(result.statusCounts).forEach(([status, count]) => {
    console.log(`   - ${status.padEnd(25)}: ${count}`);
  });
}
