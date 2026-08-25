import type { Software } from "@/data/software";
import { getAllSoftware } from "@/data/software";
import { AFFILIATE_PROGRAMS, type AffiliateProgramInfo } from "@/data/revenue/affiliate-programs";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship, CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { readFirstClickCandidates } from "@/lib/agents/first-click-experiment";
import { readFirstClickStrikeCandidates } from "@/lib/agents/first-click-strike";
import {
  getPipelineEntry,
  readAffiliatePipeline,
  buildPipelineMap,
  type AffiliatePipelineEntry,
  type AffiliatePipelineStatus,
} from "@/lib/revenue/affiliate-pipeline";
import { getRevenueScore } from "@/lib/revenue/scoring";

/**
 * Affiliate acquisition prioritization.
 *
 * Public program research answers "does the vendor appear to run a program?"
 * It does NOT answer "should Miloosh apply now?". Operational account truth
 * (ACTIVE_PARTNERS + CURRENT_AFFILIATE_LEDGER) and real pipeline progress gate
 * application readiness before public-program economics are scored.
 */

export type AffiliateOperationalStatus = CanonicalLedgerStatus | "ACTIVE_REGISTRY" | "NO_RELATIONSHIP";

export type AffiliatePriorityBreakdown = {
  slug: string;
  name: string;
  programExists: AffiliateProgramInfo["programExists"] | "no_entry";
  pipelineStatus: AffiliatePipelineStatus;
  operationalStatus: AffiliateOperationalStatus;
  affiliateAvailabilityScore: number;
  categoryValueScore: number;
  commercialIntentScore: number;
  buyingIntentScore: number;
  /** 0-10. Real GSC impressions from recorded first-click cohorts. 0 means no measured cohort data, never proven zero traffic. */
  trafficOpportunityScore: number;
  trafficDataSource: "real-gsc-cohort" | "none";
  /** Infrastructure/friction proxy, not an approval probability. */
  approvalFrictionScore: number;
  recurringBonus: number;
  totalScore: number;
  /** True only when no current account/pipeline state says this application is already active, pending, rejected, blocked, closed, or otherwise not a fresh application candidate. */
  readyToApply: boolean;
  blockReason: string | null;
  affiliateUrl: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  rejectedAt: string | null;
  pipelineNotes: string | null;
  ownerActionRequired: string | null;
};

export const KNOWN_APPLICATION_BLOCKERS: Record<string, string> = {
  notion: "Official page currently shows 'Program is currently not accepting new affiliates' (re-checked 2026-08-14).",
  asana: "Application requires being an existing paying Asana customer and runs through a Salesforce sales portal — not a fit for Miloosh's comparison-publisher model.",
  canva: "Official Help Center pages return 403 on every direct fetch attempt; network and current open/closed status could not be independently confirmed.",
  "fathom-analytics": "Program is restricted to existing Fathom Analytics customers with an active paid subscription (confirmed directly on Fathom's own docs, 2026-08-14) — applying would require a real spend decision first.",
};

const WEIGHTS = {
  affiliateAvailability: 3.5,
  categoryValue: 1.5,
  commercialIntent: 2,
  buyingIntent: 1.5,
  trafficOpportunity: 3,
  approvalFriction: 1.5,
};
const RECURRING_BONUS = 5;
const MAX_RAW =
  10 * (WEIGHTS.affiliateAvailability + WEIGHTS.categoryValue + WEIGHTS.commercialIntent + WEIGHTS.buyingIntent + WEIGHTS.trafficOpportunity + WEIGHTS.approvalFriction) +
  RECURRING_BONUS;

const ACTIVE_SLUGS = new Set(ACTIVE_PARTNERS.map((partner) => partner.slug as string));
const PIPELINE_APPLICATION_BLOCKERS = new Set<AffiliatePipelineStatus>([
  "application_in_progress",
  "submitted",
  "pending_review",
  "approved",
  "rejected",
  "affiliate_link_received",
  "activated",
  "earning",
  "no_program",
  "program_closed",
  "needs_owner_action",
  "needs_more_research",
  "waiting_on_network",
]);

function relationshipForProduct(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

function operationalStatus(slug: string, relationship: AffiliateProgramRelationship | null): AffiliateOperationalStatus {
  if (ACTIVE_SLUGS.has(slug)) return "ACTIVE_REGISTRY";
  return relationship?.status ?? "NO_RELATIONSHIP";
}

function currentRelationshipBlockReason(relationship: AffiliateProgramRelationship): string {
  switch (relationship.status) {
    case "PENDING_REVIEW":
      return `${relationship.programName} is already PENDING_REVIEW. Wait for first-party approval/rejection evidence; do not submit a duplicate application.`;
    case "ACTIVE":
    case "READY_AND_VERIFIED":
      return `${relationship.programName} already has a verified relationship; this is not a fresh application candidate.`;
    case "APPROVED_NEEDS_LINK":
    case "APPROVED_NEEDS_EDITORIAL_CONTENT":
      return `${relationship.programName} is already approved and needs activation work, not another application.`;
    case "OWNER_ACTION_REQUIRED":
    case "BLOCKED_FORM_DEFECT":
    case "HOLD":
      return relationship.ownerBlocker ?? relationship.formBlocker ?? relationship.notes ?? `${relationship.programName} is currently blocked.`;
    case "REJECTED":
      return `${relationship.programName} was rejected. Do not reapply without genuinely new first-party evidence.`;
    case "NOT_ELIGIBLE":
      return `${relationship.programName} is not eligible for Miloosh under current evidence.`;
    case "NO_REAL_PROGRAM_FOUND":
      return `${relationship.programName}: no current real publisher program is verified.`;
    case "PROGRAM_NOT_VERIFIED":
      return `${relationship.programName}: current publisher program is not sufficiently verified; research before any application.`;
    case "PROGRAM_ENDED":
      return `${relationship.programName} ended. Do not route the owner to the historical application path.`;
  }
}

function publicApplicationGate(
  software: Software,
  program: AffiliateProgramInfo | undefined,
  pipelineEntry: AffiliatePipelineEntry | undefined,
  relationship: AffiliateProgramRelationship | null,
): { ready: boolean; reason: string | null; status: AffiliateOperationalStatus } {
  const status = operationalStatus(software.slug, relationship);

  if (status === "ACTIVE_REGISTRY") {
    return { ready: false, reason: "Verified active partner already exists; optimize/measure the live relationship instead of applying again.", status };
  }
  if (relationship) {
    return { ready: false, reason: currentRelationshipBlockReason(relationship), status };
  }

  const pipelineStatus = pipelineEntry?.status ?? "unresearched";
  if (PIPELINE_APPLICATION_BLOCKERS.has(pipelineStatus)) {
    return {
      ready: false,
      reason: `Runtime pipeline is already "${pipelineStatus}". Reconcile/continue that workflow instead of creating a duplicate application.`,
      status,
    };
  }

  if (program?.programExists !== "yes") {
    return { ready: false, reason: "No confirmed current public affiliate program.", status };
  }
  if (!program.applicationUrl) {
    return { ready: false, reason: "No confirmed application URL yet.", status };
  }
  if (program.confidence === "low") {
    return { ready: false, reason: "Research confidence is low — key facts or current application status are unconfirmed.", status };
  }
  if (KNOWN_APPLICATION_BLOCKERS[software.slug]) {
    return { ready: false, reason: KNOWN_APPLICATION_BLOCKERS[software.slug]!, status };
  }

  return { ready: true, reason: null, status };
}

function scoreAffiliateAvailability(program: AffiliateProgramInfo | undefined, readyToApply: boolean): number {
  // This is an APPLICATION priority model. A public program that Miloosh is
  // already active/pending/rejected/blocked on gets no acquisition-availability
  // credit even though the vendor may publicly run a program.
  if (!readyToApply) return 0;
  return program?.programExists === "yes" ? 10 : 0;
}

function getRealImpressionsForSlug(slug: string): number {
  let total = 0;
  for (const candidate of readFirstClickCandidates()) {
    if (candidate.url.includes(`/software/${slug}`) || (candidate.url.includes(`/compare/`) && candidate.url.includes(slug))) {
      total += candidate.baseline.impressions;
    }
  }
  for (const candidate of readFirstClickStrikeCandidates()) {
    if (candidate.url.includes(`/software/${slug}`) || (candidate.url.includes(`/compare/`) && candidate.url.includes(slug))) {
      total += candidate.baseline.impressions;
    }
  }
  return total;
}

function scoreTrafficOpportunity(slug: string): { score: number; source: "real-gsc-cohort" | "none" } {
  const impressions = getRealImpressionsForSlug(slug);
  if (impressions <= 0) return { score: 0, source: "none" };
  const score = Math.min(10, Math.round(Math.log2(impressions + 1) * 1.8));
  return { score, source: "real-gsc-cohort" };
}

function scoreApprovalFriction(program: AffiliateProgramInfo | undefined, readyToApply: boolean): number {
  if (!readyToApply || !program || program.programExists !== "yes") return 0;
  if (program.networkName === "PartnerStack") return 10;
  if (program.networkName) return 7;
  if (program.type === "direct") return 5;
  return 3;
}

function computeAffiliatePriority(software: Software, pipelineEntry: AffiliatePipelineEntry | undefined): AffiliatePriorityBreakdown {
  const program = AFFILIATE_PROGRAMS.find((entry) => entry.slug === software.slug);
  const relationship = relationshipForProduct(software.slug);
  const gate = publicApplicationGate(software, program, pipelineEntry, relationship);
  const revenueScore = getRevenueScore(software);
  const traffic = scoreTrafficOpportunity(software.slug);
  const affiliateAvailabilityScore = scoreAffiliateAvailability(program, gate.ready);
  const approvalFrictionScore = scoreApprovalFriction(program, gate.ready);
  const recurringBonus = gate.ready && program?.recurrence === "recurring" ? RECURRING_BONUS : 0;

  const raw =
    affiliateAvailabilityScore * WEIGHTS.affiliateAvailability +
    revenueScore.categoryValueScore * WEIGHTS.categoryValue +
    revenueScore.commercialIntentScore * WEIGHTS.commercialIntent +
    revenueScore.buyingIntentScore * WEIGHTS.buyingIntent +
    traffic.score * WEIGHTS.trafficOpportunity +
    approvalFrictionScore * WEIGHTS.approvalFriction +
    recurringBonus;

  return {
    slug: software.slug,
    name: software.name,
    programExists: program?.programExists ?? "no_entry",
    pipelineStatus: pipelineEntry?.status ?? "unresearched",
    operationalStatus: gate.status,
    affiliateAvailabilityScore,
    categoryValueScore: revenueScore.categoryValueScore,
    commercialIntentScore: revenueScore.commercialIntentScore,
    buyingIntentScore: revenueScore.buyingIntentScore,
    trafficOpportunityScore: traffic.score,
    trafficDataSource: traffic.source,
    approvalFrictionScore,
    recurringBonus,
    totalScore: Math.round((raw / MAX_RAW) * 100),
    readyToApply: gate.ready,
    blockReason: gate.reason,
    affiliateUrl: ACTIVE_PARTNERS.find((partner) => partner.slug === software.slug)?.affiliateUrl ?? pipelineEntry?.affiliateUrl ?? relationship?.affiliateUrl ?? null,
    approvedAt: pipelineEntry?.approvedAt ?? null,
    submittedAt: pipelineEntry?.submittedAt ?? relationship?.applicationSubmittedAt ?? null,
    rejectedAt: pipelineEntry?.rejectedAt ?? (relationship?.status === "REJECTED" ? relationship.decisionAt : null),
    pipelineNotes: pipelineEntry?.notes ?? null,
    ownerActionRequired: pipelineEntry?.ownerActionRequired ?? relationship?.ownerBlocker ?? relationship?.formBlocker ?? null,
  };
}

export async function getAffiliatePriority(software: Software): Promise<AffiliatePriorityBreakdown> {
  const pipelineEntry = await getPipelineEntry(software.slug);
  return computeAffiliatePriority(software, pipelineEntry);
}

/** Fresh application candidates only. Current active/pending/rejected/blocked relationships and already-progressed pipeline entries are excluded even if the vendor publicly runs a program. */
export async function getRankedApplicationCandidates(entries?: AffiliatePipelineEntry[]): Promise<AffiliatePriorityBreakdown[]> {
  const list = entries ?? (await readAffiliatePipeline());
  const pipelineMap = buildPipelineMap(list);
  const breakdowns = getAllSoftware().map((software) => computeAffiliatePriority(software, pipelineMap.get(software.slug)));
  return breakdowns.filter((breakdown) => breakdown.readyToApply).sort((a, b) => b.totalScore - a.totalScore);
}

export async function getAllPriorities(entries?: AffiliatePipelineEntry[]): Promise<AffiliatePriorityBreakdown[]> {
  const list = entries ?? (await readAffiliatePipeline());
  const pipelineMap = buildPipelineMap(list);
  const breakdowns = getAllSoftware().map((software) => computeAffiliatePriority(software, pipelineMap.get(software.slug)));
  return breakdowns.sort((a, b) => b.totalScore - a.totalScore);
}
