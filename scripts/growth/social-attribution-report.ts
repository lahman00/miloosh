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
  firstSeen: string;
  lastSeen: string;
};

export type SocialAttributionReport = {
  generatedAt: string;
  trackingEnabled: boolean;
  totalRealEvents: number | "NOT_MEASURED";
  totalExcludedTestEvents: number;
  byAttributionKey: AttributionKeyCount[] | "NOT_MEASURED";
};

function attributionKey(e: InboundSocialEvent): string {
  return [e.channel, e.campaign ?? "-", e.contentId ?? "-", e.landingPath].join("|");
}

export async function buildSocialAttributionReport(): Promise<SocialAttributionReport> {
  const trackingEnabled = isOutboundTrackingEnabled();
  const allEvents = await getInboundSocialEvents();
  const excludedCount = allEvents.filter(isExcludedSocialEvent).length;

  if (!trackingEnabled) {
    // Tracking is off site-wide -- any events currently in storage (e.g.
    // from a prior period when it was on) are historical, not a live
    // measurement of "now". Reporting anything but NOT_MEASURED here would
    // imply live measurement capability that does not currently exist.
    return {
      generatedAt: new Date().toISOString(),
      trackingEnabled,
      totalRealEvents: "NOT_MEASURED",
      totalExcludedTestEvents: excludedCount,
      byAttributionKey: "NOT_MEASURED",
    };
  }

  const realEvents = allEvents.filter((e) => !isExcludedSocialEvent(e));
  const byKey = new Map<string, AttributionKeyCount>();
  for (const e of realEvents) {
    const key = attributionKey(e);
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
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
        firstSeen: e.timestamp,
        lastSeen: e.timestamp,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    trackingEnabled,
    totalRealEvents: realEvents.length,
    totalExcludedTestEvents: excludedCount,
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
