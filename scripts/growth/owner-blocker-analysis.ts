import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship, CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";

const OWNER_BLOCKING_STATUSES = new Set<CanonicalLedgerStatus>([
  "OWNER_ACTION_REQUIRED",
  "BLOCKED_FORM_DEFECT",
  "APPROVED_NEEDS_LINK",
  "APPROVED_NEEDS_EDITORIAL_CONTENT",
  "HOLD",
]);

export type OwnerBlockerRow = {
  programId: string;
  programName: string;
  network: string;
  status: CanonicalLedgerStatus;
  products: string[];
  comparisonsAffected: number;
  blocker: string;
  applicationUrl: string | null;
};

function comparisonCountBySlug(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return counts;
}

function blockerText(relationship: AffiliateProgramRelationship): string {
  return relationship.ownerBlocker ?? relationship.formBlocker ?? relationship.notes ?? "Owner checkpoint required; exact blocker not recorded.";
}

/**
 * Current owner-only affiliate blockers, derived from the operational affiliate
 * truth instead of a hard-coded historical network list. This prevents closed
 * ShareASale routes, ended programs, rejected applications, or obsolete CJ /
 * PartnerStack assumptions from being resurrected as owner work.
 */
export function getCurrentOwnerBlockers(): OwnerBlockerRow[] {
  const compCounts = comparisonCountBySlug();

  return CURRENT_AFFILIATE_LEDGER
    .filter((relationship) => OWNER_BLOCKING_STATUSES.has(relationship.status))
    .filter((relationship) => relationship.productSlugs.length > 0)
    .map((relationship) => ({
      programId: relationship.programId,
      programName: relationship.programName,
      network: relationship.network,
      status: relationship.status,
      products: [...relationship.productSlugs],
      comparisonsAffected: relationship.productSlugs.reduce((sum, slug) => sum + (compCounts.get(slug) ?? 0), 0),
      blocker: blockerText(relationship),
      applicationUrl: relationship.applicationUrl,
    }))
    .sort((a, b) => b.comparisonsAffected - a.comparisonsAffected || a.programName.localeCompare(b.programName));
}

export function analyzeOwnerBlockers() {
  const rows = getCurrentOwnerBlockers();

  console.log("================================================================");
  console.log("          CURRENT OWNER BLOCKERS — AFFILIATE TRUTH ONLY         ");
  console.log("================================================================\n");

  if (rows.length === 0) {
    console.log("No current owner-only affiliate blockers are recorded.");
    return rows;
  }

  for (const row of rows) {
    console.log("----------------------------------------------------------------");
    console.log(`${row.programName} [${row.status}]`);
    console.log(`Network:               ${row.network}`);
    console.log(`Products Covered:      ${row.products.join(", ")}`);
    console.log(`Comparisons Affected:  ${row.comparisonsAffected}`);
    console.log(`Current Blocker:       ${row.blocker}`);
    console.log(`Application URL:       ${row.applicationUrl ?? "none / not applicable"}`);
  }

  console.log(`\n${rows.length} current owner-blocked relationship(s).`);
  console.log("Rejected, ended, not-eligible, no-program and pending-review relationships are intentionally excluded.\n");
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeOwnerBlockers();
}
