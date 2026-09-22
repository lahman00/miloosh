import { getInboundSocialEvents, isExcludedSocialEvent, type InboundSocialEvent } from "@/lib/social/attribution";
import { isOutboundTrackingEnabled } from "@/lib/revenue/events";

/**
 * MILOOSH community-attribution readback (2026-08-31): real counts of
 * inbound social landings by attribution_key (platform/utm_source +
 * utm_campaign + utm_content + landing page), for reconciling an external
 * distribution ledger against actual measured traffic.
 *
 * NOT_MEASURED vs 0 is a deliberate, load-bearing distinction throughout
 * this report, matching the same pattern already established in
 * lib/growth/money-priority-engine.ts: 0 means "we measured and found
 * zero real landings for this key" -- a true, meaningful fact. NOT_MEASURED
 * means "no measurement is currently possible" (tracking disabled site-
 * wide), which must never be silently reported as 0, because a downstream
 * ledger update that converts NOT_MEASURED to 0 would fabricate an absence
 * of traffic that was actually just never observed.
 */

export type AttributionKeyCount = {
  attributionKey: string;
  platform: string;
  campaign: string | null;
  contentId: string | null;
  landingPath: string;
  count: number;
  explicitNonTestCount: number;
  unknownMarkerCount: number;
  firstSeen: string;
  lastSeen: string;
};

export type SocialAttributionReport = {
  generatedAt: string;
  trackingEnabled: boolean;
  readStatus: "COMPLETE" | "UNAVAILABLE" | "NOT_MEASURED";
  /** Observed records after explicit QA/test exclusion. This is not a human count. */
  totalObservedEvents: number | "UNKNOWN" | "NOT_MEASURED";
  /** Backward-compatible alias for observed, non-excluded records. */
  totalRealEvents: number | "UNKNOWN" | "NOT_MEASURED";
  totalExplicitNonTestEvents: number | "UNKNOWN" | "NOT_MEASURED";
  totalUnknownMarkerEvents: number | "UNKNOWN" | "NOT_MEASURED";
  totalExcludedTestEvents: number;
  /** isTest=false does not prove a human; browser/operator provenance can still be unknown. */
  humanAttribution: "UNKNOWN";
  byAttributionKey: AttributionKeyCount[] | "UNKNOWN" | "NOT_MEASURED";
};

function attributionKey(e: InboundSocialEvent): string {
  return [e.channel, e.campaign ?? "-", e.contentId ?? "-", e.landingPath].join("|");
}

export async function buildSocialAttributionReport(): Promise<SocialAttributionReport> {
  const trackingEnabled = isOutboundTrackingEnabled();

  if (!trackingEnabled) {
    const allEvents = await getInboundSocialEvents();
    return {
      generatedAt: new Date().toISOString(),
      trackingEnabled,
      readStatus: "NOT_MEASURED",
      totalObservedEvents: "NOT_MEASURED",
      totalRealEvents: "NOT_MEASURED",
      totalExplicitNonTestEvents: "NOT_MEASURED",
      totalUnknownMarkerEvents: "NOT_MEASURED",
      totalExcludedTestEvents: allEvents.filter(isExcludedSocialEvent).length,
      humanAttribution: "UNKNOWN",
      byAttributionKey: "NOT_MEASURED",
    };
  }

  let allEvents: InboundSocialEvent[];
  try {
    allEvents = await getInboundSocialEvents({ strict: true });
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      trackingEnabled,
      readStatus: "UNAVAILABLE",
      totalObservedEvents: "UNKNOWN",
      totalRealEvents: "UNKNOWN",
      totalExplicitNonTestEvents: "UNKNOWN",
      totalUnknownMarkerEvents: "UNKNOWN",
      totalExcludedTestEvents: 0,
      humanAttribution: "UNKNOWN",
      byAttributionKey: "UNKNOWN",
    };
  }

  const excludedCount = allEvents.filter(isExcludedSocialEvent).length;
  const observedEvents = allEvents.filter((e) => !isExcludedSocialEvent(e));
  const explicitNonTestCount = observedEvents.filter((e) => e.isTest === false).length;
  const unknownMarkerCount = observedEvents.filter((e) => e.isTest === undefined).length;
  const byKey = new Map<string, AttributionKeyCount>();

  for (const e of observedEvents) {
    const key = attributionKey(e);
    const existing = byKey.get(key);
    const explicit = e.isTest === false ? 1 : 0;
    const unknown = e.isTest === undefined ? 1 : 0;
    if (existing) {
      existing.count += 1;
      existing.explicitNonTestCount += explicit;
      existing.unknownMarkerCount += unknown;
      if (e.timestamp < existing.firstSeen) existing.firstSeen = e.timestamp;
      if (e.timestamp > existing.lastSeen) existing.lastSeen = e.timestamp;
    } else {
      byKey.set(key, {
        attributionKey: key,
        platform: e.channel,
        campaign: e.campaign,
        contentId: e.contentId,
        landingPath: e.landingPath,
        count: 1,
        explicitNonTestCount: explicit,
        unknownMarkerCount: unknown,
        firstSeen: e.timestamp,
        lastSeen: e.timestamp,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    trackingEnabled,
    readStatus: "COMPLETE",
    totalObservedEvents: observedEvents.length,
    totalRealEvents: observedEvents.length,
    totalExplicitNonTestEvents: explicitNonTestCount,
    totalUnknownMarkerEvents: unknownMarkerCount,
    totalExcludedTestEvents: excludedCount,
    humanAttribution: "UNKNOWN",
    byAttributionKey: [...byKey.values()].sort((a, b) => b.count - a.count),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildSocialAttributionReport().then((report) => {
    console.log("================================================================");
    console.log("       MILOOSH SOCIAL ATTRIBUTION REPORT (real counts only)      ");
    console.log("================================================================\n");
    console.log(`Generated: ${report.generatedAt}`);
    console.log(`Tracking enabled: ${report.trackingEnabled}`);
    console.log(`Excluded QA/synthetic/operator events: ${report.totalExcludedTestEvents}\n`);

    if (report.byAttributionKey === "UNKNOWN") {
      console.log("social attribution ledger: UNKNOWN (read unavailable)");
      return;
    }

    if (report.byAttributionKey === "NOT_MEASURED") {
      console.log("totalRealEvents: NOT_MEASURED");
      console.log("byAttributionKey: NOT_MEASURED");
      console.log("\nTracking is currently disabled (NEXT_PUBLIC_REVENUE_TRACKING_ENABLED is not \"true\").");
      console.log("Do not report 0 anywhere downstream -- this means \"not currently measurable\", not \"measured zero\".");
      return;
    }

    console.log(`Total real events: ${report.totalRealEvents}\n`);
    if (report.byAttributionKey.length === 0) {
      console.log("No real (non-excluded) inbound social landings recorded yet.");
      return;
    }
    console.log("BY ATTRIBUTION KEY (platform | campaign | content | landing_path):");
    for (const row of report.byAttributionKey) {
      console.log(`  ${String(row.count).padStart(4)}  ${row.platform.padEnd(10)} | ${(row.campaign ?? "-").padEnd(20)} | ${(row.contentId ?? "-").padEnd(24)} | ${row.landingPath}  (${row.firstSeen} -> ${row.lastSeen})`);
    }
  });
}
