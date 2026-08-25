import { ACTIVE_PARTNERS, type ActivePartnerSlug } from "@/data/affiliate/active-partners";
import { NETWORK_PERFORMANCE_SIGNALS, type NetworkPerformanceSignal } from "@/data/affiliate/network-performance-signals";
import { classifySessions, type TrafficBucket } from "@/lib/analytics/human-classification";
import type { FirstPartyEvent, OutboundClickEvent } from "@/lib/analytics/events";
import type { OutboundClickSummaryRow } from "@/lib/revenue/events";

export type GscPartnerMetric = {
  impressions: number | null;
  searchClicks: number | null;
  source: string;
};

export type DownstreamPartnerMetric = {
  conversions: number | null;
  commissions: number | null;
  revenue: number | null;
};

export type PartnerPerformanceInputs = {
  outboundRows?: readonly OutboundClickSummaryRow[];
  gscBySlug?: Readonly<Record<string, GscPartnerMetric>>;
  eligibleHumanSessionsBySlug?: Readonly<Record<string, number>>;
  eligibleHumanAffiliateClicksBySlug?: Readonly<Record<string, number>>;
  comparisonCountBySlug?: Readonly<Record<string, number>>;
  downstreamBySlug?: Readonly<Record<string, DownstreamPartnerMetric>>;
  networkSignals?: readonly NetworkPerformanceSignal[];
};

export type PartnerPerformanceRow = {
  slug: ActivePartnerSlug;
  affiliateUrl: string | null;
  gscImpressions: number | null;
  gscSearchClicks: number | null;
  gscSource: string | null;
  eligibleHumanSessions: number | null;
  eligibleHumanAffiliateClicks: number | null;
  nonTestFirstPartyOutboundEvents: number;
  nonTestFirstPartyAffiliateEvents: number;
  nonTestFirstPartyOfficialEvents: number;
  nonTestFirstPartyVendorLinkEvents: number;
  firstPartyTestEvents: number;
  networkClickActivity: boolean;
  networkClickFloor: number | null;
  networkSignalSummary: string | null;
  comparisonCount: number | null;
  conversions: number | null;
  commissions: number | null;
  revenue: number | null;
  revenueProximityScore: number;
  scoreBreakdown: {
    eligibleHumanAffiliateClicks: number;
    nonTestFirstPartyAffiliateEvents: number;
    networkEvidence: number;
    gscDemand: number;
    gscSearchClicks: number;
    comparisonCoverage: number;
    downstreamEvidence: number;
  };
};

export type EligibleHumanAffiliateEvidence = {
  clicksBySlug: Record<string, number>;
  sessionsBySlug: Record<string, number>;
};

const ELIGIBLE_HUMAN_BUCKETS = new Set<TrafficBucket>([
  "CONFIRMED_CLEAN",
  "STRONG_HUMAN_EVIDENCE",
  "PROBABLE_HUMAN",
]);

/**
 * Derives affiliate-click evidence from the same canonical session classifier
 * used by the rest of Miloosh analytics reporting. QA, known automation,
 * suspicious, and unresolved sessions are excluded. This is intentionally
 * computed from first-party analytics events rather than the legacy outbound
 * store because analytics events carry the sessionId needed for classification.
 */
export function summarizeEligibleHumanAffiliateEvidence(events: readonly FirstPartyEvent[]): EligibleHumanAffiliateEvidence {
  const classifications = classifySessions(events);
  const eligibleSessionIds = new Set(
    classifications.filter((classification) => ELIGIBLE_HUMAN_BUCKETS.has(classification.bucket)).map((classification) => classification.sessionId)
  );
  const clicksBySlug: Record<string, number> = {};
  const sessionSetsBySlug = new Map<string, Set<string>>();

  for (const event of events) {
    if (event.type !== "outbound_click") continue;
    const outbound = event as OutboundClickEvent;
    if (outbound.destination !== "affiliate" || outbound.isTest || !eligibleSessionIds.has(outbound.sessionId)) continue;

    clicksBySlug[outbound.softwareSlug] = (clicksBySlug[outbound.softwareSlug] ?? 0) + 1;
    const sessions = sessionSetsBySlug.get(outbound.softwareSlug) ?? new Set<string>();
    sessions.add(outbound.sessionId);
    sessionSetsBySlug.set(outbound.softwareSlug, sessions);
  }

  return {
    clicksBySlug,
    sessionsBySlug: Object.fromEntries([...sessionSetsBySlug.entries()].map(([slug, sessions]) => [slug, sessions.size])),
  };
}

function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

/**
 * Canonical active-partner performance projection.
 *
 * Metric classes are intentionally separate:
 * - GSC search clicks are Google-result clicks into Miloosh.
 * - eligible-human affiliate clicks require the canonical traffic classifier.
 * - legacy first-party outbound rows prove only `isTest !== true`; they are
 *   therefore named non-test events, NOT verified-human clicks.
 * - network click signals are vendor/network-side evidence and are never added
 *   to first-party event totals because attribution and traffic quality cannot
 *   be proven from those emails alone.
 * - unknown conversion/commission/revenue values stay null, never zero.
 */
export function buildPartnerPerformanceRows(inputs: PartnerPerformanceInputs = {}): PartnerPerformanceRow[] {
  const outboundBySlug = new Map((inputs.outboundRows ?? []).map((row) => [row.softwareSlug, row]));
  const signals = inputs.networkSignals ?? NETWORK_PERFORMANCE_SIGNALS;
  const networkBySlug = new Map<string, NetworkPerformanceSignal>();

  for (const signal of signals) {
    const existing = networkBySlug.get(signal.partnerSlug);
    if (!existing || (signal.clickFloor ?? -1) > (existing.clickFloor ?? -1)) {
      networkBySlug.set(signal.partnerSlug, signal);
    }
  }

  const rows: PartnerPerformanceRow[] = ACTIVE_PARTNERS.map((partner) => {
    const outbound = outboundBySlug.get(partner.slug);
    const gsc = inputs.gscBySlug?.[partner.slug];
    const network = networkBySlug.get(partner.slug);
    const downstream = inputs.downstreamBySlug?.[partner.slug];
    const comparisonCount = inputs.comparisonCountBySlug?.[partner.slug] ?? null;
    const eligibleHumanAffiliateClicks = inputs.eligibleHumanAffiliateClicksBySlug?.[partner.slug] ?? null;

    const nonTestFirstPartyAffiliateEvents = outbound?.affiliateClicks ?? 0;
    const nonTestFirstPartyOutboundEvents = outbound?.totalClicks ?? 0;

    const scoreBreakdown = {
      eligibleHumanAffiliateClicks: clampScore((eligibleHumanAffiliateClicks ?? 0) * 16, 48),
      nonTestFirstPartyAffiliateEvents: clampScore(nonTestFirstPartyAffiliateEvents * 7, 28),
      networkEvidence: network ? clampScore(8 + (network.clickFloor ?? 0), 20) : 0,
      gscDemand: gsc?.impressions == null ? 0 : clampScore(Math.sqrt(gsc.impressions) * 1.25, 16),
      gscSearchClicks: gsc?.searchClicks == null ? 0 : clampScore(gsc.searchClicks * 2, 6),
      comparisonCoverage: comparisonCount == null ? 0 : clampScore(comparisonCount, 10),
      downstreamEvidence: clampScore(
        (downstream?.conversions ?? 0) * 10 + (downstream?.commissions ?? 0) * 12 + ((downstream?.revenue ?? 0) > 0 ? 20 : 0),
        30
      ),
    };

    return {
      slug: partner.slug,
      affiliateUrl: partner.affiliateUrl,
      gscImpressions: gsc?.impressions ?? null,
      gscSearchClicks: gsc?.searchClicks ?? null,
      gscSource: gsc?.source ?? null,
      eligibleHumanSessions: inputs.eligibleHumanSessionsBySlug?.[partner.slug] ?? null,
      eligibleHumanAffiliateClicks,
      nonTestFirstPartyOutboundEvents,
      nonTestFirstPartyAffiliateEvents,
      nonTestFirstPartyOfficialEvents: outbound?.officialClicks ?? 0,
      nonTestFirstPartyVendorLinkEvents: outbound?.vendorLinkClicks ?? 0,
      firstPartyTestEvents: outbound?.testClicks ?? 0,
      networkClickActivity: Boolean(network),
      networkClickFloor: network?.clickFloor ?? null,
      networkSignalSummary: network?.summary ?? null,
      comparisonCount,
      conversions: downstream?.conversions ?? null,
      commissions: downstream?.commissions ?? null,
      revenue: downstream?.revenue ?? null,
      revenueProximityScore: Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0),
      scoreBreakdown,
    };
  });

  return rows.sort(
    (a, b) =>
      b.revenueProximityScore - a.revenueProximityScore ||
      (b.eligibleHumanAffiliateClicks ?? -1) - (a.eligibleHumanAffiliateClicks ?? -1) ||
      b.nonTestFirstPartyAffiliateEvents - a.nonTestFirstPartyAffiliateEvents ||
      (b.networkClickFloor ?? -1) - (a.networkClickFloor ?? -1) ||
      (b.gscImpressions ?? -1) - (a.gscImpressions ?? -1) ||
      a.slug.localeCompare(b.slug)
  );
}
