import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { SessionClassification, TrafficBucket } from "@/lib/analytics/human-classification";

/**
 * Where qualified buyers land, which channel sent them, and how far they get: landing page, commercial page visits, CTA
 * impressions, genuine outbound clicks, click-through rates and partner-side results.
 *
 * Rules that keep it honest:
 * - Only sessions the classifier marks CONFIRMED_CLEAN or STRONG_HUMAN_EVIDENCE count as qualified. PROBABLE_HUMAN sessions
 *   are shown in their own column, never added to the qualified count. QA, automation, suspicious and unresolved sessions
 *   are counted apart and never enter a rate.
 * - A rate whose denominator is zero is `null` (not measurable), never 0%.
 * - A merchant hand-off is a click, not a conversion. Conversions and commissions live in the partner network; unless a
 *   partner-side figure is supplied they are reported as NOT_MEASURED, never zero.
 */

export type Channel = "organic_search" | "social" | "referral" | "direct" | "unknown";

export const QUALIFIED_BUCKETS: readonly TrafficBucket[] = ["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE"];

const COMMERCIAL_VIEWS = new Set(["software_view", "comparison_view", "guide_view"]);

export type FunnelRow = {
  landingPath: string;
  channel: Channel;
  sessions: { qualified: number; probableHuman: number; excluded: number };
  commercialPageVisitSessions: number;
  ctaImpressionSessions: number;
  ctaClickSessions: number;
  /** Server-recorded merchant hand-offs (outbound_click events) in qualified or probable sessions. */
  outboundClicks: { official: number; affiliate: number };
  /** Qualified sessions that reached a commercial page / saw a CTA / clicked. */
  rates: { commercialVisitRate: number | null; ctaClickRate: number | null; outboundRate: number | null };
};

export type FunnelReport = {
  generatedAt: string;
  windowStart: string | null;
  windowEnd: string | null;
  rows: FunnelRow[];
  totals: { qualifiedSessions: number; probableHumanSessions: number; excludedSessions: number; unclassifiedEvents: number };
  /** Network-side results are outside the site. Only a supplied figure is reported. */
  partnerConversions: "NOT_MEASURED" | { source: string; asOf: string; conversions: number; approvedCommissions: number };
  captureIntegrity: "NOT_VERIFIED";
};

const rate = (numerator: number, denominator: number): number | null => (denominator === 0 ? null : numerator / denominator);

export function buildFunnelByLanding(input: {
  events: readonly FirstPartyEvent[];
  classifications: readonly SessionClassification[];
  now?: Date;
  partnerConversions?: FunnelReport["partnerConversions"];
}): FunnelReport {
  const bucketOf = new Map(input.classifications.map((c) => [c.sessionId, c.bucket]));
  const bySession = new Map<string, FirstPartyEvent[]>();
  let unclassifiedEvents = 0;
  for (const event of input.events) {
    if (!bucketOf.has(event.sessionId)) {
      unclassifiedEvents += 1;
      continue;
    }
    (bySession.get(event.sessionId) ?? bySession.set(event.sessionId, []).get(event.sessionId)!).push(event);
  }

  const rows = new Map<string, FunnelRow & { _qualified: Set<string> }>();
  let qualifiedSessions = 0;
  let probableHumanSessions = 0;
  let excludedSessions = 0;
  const stamps: string[] = [];

  for (const [sessionId, events] of bySession) {
    const bucket = bucketOf.get(sessionId)!;
    const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const landing = sorted.find((e) => e.type === "page_view") ?? sorted[0]!;
    const channel: Channel = (landing.type === "page_view" ? landing.trafficSource : undefined) ?? "unknown";
    const key = `${landing.path}|${channel}`;
    const row =
      rows.get(key) ??
      rows
        .set(key, {
          landingPath: landing.path,
          channel,
          sessions: { qualified: 0, probableHuman: 0, excluded: 0 },
          commercialPageVisitSessions: 0,
          ctaImpressionSessions: 0,
          ctaClickSessions: 0,
          outboundClicks: { official: 0, affiliate: 0 },
          rates: { commercialVisitRate: null, ctaClickRate: null, outboundRate: null },
          _qualified: new Set(),
        })
        .get(key)!;

    const qualified = QUALIFIED_BUCKETS.includes(bucket);
    if (qualified) {
      row.sessions.qualified += 1;
      qualifiedSessions += 1;
    } else if (bucket === "PROBABLE_HUMAN") {
      row.sessions.probableHuman += 1;
      probableHumanSessions += 1;
    } else {
      row.sessions.excluded += 1;
      excludedSessions += 1;
      continue; // QA, automation, suspicious and unresolved sessions never enter any rate or click count
    }
    stamps.push(sorted[0]!.timestamp, sorted[sorted.length - 1]!.timestamp);

    if (qualified) row._qualified.add(sessionId);
    if (sorted.some((e) => COMMERCIAL_VIEWS.has(e.type))) row.commercialPageVisitSessions += qualified ? 1 : 0;
    if (sorted.some((e) => e.type === "cta_impression")) row.ctaImpressionSessions += qualified ? 1 : 0;
    if (sorted.some((e) => e.type === "cta_click")) row.ctaClickSessions += qualified ? 1 : 0;
    for (const event of sorted) {
      if (event.type === "outbound_click" && !event.isTest) row.outboundClicks[event.destination === "affiliate" ? "affiliate" : "official"] += 1;
    }
  }

  const finished = [...rows.values()].map(({ _qualified, ...row }) => {
    const q = _qualified.size;
    row.rates = {
      commercialVisitRate: rate(row.commercialPageVisitSessions, q),
      ctaClickRate: rate(row.ctaClickSessions, row.ctaImpressionSessions),
      outboundRate: rate(row.outboundClicks.affiliate + row.outboundClicks.official, q),
    };
    return row;
  });
  finished.sort((a, b) => b.sessions.qualified - a.sessions.qualified || b.sessions.probableHuman - a.sessions.probableHuman || a.landingPath.localeCompare(b.landingPath) || a.channel.localeCompare(b.channel));

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    windowStart: stamps.length ? stamps.reduce((a, b) => (a < b ? a : b)) : null,
    windowEnd: stamps.length ? stamps.reduce((a, b) => (a > b ? a : b)) : null,
    rows: finished,
    totals: { qualifiedSessions, probableHumanSessions, excludedSessions, unclassifiedEvents },
    partnerConversions: input.partnerConversions ?? "NOT_MEASURED",
    captureIntegrity: "NOT_VERIFIED",
  };
}
