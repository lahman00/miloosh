import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { ROLE_GUIDES } from "@/data/guides/registry";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";

export interface PendingProgramReadiness {
  programId: string;
  coveredProducts: string[];
  publishedComparisonsCount: number;
  roleGuidesCount: number;
  postApprovalNewMonetizedComparisons: number;
  status: string;
  editorialIntegrityStatus: string;
}

/**
 * Programs with current first-party evidence supporting PENDING_REVIEW.
 * Derived from the operational affiliate truth so a vendor decision cannot
 * leave a stale hard-coded pending row behind after the ledger is updated.
 */
export const PENDING_PROGRAMS = CURRENT_AFFILIATE_LEDGER
  .filter((relationship) => relationship.status === "PENDING_REVIEW")
  .map((relationship) => ({
    programId: relationship.programId,
    products: [...relationship.productSlugs],
  }));

export function auditPendingPrograms(): PendingProgramReadiness[] {
  const publishedPairs = PUBLISHED_COMPARISONS;

  return PENDING_PROGRAMS.map(prog => {
    let comparisonCount = 0;
    const guidesSet = new Set<string>();

    for (const prod of prog.products) {
      for (const [a, b] of publishedPairs) {
        if (a === prod || b === prod) {
          comparisonCount++;
        }
      }

      for (const guide of ROLE_GUIDES) {
        if (guide.products && guide.products.some(p => p.slug === prod)) {
          guidesSet.add(guide.slug);
        }
      }
    }

    const allValid = prog.products.every(p => {
      const sw = getSoftware(p);
      return sw && sw.features.length >= 3 && sw.pricing;
    });

    return {
      programId: prog.programId,
      coveredProducts: [...prog.products],
      publishedComparisonsCount: comparisonCount,
      roleGuidesCount: guidesSet.size,
      postApprovalNewMonetizedComparisons: comparisonCount,
      status: "PENDING_REVIEW",
      editorialIntegrityStatus: allValid ? "READY_FOR_INSTANT_ACTIVATION" : "NEEDS_DATA_ENRICHMENT"
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const readiness = auditPendingPrograms();
  console.log("================================================================");
  console.log("          MILOOSH PENDING PROGRAM READINESS AUDIT               ");
  console.log("================================================================\n");

  let totalNewComparisons = 0;
  readiness.forEach((r, idx) => {
    totalNewComparisons += r.postApprovalNewMonetizedComparisons;
    console.log(`${(idx + 1).toString().padStart(2, " ")}. [${r.programId.padEnd(12, " ")}] Products: ${r.coveredProducts.join(", ")}`);
    console.log(`    - Software Pages Ready:     ${r.coveredProducts.length} (/software/${r.coveredProducts.join(", /software/")})`);
    console.log(`    - Comparison Surfaces:      ${r.publishedComparisonsCount}`);
    console.log(`    - Role Guides Included:     ${r.roleGuidesCount}`);
    console.log(`    - Editorial Readiness:      ✓ ${r.editorialIntegrityStatus}\n`);
  });

  console.log(`Total New Monetized Comparison Surfaces Upon Approval: +${totalNewComparisons}`);
  console.log("================================================================\n");
}
