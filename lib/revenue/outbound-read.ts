import fs from "node:fs";
import path from "node:path";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

export type OutboundReadResult = {
  status: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
  backend: "blob" | "local";
  events: StoredOutboundEvent[];
  recordsListed: number;
  failedReads: number;
  listingComplete: boolean;
};

function validEvent(value: unknown): value is StoredOutboundEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return ["official_site_click", "affiliate_link_click", "vendor_link_click"].includes(String(e.type))
    && ["official", "affiliate"].includes(String(e.destination))
    && typeof e.softwareSlug === "string" && e.softwareSlug.length > 0
    && typeof e.url === "string" && /^https?:\/\//.test(e.url)
    && typeof e.sourcePage === "string" && e.sourcePage.startsWith("/")
    && typeof e.timestamp === "string" && Number.isFinite(Date.parse(e.timestamp))
    && (e.isTest === undefined || typeof e.isTest === "boolean");
}

/** Read-only: preserve partial-read evidence; never turn a storage error into zero traffic. */
export async function readOutboundEventsDetailed(): Promise<OutboundReadResult> {
  const backend = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
  const result: OutboundReadResult = {
    status: "UNAVAILABLE", backend, events: [], recordsListed: 0, failedReads: 0, listingComplete: false,
  };
  if (backend === "local") {
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(path.join(process.cwd(), "var", "outbound-clicks.json"), "utf8"));
      if (!Array.isArray(raw)) return result;
      result.recordsListed = raw.length;
      result.events = raw.filter(validEvent);
      result.failedReads = raw.length - result.events.length;
      result.listingComplete = true;
    } catch { return result; }
  } else {
    const paths = new Set<string>();
    try {
      const { list, get } = await import("@vercel/blob");
      const cursors = new Set<string>();
      let cursor: string | undefined;
      for (let page = 0; page < 20; page++) {
        const batch = await list({ prefix: "outbound-clicks/", limit: 500, cursor });
        for (const blob of batch.blobs) paths.add(blob.pathname);
        if (!batch.hasMore) { result.listingComplete = true; break; }
        if (!batch.cursor || cursors.has(batch.cursor)) break;
        cursors.add(batch.cursor);
        cursor = batch.cursor;
      }
      result.recordsListed = paths.size;
      const names = [...paths];
      for (let offset = 0; offset < names.length; offset += 10) {
        await Promise.all(names.slice(offset, offset + 10).map(async (pathname) => {
          try {
            const blob = await get(pathname, { access: "private", useCache: false });
            if (!blob || blob.statusCode !== 200) { result.failedReads++; return; }
            const value: unknown = JSON.parse(await new Response(blob.stream).text());
            if (validEvent(value)) result.events.push(value);
            else result.failedReads++;
          } catch { result.failedReads++; }
        }));
      }
    } catch {
      // A list failure is distinct from an empty, successfully read store.
      result.recordsListed = paths.size;
      result.failedReads += Math.max(1, paths.size - result.events.length);
      result.status = paths.size || result.events.length ? "PARTIAL" : "UNAVAILABLE";
      return result;
    }
  }
  result.events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  result.status = result.listingComplete && result.failedReads === 0 ? "COMPLETE" : "PARTIAL";
  return result;
}

export type OutboundLedgerCounts = {
  stored: number;
  test: number;
  explicitNonTest: number;
  unclassified: number;
  affiliateNonTest: number;
  officialNonTest: number;
  vendorNonTest: number;
};

/** Events only. isTest=false is NOT proof of a human, a conversion, or revenue. */
export function countOutboundLedger(events: StoredOutboundEvent[], start?: string, end?: string): OutboundLedgerCounts {
  const lo = start === undefined ? -Infinity : Date.parse(start);
  const hi = end === undefined ? Infinity : Date.parse(end);
  if (Number.isNaN(lo) || Number.isNaN(hi) || hi < lo) throw new Error("Invalid reporting window");
  const out: OutboundLedgerCounts = { stored: 0, test: 0, explicitNonTest: 0, unclassified: 0, affiliateNonTest: 0, officialNonTest: 0, vendorNonTest: 0 };
  for (const e of events) {
    const t = Date.parse(e.timestamp);
    if (!Number.isFinite(t) || t < lo || t >= hi) continue;
    out.stored++;
    if (e.isTest === true) { out.test++; continue; }
    if (e.isTest !== false) { out.unclassified++; continue; }
    out.explicitNonTest++;
    if (e.type === "affiliate_link_click") out.affiliateNonTest++;
    else if (e.type === "official_site_click") out.officialNonTest++;
    else out.vendorNonTest++;
  }
  return out;
}

export function formatOutboundLedger(read: OutboundReadResult, now = new Date()): string {
  const nowMs = now.getTime();
  const day = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const windows: [string, string | undefined, string | undefined][] = [
    ["TODAY UTC", iso(day), iso(nowMs + 1)],
    ["YESTERDAY UTC", iso(day - 86400000), iso(day)],
    ["LAST 7 DAYS", iso(nowMs - 7 * 86400000), iso(nowMs + 1)],
    ["LAST 30 DAYS", iso(nowMs - 30 * 86400000), iso(nowMs + 1)],
    ["ALL TIME", undefined, iso(nowMs + 1)],
  ];
  const lines = ["OUTBOUND EVENT LEDGER (separate from identified first-party visitors)",
    `Read status: ${read.status}; backend: ${read.backend}; listed: ${read.recordsListed}; failed: ${read.failedReads}`,
    "Events are not unique people, conversions, or revenue. Do not add this store to first-party counts: overlap is unknown."];
  if (read.status === "UNAVAILABLE") return [...lines, "Counts: UNAVAILABLE, not zero."].join("\n");
  if (read.status === "PARTIAL") lines.push("INCOMPLETE READ: counts below cover readable records only; do not use as complete totals.");
  for (const [label, start, end] of windows) {
    const c = countOutboundLedger(read.events, start, end);
    lines.push(`${label}: stored=${c.stored}; test=${c.test}; explicit_non_test=${c.explicitNonTest}; unclassified=${c.unclassified}; affiliate_non_test=${c.affiliateNonTest}; official_non_test=${c.officialNonTest}; vendor_non_test=${c.vendorNonTest}`);
  }
  return lines.join("\n");
}
