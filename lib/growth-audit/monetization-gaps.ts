import { getAllSoftware, type Software } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship } from "@/data/affiliate/canonical-ledger";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { getComparisonsInvolving } from "@/data/comparisons";
import type { MonetizationGapRow, MonetizationStatusGroup } from "./types";
import { HEURISTIC_TRAFFIC_SIGNAL } from "./comparison-graph";

function preferredRelationship(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

function groupFromRelationship(relationship: AffiliateProgramRelationship): MonetizationStatusGroup {
  switch (relationship.status) {
    case "PENDING_REVIEW":
      return "B";
    case "READY_AND_VERIFIED":
    case "APPROVED_NEEDS_LINK":
    case "APPROVED_NEEDS_EDITORIAL_CONTENT":
      return "C";
    case "OWNER_ACTION_REQUIRED":
    case "BLOCKED_FORM_DEFECT":
    case "HOLD":
      return "D";
    case "REJECTED":
    case "NOT_ELIGIBLE":
    case "NO_REAL_PROGRAM_FOUND":
    case "PROGRAM_ENDED":
      return "F";
    case "PROGRAM_NOT_VERIFIED":
      return "E";
    case "ACTIVE":
      // ACTIVE without a live active-partner URL is not treated as already
      // monetized. The canonical active registry is the only A-group proof.
      return "C";
  }
}

/**
 * Computes static monetization gaps from current repository evidence.
 *
 * The optional status sets are test/forensic overrides. Production callers
 * should omit them so status is derived from CURRENT_AFFILIATE_LEDGER instead
 * of a hard-coded list that can drift after a vendor decision.
 */
export function computeMonetizationGaps(
  software: Software[] = getAllSoftware(),
  pendingSlugs?: Set<string>,
  rejectedSlugs?: Set<string>,
  ownerBlockedSlugs?: Set<string>,
  heuristicSignalBySlug: Record<string, number> = HEURISTIC_TRAFFIC_SIGNAL
): MonetizationGapRow[] {
  const activeSlugs = new Set<string>(
    ACTIVE_PARTNERS.filter((partner) => partner.status === "active" && Boolean(partner.affiliateUrl)).map((partner) => partner.slug as string)
  );

  const publicProgramMap = new Map(AFFILIATE_PROGRAMS.map((program) => [program.slug, program]));
  const gaps: MonetizationGapRow[] = [];

  for (const softwareEntry of software) {
    const isActive = activeSlugs.has(softwareEntry.slug);
    const relationship = preferredRelationship(softwareEntry.slug);
    const publicProgram = publicProgramMap.get(softwareEntry.slug);

    let statusGroup: MonetizationStatusGroup = "E";
    let notes = "No current relationship or sufficiently verified public-program state.";

    if (isActive) {
      statusGroup = "A";
      notes = "Active monetized partner with a verified live affiliate URL.";
    } else if (pendingSlugs?.has(softwareEntry.slug)) {
      statusGroup = "B";
      notes = "Explicit caller override: pending review.";
    } else if (ownerBlockedSlugs?.has(softwareEntry.slug)) {
      statusGroup = "D";
      notes = "Explicit caller override: owner blocker.";
    } else if (rejectedSlugs?.has(softwareEntry.slug)) {
      statusGroup = "F";
      notes = "Explicit caller override: rejected/no viable route.";
    } else if (relationship) {
      statusGroup = groupFromRelationship(relationship);
      notes = relationship.notes || relationship.eligibility || `Current relationship status: ${relationship.status}.`;
    } else if (publicProgram) {
      if (publicProgram.programExists === "yes") {
        statusGroup = "C";
        notes = publicProgram.notes || "Current public affiliate program exists; no Miloosh relationship decision is recorded.";
      } else if (publicProgram.programExists === "no") {
        statusGroup = "F";
        notes = publicProgram.notes || "Vendor research records no current public affiliate program.";
      } else {
        statusGroup = "E";
        notes = publicProgram.notes || "Program existence remains uncertain.";
      }
    }

    const impressions = heuristicSignalBySlug[softwareEntry.slug] ?? 0;
    const comparisons = getComparisonsInvolving(softwareEntry.slug).length;

    let demandScore = 2;
    if (impressions >= 800) demandScore = 35;
    else if (impressions >= 300) demandScore = 28;
    else if (impressions >= 100) demandScore = 22;
    else if (impressions >= 50) demandScore = 16;
    else if (impressions >= 10) demandScore = 10;
    else if (impressions > 0) demandScore = 5;

    const highIntentCategories = ["crm", "customer-support", "marketing", "ecommerce", "accounting", "field-service-management", "security"];
    const mediumIntentCategories = ["project-management", "analytics", "automation", "scheduling", "cms", "api", "ai"];
    const intentScore = highIntentCategories.includes(softwareEntry.category) ? 25 : mediumIntentCategories.includes(softwareEntry.category) ? 18 : 10;

    let actionScore = 0;
    if (statusGroup === "B") actionScore = 25;
    else if (statusGroup === "C") actionScore = 20;
    else if (statusGroup === "D") actionScore = 15;
    else if (statusGroup === "E") actionScore = 8;
    // A is already monetized; F has no current action path. Neither receives
    // an artificial application-opportunity bonus.

    const compScore = Math.min(15, comparisons);
    const totalScore = demandScore + intentScore + actionScore + compScore;

    gaps.push({
      slug: softwareEntry.slug,
      name: softwareEntry.name,
      category: softwareEntry.category,
      statusGroup,
      impressions,
      comparisonsCount: comparisons,
      monetizationGapScore: totalScore,
      demandScore,
      intentScore,
      actionScore,
      compScore,
      notes,
    });
  }

  return gaps.sort(
    (a, b) => b.monetizationGapScore - a.monetizationGapScore || b.impressions - a.impressions || a.name.localeCompare(b.name)
  );
}
