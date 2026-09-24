import { FIRST_REVENUE_COHORT } from "@/data/revenue/first-revenue-cohort";
import { getAllFirstPartyEvents, type FirstPartyEvent } from "@/lib/analytics/events";
import { getEligibleHumanSessionIds } from "@/lib/analytics/cta-performance";

type Row = {
  slug: string;
  gscImpressions: number;
  gscClicks: number;
  visits: number;
  ctaSeenVisitors: number;
  ctaClicks: "NOT_SEPARATELY_MEASURED";
  merchantHandoffs: number;
  verifiedDownstreamConversions: "NOT_AVAILABLE";
};

function uniqueVisitors(events: FirstPartyEvent[]): number {
  return new Set(events.map((event) => event.visitorId)).size;
}

export async function getFirstRevenueFunnel(): Promise<Row[]> {
  const events = await getAllFirstPartyEvents();
  const eligibleSessions = getEligibleHumanSessionIds(events);

  return FIRST_REVENUE_COHORT.map((entry) => {
    const path = "/software/" + entry.slug;
    const human = events.filter((event) => eligibleSessions.has(event.sessionId) && !event.isTest);

    const visits = uniqueVisitors(
      human.filter((event) => event.type === "page_view" && event.path === path),
    );

    const ctaSeenVisitors = uniqueVisitors(
      human.filter(
        (event) => event.type === "cta_impression" && event.softwareSlug === entry.slug,
      ),
    );

    const merchantHandoffs = uniqueVisitors(
      human.filter(
        (event) =>
          event.type === "outbound_click" &&
          event.softwareSlug === entry.slug &&
          event.destination === "affiliate",
      ),
    );

    return {
      slug: entry.slug,
      gscImpressions: entry.gscPageSnapshot.impressions,
      gscClicks: entry.gscPageSnapshot.clicks,
      visits,
      ctaSeenVisitors,
      ctaClicks: "NOT_SEPARATELY_MEASURED" as const,
      merchantHandoffs,
      verifiedDownstreamConversions: "NOT_AVAILABLE" as const,
    };
  });
}

async function main() {
  const rows = await getFirstRevenueFunnel();

  console.log("FIRST REVENUE PRIMARY COHORT");
  console.log("GSC = measured page-level snapshot; visits/handoffs = eligible first-party human sessions.");
  console.log("CTA clicks are not reported separately because current instrumentation records the server-confirmed outbound handoff, not a distinct client click event.");
  console.log("Verified downstream conversions require evidence from the external affiliate networks and are not inferred.");

  for (const row of rows) {
    console.log(
      [
        row.slug,
        "gsc_impressions=" + row.gscImpressions,
        "gsc_clicks=" + row.gscClicks,
        "visits=" + row.visits,
        "cta_seen_visitors=" + row.ctaSeenVisitors,
        "cta_clicks=" + row.ctaClicks,
        "merchant_handoffs=" + row.merchantHandoffs,
        "downstream_conversions=" + row.verifiedDownstreamConversions,
      ].join(" | "),
    );
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  main();
}
