import fs from "node:fs";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { eventExportSchema } from "@/lib/authority/inputs";
import deployment from "@/docs/growth/receipts/20260927-production-release/deployment.json";

/** Thin read-only adapter around the existing paginated, fail-closed reader.
 * Never pulls credentials, falls back to local zeros, writes Blob or logs IDs. */
export async function captureOperationsEvents() {
  if (!process.argv.includes("--read-only") || !process.env.BLOB_READ_WRITE_TOKEN || /SENSITIVE|REDACTED/.test(process.env.BLOB_READ_WRITE_TOKEN))
    throw new Error("Explicit read-only flag and existing authorized store required");
  const events = await getAllFirstPartyEvents(); // Incomplete listings/objects throw.
  const end = new Date().toISOString();
  const bundle = eventExportSchema.parse({ coverage: "COMPLETE", fullHistory: true,
    start: deployment.promotedAt, end, events });
  const out = "var/growth/operations";
  fs.mkdirSync(out, { recursive: true });
  const file = `${out}/events-${end.replaceAll(":", "-")}.json`;
  fs.writeFileSync(file, JSON.stringify(bundle), { flag: "wx", mode: 0o600 });
  const temp = `${out}/events.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(bundle), { flag: "wx", mode: 0o600 });
  fs.renameSync(temp, `${out}/events.json`);
  return { capturedAt: end, source: "Existing canonical-project local Blob credential; no env pull", coverage: "COMPLETE", records: events.length,
    eventWindow: { start: bundle.start, end }, rawEvidence: "Private ignored var/growth/operations/events.json (0600), not a public/committed export", externalWrites: 0 };
}
if (process.argv[1]?.endsWith("capture-operations-events.ts")) void captureOperationsEvents().then(result => console.log(JSON.stringify(result))).catch(() => {
  console.error("Operations event capture unavailable/incomplete; prior evidence retained, not zero. No credentials or raw errors logged."); process.exitCode = 1;
});
