import { getAllFirstPartyEvents, type FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";
import { isSyntheticOrTestEvent } from "@/scripts/analytics/report";
import { readQueue } from "@/lib/social/queue";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22/25).
 * Post-level attribution joins utm_content to the social queue, but "real"
 * is deliberately stricter than "not marked test": only sessions accepted
 * by the canonical human classifier enter the default report. Affiliate clicks
 * additionally require a prior funnel event in the same session so an isolated
 * direct POST cannot manufacture a commercial success signal.
 */
export interface PostAcquisitionRow {
  queueEntryId: string;
  topic: string;
  channel: string;
  destination: string;
  realVisitors: number;
  engaged: number;
  multiPage: number;
  commercialActions: number;
  affiliateClicks: number;
}

const ELIGIBLE_BUCKETS = new Set(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN"]);
const PRE_CLICK_FUNNEL_TYPES = new Set(["page_view", "software_view", "comparison_view", "engaged_view", "cta_impression"]);

function hasPreClickFunnelEvidence(click: Extract<FirstPartyEvent, { type: "outbound_click" }>, allEvents: readonly FirstPartyEvent[]): boolean {
  return allEvents.some(
    (event) =>
      event.sessionId === click.sessionId &&
      event.timestamp < click.timestamp &&
      PRE_CLICK_FUNNEL_TYPES.has(event.type),
  );
}

export async function buildPostAcquisitionTable(includeSynthetic = false): Promise<PostAcquisitionRow[]> {
  const [events, queue] = await Promise.all([getAllFirstPartyEvents(), readQueue()]);
  const classifications = classifySessions(events);
  const eligibleSessionIds = new Set(
    classifications.filter((classification) => ELIGIBLE_BUCKETS.has(classification.bucket)).map((classification) => classification.sessionId),
  );

  const reportEvents = includeSynthetic
    ? events
    : events.filter(
        (event) =>
          !isSyntheticOrTestEvent(event, false) &&
          eligibleSessionIds.has(event.sessionId),
      );

  const visitorsByContentId = new Map<string, Set<string>>();
  const pageViewCountByVisitor = new Map<string, number>();
  const engagedByContentId = new Map<string, Set<string>>();
  const commercialByContentId = new Map<string, Set<string>>();
  const affiliateByContentId = new Map<string, Set<string>>();
  const contentIdByVisitor = new Map<string, string>();

  const sorted = [...reportEvents].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const event of sorted) {
    if (event.type === "page_view") {
      pageViewCountByVisitor.set(event.visitorId, (pageViewCountByVisitor.get(event.visitorId) ?? 0) + 1);
      const contentId = event.utmContent;
      if (contentId && !contentIdByVisitor.has(event.visitorId)) {
        contentIdByVisitor.set(event.visitorId, contentId);
        if (!visitorsByContentId.has(contentId)) visitorsByContentId.set(contentId, new Set());
        visitorsByContentId.get(contentId)!.add(event.visitorId);
      }
    }
  }

  for (const event of sorted) {
    const contentId = contentIdByVisitor.get(event.visitorId);
    if (!contentId) continue;
    if (event.type === "engaged_view") {
      if (!engagedByContentId.has(contentId)) engagedByContentId.set(contentId, new Set());
      engagedByContentId.get(contentId)!.add(event.visitorId);
    } else if (event.type === "software_view" || event.type === "comparison_view") {
      if (!commercialByContentId.has(contentId)) commercialByContentId.set(contentId, new Set());
      commercialByContentId.get(contentId)!.add(event.visitorId);
    } else if (
      event.type === "outbound_click" &&
      event.destination === "affiliate" &&
      (includeSynthetic || hasPreClickFunnelEvidence(event, events))
    ) {
      if (!affiliateByContentId.has(contentId)) affiliateByContentId.set(contentId, new Set());
      affiliateByContentId.get(contentId)!.add(event.visitorId);
    }
  }

  const queueById = new Map(queue.map((entry) => [entry.id, entry]));
  const rows: PostAcquisitionRow[] = [];
  for (const [contentId, visitors] of visitorsByContentId.entries()) {
    const entry = queueById.get(contentId);
    for (const [channel, variant] of Object.entries(entry?.channels ?? {})) {
      const v = variant as { link?: string | null } | undefined;
      if (!v?.link) continue;
      rows.push({
        queueEntryId: contentId,
        topic: entry?.topic ?? "(unknown — queue entry not found)",
        channel,
        destination: v.link,
        realVisitors: visitors.size,
        engaged: engagedByContentId.get(contentId)?.size ?? 0,
        multiPage: [...visitors].filter((visitorId) => (pageViewCountByVisitor.get(visitorId) ?? 0) >= 2).length,
        commercialActions: commercialByContentId.get(contentId)?.size ?? 0,
        affiliateClicks: affiliateByContentId.get(contentId)?.size ?? 0,
      });
    }
  }

  return rows.sort((a, b) => b.realVisitors - a.realVisitors);
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("POST ACQUISITION = UNKNOWN — production analytics unavailable; not zero.");
    process.exitCode = 1;
    return;
  }
  const includeSynthetic = process.argv.includes("--include-synthetic");
  const rows = await buildPostAcquisitionTable(includeSynthetic);
  console.log("========================================================================================");
  console.log(" POST-LEVEL ACQUISITION TABLE (human-qualified visitors attributed via utm_content)");
  if (rows.length === 0) {
    console.log("   (no human-qualified attributable data yet)");
  } else {
    for (const row of rows) {
      console.log(`   [${row.queueEntryId.slice(0, 8)}] ${row.channel.padEnd(10)} "${row.topic}"`);
      console.log(`     visitors: ${row.realVisitors} | engaged: ${row.engaged} | multi-page: ${row.multiPage} | commercial: ${row.commercialActions} | affiliate: ${row.affiliateClicks}`);
    }
  }
  console.log("========================================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error("POST ACQUISITION = UNKNOWN — evidence read failed; not zero.");
    process.exitCode = 1;
  });
}
