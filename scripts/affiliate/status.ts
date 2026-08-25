import "./_load-env";
import { setPipelineStatus, getPipelineEntry, type AffiliatePipelineStatus } from "@/lib/revenue/affiliate-pipeline";
import { getSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship } from "@/data/affiliate/canonical-ledger";

const VALID_STATUSES: AffiliatePipelineStatus[] = [
  "unresearched", "program_found", "verified", "ready_to_apply", "application_in_progress",
  "submitted", "pending_review", "approved", "rejected", "affiliate_link_received", "activated",
  "earning", "no_program", "program_closed", "needs_owner_action", "needs_more_research",
  "waiting_on_network",
];

const FORWARD_PROGRESS_STATUSES = new Set<AffiliatePipelineStatus>([
  "ready_to_apply",
  "application_in_progress",
  "submitted",
  "pending_review",
  "approved",
  "affiliate_link_received",
  "activated",
  "earning",
]);
const ACTIVE_COMPATIBLE_STATUSES = new Set<AffiliatePipelineStatus>([
  "approved",
  "affiliate_link_received",
  "activated",
  "earning",
]);
const TERMINAL_NEGATIVE_CURRENT = new Set(["REJECTED", "NOT_ELIGIBLE", "NO_REAL_PROGRAM_FOUND", "PROGRAM_ENDED"]);

function parseFlag(args: string[], name: string): string | undefined {
  const arg = args.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : undefined;
}

function relationshipForProduct(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

function contradictionReason(slug: string, requested: AffiliatePipelineStatus): string | null {
  const active = ACTIVE_PARTNERS.find((partner) => partner.slug === slug);
  if (active && !ACTIVE_COMPATIBLE_STATUSES.has(requested)) {
    return `Refusing pipeline status "${requested}": ${slug} is verified ACTIVE in the canonical registry. Use approved/affiliate_link_received/activated/earning to reconcile pipeline history; do not downgrade live truth.`;
  }

  const relationship = relationshipForProduct(slug);
  if (relationship && TERMINAL_NEGATIVE_CURRENT.has(relationship.status) && FORWARD_PROGRESS_STATUSES.has(requested)) {
    return `Refusing pipeline status "${requested}": current relationship is ${relationship.status}. Record genuinely new first-party evidence in current affiliate truth before reopening application progress.`;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const [slug, status] = positional;

  if (!slug) {
    console.log("Usage: npm run affiliate:status -- <slug> [<status>] [--note=\"...\"] [--affiliateUrl=...] [--trackingId=...] [--ownerActionRequired=\"...\"]");
    console.log(`Valid pipeline statuses: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }

  if (!getSoftware(slug)) {
    console.log(`Unknown slug: ${slug}`);
    process.exit(1);
  }

  const active = ACTIVE_PARTNERS.find((partner) => partner.slug === slug);
  const relationship = relationshipForProduct(slug);

  if (!status) {
    const entry = await getPipelineEntry(slug);
    console.log(`${slug}:`);
    console.log(`  operational: ${active ? "ACTIVE_REGISTRY" : relationship?.status ?? "NO_RELATIONSHIP"}`);
    if (active?.affiliateUrl) console.log(`  canonical affiliateUrl: ${active.affiliateUrl}`);
    if (relationship) console.log(`  relationship: ${relationship.programName} [${relationship.status}] via ${relationship.network}`);
    console.log(`  pipeline: ${entry?.status ?? "unresearched (no pipeline entry yet)"}`);
    if (!entry) return;
    if (entry.notes) console.log(`  pipeline notes: ${entry.notes}`);
    if (entry.affiliateUrl) console.log(`  pipeline affiliateUrl: ${entry.affiliateUrl}`);
    console.log("  pipeline history:");
    for (const history of entry.history) console.log(`    ${history.at}  ${history.status}${history.note ? `  (${history.note})` : ""}`);
    return;
  }

  if (!VALID_STATUSES.includes(status as AffiliatePipelineStatus)) {
    console.log(`Invalid status "${status}". Valid: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }

  const requested = status as AffiliatePipelineStatus;
  const contradiction = contradictionReason(slug, requested);
  if (contradiction) {
    console.log(contradiction);
    process.exit(1);
  }

  try {
    const updated = await setPipelineStatus(slug, requested, {
      note: parseFlag(args, "note"),
      affiliateUrl: parseFlag(args, "affiliateUrl"),
      trackingId: parseFlag(args, "trackingId"),
      ownerActionRequired: parseFlag(args, "ownerActionRequired"),
    });
    console.log(`${slug} pipeline -> ${updated.status}`);
    console.log(`Operational truth remains: ${active ? "ACTIVE_REGISTRY" : relationship?.status ?? "NO_RELATIONSHIP"}`);
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
