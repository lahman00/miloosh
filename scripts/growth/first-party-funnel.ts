import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { classifySessions } from "@/lib/analytics/human-classification";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { buildFunnelByLanding } from "@/lib/growth/funnel-by-landing";

/**
 * Landing page x channel funnel from first-party events (read-only).
 *
 *   npm run growth:first-party-funnel -- --events-file events.json [--out dir]
 *   npm run growth:first-party-funnel -- --live [--out dir]      (needs a production-authorized Blob token)
 *
 * Without a source the report is NOT_MEASURED, never an empty funnel. Partner conversions and commissions are read from
 * the network, not the site: pass --partner-file with {source, asOf, conversions, approvedCommissions} to include them.
 */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

export async function run(): Promise<number> {
  const eventsFile = arg("events-file");
  const live = process.argv.includes("--live");
  const outDir = arg("out");
  let events: FirstPartyEvent[];
  if (eventsFile) {
    events = JSON.parse(fs.readFileSync(eventsFile, "utf8")) as FirstPartyEvent[];
  } else if (live) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log(JSON.stringify({ readStatus: "UNAVAILABLE", reason: "No Blob token in this environment; nothing was read. This is not a zero." }, null, 2));
      return 2;
    }
    const { getAllFirstPartyEvents } = await import("@/lib/analytics/events");
    events = await getAllFirstPartyEvents();
  } else {
    console.log(JSON.stringify({ readStatus: "NOT_MEASURED", reason: "No event source given (use --events-file or --live)." }, null, 2));
    return 2;
  }
  const partnerFile = arg("partner-file");
  const partnerConversions = partnerFile ? JSON.parse(fs.readFileSync(partnerFile, "utf8")) : undefined;
  const report = buildFunnelByLanding({ events, classifications: classifySessions(events), partnerConversions });
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "first-party-funnel.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify({ readStatus: "READ", eventsRead: events.length, totals: report.totals, partnerConversions: report.partnerConversions, captureIntegrity: report.captureIntegrity, topRows: report.rows.slice(0, 15) }, null, 2));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().then((c) => process.exit(c));
