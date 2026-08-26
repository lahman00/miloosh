import type { FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";

const ELIGIBLE_HUMAN_BUCKETS = new Set([
  "CONFIRMED_CLEAN",
  "STRONG_HUMAN_EVIDENCE",
  "PROBABLE_HUMAN",
]);

export type CtaPlacementPerformance = {
  softwareSlug: string;
  ctaLocation: string;
  humanImpressionSessions: number;
  humanImpressionVisitors: number;
  humanClickSessionsWithPriorImpression: number;
  humanClickVisitorsWithPriorImpression: number;
  affiliateClickSessionsWithPriorImpression: number;
  officialClickSessionsWithPriorImpression: number;
  seenToClickRatePercent: number | "NOT_MEASURED";
};

export function getEligibleHumanSessionIds(events: readonly FirstPartyEvent[]): Set<string> {
  return new Set(
    classifySessions(events)
      .filter((classification) => ELIGIBLE_HUMAN_BUCKETS.has(classification.bucket))
      .map((classification) => classification.sessionId),
  );
}

function locationOf(event: { ctaLocation?: string }): string {
  return event.ctaLocation?.trim() || "UNKNOWN";
}

function keyOf(softwareSlug: string, ctaLocation: string): string {
  return `${softwareSlug}\u0000${ctaLocation}`;
}

/**
 * Human-qualified CTA exposure -> click performance by exact placement.
 *
 * A click only enters the numerator when the same eligible-human session
 * first recorded a CTA impression for the same software + placement. This
 * deliberately prevents a direct POST to /api/outbound-click from becoming
 * a conversion-rate numerator and keeps the denominator honest.
 */
export function computeCtaPlacementPerformance(
  events: readonly FirstPartyEvent[],
  eligibleSessionIds: ReadonlySet<string> = getEligibleHumanSessionIds(events),
): CtaPlacementPerformance[] {
  const impressionSessionsByKey = new Map<string, Map<string, { visitorId: string; firstTimestamp: string }>>();
  const metaByKey = new Map<string, { softwareSlug: string; ctaLocation: string }>();

  for (const event of events) {
    if (event.type !== "cta_impression" || event.isTest || !eligibleSessionIds.has(event.sessionId)) continue;
    const ctaLocation = locationOf(event);
    const key = keyOf(event.softwareSlug, ctaLocation);
    metaByKey.set(key, { softwareSlug: event.softwareSlug, ctaLocation });
    const sessions = impressionSessionsByKey.get(key) ?? new Map();
    const existing = sessions.get(event.sessionId);
    if (!existing || event.timestamp < existing.firstTimestamp) {
      sessions.set(event.sessionId, { visitorId: event.visitorId, firstTimestamp: event.timestamp });
    }
    impressionSessionsByKey.set(key, sessions);
  }

  const clickSessionsByKey = new Map<
    string,
    Map<string, { visitorId: string; destination: "official" | "affiliate" }>
  >();

  for (const event of events) {
    if (event.type !== "outbound_click" || event.isTest || !eligibleSessionIds.has(event.sessionId)) continue;
    const ctaLocation = locationOf(event);
    const key = keyOf(event.softwareSlug, ctaLocation);
    const impression = impressionSessionsByKey.get(key)?.get(event.sessionId);
    if (!impression || impression.firstTimestamp > event.timestamp) continue;

    const sessions = clickSessionsByKey.get(key) ?? new Map();
    if (!sessions.has(event.sessionId)) {
      sessions.set(event.sessionId, { visitorId: event.visitorId, destination: event.destination });
    }
    clickSessionsByKey.set(key, sessions);
  }

  return [...impressionSessionsByKey.entries()]
    .map(([key, impressionSessions]): CtaPlacementPerformance => {
      const meta = metaByKey.get(key)!;
      const clickSessions = clickSessionsByKey.get(key) ?? new Map();
      const impressionVisitors = new Set([...impressionSessions.values()].map((row) => row.visitorId));
      const clickVisitors = new Set([...clickSessions.values()].map((row) => row.visitorId));
      const affiliateClickSessions = [...clickSessions.values()].filter((row) => row.destination === "affiliate").length;
      const officialClickSessions = [...clickSessions.values()].filter((row) => row.destination === "official").length;
      const rate =
        impressionSessions.size > 0
          ? Math.round((clickSessions.size / impressionSessions.size) * 1000) / 10
          : ("NOT_MEASURED" as const);

      return {
        ...meta,
        humanImpressionSessions: impressionSessions.size,
        humanImpressionVisitors: impressionVisitors.size,
        humanClickSessionsWithPriorImpression: clickSessions.size,
        humanClickVisitorsWithPriorImpression: clickVisitors.size,
        affiliateClickSessionsWithPriorImpression: affiliateClickSessions,
        officialClickSessionsWithPriorImpression: officialClickSessions,
        seenToClickRatePercent: rate,
      };
    })
    .sort((a, b) => {
      if (b.humanImpressionSessions !== a.humanImpressionSessions) {
        return b.humanImpressionSessions - a.humanImpressionSessions;
      }
      if (a.softwareSlug !== b.softwareSlug) return a.softwareSlug.localeCompare(b.softwareSlug);
      return a.ctaLocation.localeCompare(b.ctaLocation);
    });
}
