import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship, CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";

export type AffiliatePipelineOperation = "submit" | "approve" | "reject" | "owner_action";

const ACTIVE_SLUGS = new Set(ACTIVE_PARTNERS.map((partner) => partner.slug as string));
const TERMINAL_STATUSES = new Set<CanonicalLedgerStatus>([
  "REJECTED",
  "NOT_ELIGIBLE",
  "NO_REAL_PROGRAM_FOUND",
  "PROGRAM_ENDED",
]);

function currentRelationship(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

export function affiliatePipelineOperationBlockReason(
  slug: string,
  operation: AffiliatePipelineOperation,
): string | null {
  if (ACTIVE_SLUGS.has(slug)) {
    return `${slug} is already an active affiliate in the canonical registry. Update canonical active-partner truth instead of the acquisition pipeline.`;
  }

  const relationship = currentRelationship(slug);
  if (!relationship) return null;

  if (TERMINAL_STATUSES.has(relationship.status)) {
    return `${relationship.programName} is ${relationship.status} in current affiliate truth. New contradictory first-party evidence must be reconciled in current truth before changing pipeline state.`;
  }

  if (operation === "submit" && relationship.status !== "READY_AND_VERIFIED") {
    return `${relationship.programName} is ${relationship.status} in current affiliate truth, so a fresh submission is not currently authorized. Reconcile the blocker/status first.`;
  }

  if (operation === "owner_action" && ["APPROVED_NEEDS_LINK", "APPROVED_NEEDS_EDITORIAL_CONTENT"].includes(relationship.status)) {
    return `${relationship.programName} is already approved. Record activation/link work in current affiliate truth rather than moving the acquisition pipeline backward.`;
  }

  return null;
}

export function assertAffiliatePipelineOperationAllowed(
  slug: string,
  operation: AffiliatePipelineOperation,
): void {
  const reason = affiliatePipelineOperationBlockReason(slug, operation);
  if (reason) throw new Error(reason);
}
