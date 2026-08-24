import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { ROLE_GUIDES } from "@/data/guides/registry";

export interface PendingProgramReadiness {
  programId: string;
  coveredProducts: string[];
  publishedComparisonsCount: number;
  roleGuidesCount: number;
  postApprovalNewMonetizedComparisons: number;
  status: string;
  editorialIntegrityStatus: string;
}

export const PENDING_PROGRAMS = [
  { programId: "freshworks", products: ["freshdesk", "freshsales"] },
  { programId: "freshbooks", products: ["freshbooks"] },
  { programId: "close", products: ["close"] },
  { programId: "clickup", products: ["clickup"] },
  { programId: "amplitude", products: ["amplitude"] },
  { programId: "toggl-track", products: ["toggl-track"] },
  { programId: "callrail", products: ["callrail"] }
];

export function auditPendingPrograms(): PendingProgramReadiness[] {
  const publishedPairs = PUBLISHED_COMPARISONS;

  return PENDING_PROGRAMS.map(prog => {
    let comparisonCount = 0;
    const guidesSet = new Set<string>();

    for (const prod of prog.products) {
      // Count comparisons involving product
      for (const [a, b] of publishedPairs) {
        if (a === prod || b === prod) {
          comparisonCount++;
        }
      }

      // Count role guides
      for (const guide of ROLE_GUIDES) {
        if (guide.products && guide.products.some(p => p.slug === prod)) {
          guidesSet.add(guide.slug);
        }
      }
    }

    // Verify software data exists and is valid
    const allValid = prog.products.every(p => {
      const sw = getSoftware(p);
      return sw && sw.features.length >= 3 && sw.pricing;
    });

    return {
      programId: prog.programId,
      coveredProducts: prog.products,
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
