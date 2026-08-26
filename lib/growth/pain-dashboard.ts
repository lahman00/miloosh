import { clusterPainCandidates, type PainCluster } from "./pain-clustering";
import { scorePainCandidate, type PainAction } from "./pain-radar";
import type { PersistedPainCandidate } from "./pain-candidate-store";
import {
  mergePainCommissionTotals,
  summarizePainRevenueAttribution,
  type PainCommissionTotal,
  type PainRevenueIntegrationState,
} from "./pain-revenue-attribution";

const FRESH_WINDOW_HOURS = 30 * 24;
const MAX_SIGNAL_ROWS = 20;

export type PainDashboardSignal = {
  id: string;
  title: string;
  product?: string;
  vendor?: string;
  source: string;
  sourceUrl: string;
  sourceHref?: string;
  sourceHost: string;
  discoveredAt: string;
  intent: string;
  score: number;
  action: PainAction;
  verificationState: PersistedPainCandidate["verificationState"];
  remedyState: PersistedPainCandidate["remedyState"];
  remedyAction?: PersistedPainCandidate["remedyAction"];
  distributionState: PersistedPainCandidate["distributionState"];
  normalizedPainClass: PersistedPainCandidate["normalizedPainClass"];
  clusterId?: string;
  affiliateRelevant: boolean;
  communityAllowsPromotion?: boolean;
  communityRulesVerifiedAt?: string;
  classifiedHumanSessions: number;
  ctaClicks: number;
  leads: number;
  affiliateClicks: number;
  revenueIntegrationState: PainRevenueIntegrationState;
  verifiedConversions: number;
  approvedCommissionByCurrency: PainCommissionTotal[];
  pendingCommissionEvents: number;
};

export type PainDashboardSummary = {
  totalCandidates: number;
  freshCandidates: number;
  verifiedCandidates: number;
  actionableCandidates: number;
  publishedRemedies: number;
  distributedCandidates: number;
  attributedHumanSessions: number;
  attributedCtaClicks: number;
  attributedLeads: number;
  attributedAffiliateClicks: number;
  revenueIntegrationState: PainRevenueIntegrationState;
  verifiedConversions: number;
  approvedCommissionByCurrency: PainCommissionTotal[];
  pendingCommissionEvents: number;
};

export type PainDashboardData = {
  generatedAt: string;
  summary: PainDashboardSummary;
  signals: PainDashboardSignal[];
  clusters: PainCluster[];
};

function parseSafeSource(url: string): { host: string; href?: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { host: host || "unsafe-source-url" };
    }
    return { host, href: parsed.toString() };
  } catch {
    return { host: "invalid-source-url" };
  }
}

function ageHours(discoveredAt: string, nowMs: number): number {
  const discoveredMs = new Date(discoveredAt).getTime();
  if (!Number.isFinite(discoveredMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - discoveredMs) / (60 * 60 * 1000));
}

function toSignal(candidate: PersistedPainCandidate): PainDashboardSignal {
  const scored = scorePainCandidate(candidate);
  const source = parseSafeSource(candidate.sourceUrl);
  const revenue = summarizePainRevenueAttribution(
    candidate.attributedOutcome?.revenueAttribution,
    candidate.id,
  );

  return {
    id: candidate.id,
    title: candidate.title,
    product: candidate.product,
    vendor: candidate.vendor,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
    sourceHref: source.href,
    sourceHost: source.host,
    discoveredAt: candidate.discoveredAt,
    intent: candidate.intent,
    score: scored.score,
    action: scored.action,
    verificationState: candidate.verificationState,
    remedyState: candidate.remedyState,
    remedyAction: candidate.remedyAction,
    distributionState: candidate.distributionState,
    normalizedPainClass: candidate.normalizedPainClass,
    clusterId: candidate.clusterId,
    affiliateRelevant: candidate.affiliateRelevant === true,
    communityAllowsPromotion: candidate.communityAllowsPromotion,
    communityRulesVerifiedAt: candidate.communityRulesVerifiedAt,
    classifiedHumanSessions: candidate.attributedOutcome?.classifiedHumanSessions ?? 0,
    ctaClicks: candidate.attributedOutcome?.ctaClicks ?? 0,
    leads: candidate.attributedOutcome?.leads ?? 0,
    affiliateClicks: candidate.attributedOutcome?.affiliateClicks ?? 0,
    revenueIntegrationState: revenue.integrationState,
    verifiedConversions: revenue.verifiedConversions,
    approvedCommissionByCurrency: revenue.approvedCommissionByCurrency,
    pendingCommissionEvents: revenue.pendingCommissionEvents,
  };
}

function overallRevenueState(
  states: PainRevenueIntegrationState[],
): PainRevenueIntegrationState {
  if (states.includes("VERIFIED_EVENTS")) return "VERIFIED_EVENTS";
  if (states.includes("CONNECTED_NO_EVENTS")) return "CONNECTED_NO_EVENTS";
  return "NOT_CONNECTED";
}

export function buildPainRadarDashboard(
  candidates: PersistedPainCandidate[],
  now = new Date(),
): PainDashboardData {
  const nowMs = now.getTime();
  const freshCandidates = candidates.filter((candidate) => ageHours(candidate.discoveredAt, nowMs) <= FRESH_WINDOW_HOURS);
  const signalPool = freshCandidates.length > 0 ? freshCandidates : candidates;
  const signals = signalPool
    .map(toSignal)
    .sort((a, b) => b.score - a.score || new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime())
    .slice(0, MAX_SIGNAL_ROWS);

  const clusters = clusterPainCandidates(candidates).slice(0, 20);
  const revenueSummaries = candidates.map((candidate) =>
    summarizePainRevenueAttribution(candidate.attributedOutcome?.revenueAttribution, candidate.id),
  );

  const summary: PainDashboardSummary = {
    totalCandidates: candidates.length,
    freshCandidates: freshCandidates.length,
    verifiedCandidates: candidates.filter((candidate) => candidate.verificationState === "VERIFIED_TRUE").length,
    actionableCandidates: candidates.filter((candidate) => {
      const action = scorePainCandidate(candidate).action;
      return action !== "MONITOR" && action !== "REJECT";
    }).length,
    publishedRemedies: candidates.filter((candidate) => candidate.remedyState === "PUBLISHED").length,
    distributedCandidates: candidates.filter((candidate) => candidate.distributionState === "DISTRIBUTED").length,
    attributedHumanSessions: candidates.reduce(
      (sum, candidate) => sum + (candidate.attributedOutcome?.classifiedHumanSessions ?? 0),
      0,
    ),
    attributedCtaClicks: candidates.reduce((sum, candidate) => sum + (candidate.attributedOutcome?.ctaClicks ?? 0), 0),
    attributedLeads: candidates.reduce((sum, candidate) => sum + (candidate.attributedOutcome?.leads ?? 0), 0),
    attributedAffiliateClicks: candidates.reduce(
      (sum, candidate) => sum + (candidate.attributedOutcome?.affiliateClicks ?? 0),
      0,
    ),
    revenueIntegrationState: overallRevenueState(revenueSummaries.map((summary) => summary.integrationState)),
    verifiedConversions: revenueSummaries.reduce((sum, summary) => sum + summary.verifiedConversions, 0),
    approvedCommissionByCurrency: mergePainCommissionTotals(
      revenueSummaries.map((summary) => summary.approvedCommissionByCurrency),
    ),
    pendingCommissionEvents: revenueSummaries.reduce(
      (sum, summary) => sum + summary.pendingCommissionEvents,
      0,
    ),
  };

  return {
    generatedAt: now.toISOString(),
    summary,
    signals,
    clusters,
  };
}
