import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { appendQueries, queryObservationSchema } from "@/lib/google-war/query-store";
import { GoogleSearchConsoleClient } from "@/scripts/agents/seo/lib/google-search-console-client";

const option = (key: string, fallback: string) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
async function main() {
  const store = option("--store", "var/growth/google-command/query-page.json");
  fs.mkdirSync(path.dirname(store), { recursive: true });
  const lock = `${store}.lock`, fd = fs.openSync(lock, "wx");
  try {
    let incoming: unknown;
    if (process.argv.includes("--capture-api")) {
      const client = GoogleSearchConsoleClient.fromEnv();
      if (!client) throw new Error("Authenticated GSC API unavailable; credentials never requested or printed");
      const start = option("--start", ""), end = option("--end", "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) throw new Error("Explicit valid window required");
      const rows = await client.queryAllSearchAnalytics({ startDate: start, endDate: end, dimensions: ["query", "page"], rowLimit: 1000 }, 25000);
      const captured_at = new Date().toISOString();
      incoming = rows.map(r => ({ query: r.keys[0], page: r.keys[1], window: { start, end },
        impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position,
        captured_at, capturePrecision: "instant", source: "Authenticated Search Analytics API dimensions=[query,page]; at most 25000 available rows, not all property demand",
        evidence: "API_QUERY_PAGE", coverage: "TOP_ROWS_ONLY", scope: { property: process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY, searchType: "web", country: null, device: null, timezone: "America/Los_Angeles", dataState: "final" } }));
    } else if (process.argv.includes("--input")) {
      incoming = JSON.parse(fs.readFileSync(option("--input", ""), "utf8"));
    } else {
      const file = "docs/growth/receipts/20260926-ranking-war/query-page-map.json";
      const raw = fs.readFileSync(file, "utf8");
      const data = JSON.parse(raw) as { generatedAt: string; perPageQueries: Record<string, Array<{ query: string; impressions: number }>> };
      incoming = Object.entries(data.perPageQueries).flatMap(([page, rows]) => rows.map(r => ({
        ...r, page: `https://miloosh.com${page}`, window: { start: "2026-08-07", end: "2026-09-23" },
        clicks: null, ctr: null, position: null, captured_at: data.generatedAt, capturePrecision: "day",
        source: `${file}; sha256:${createHash("sha256").update(raw).digest("hex")}; committed record of page-filtered live UI observation, raw capture not attached`,
        evidence: "COMMITTED_PAGE_FILTERED_UI", coverage: "TOP_ROWS_ONLY",
        scope: { property: "sc-domain:miloosh.com", searchType: "web", country: null, device: null, timezone: "America/Los_Angeles", dataState: "final" },
      })));
    }
    const previous = fs.existsSync(store) ? queryObservationSchema.array().parse(JSON.parse(fs.readFileSync(store, "utf8"))) : [];
    const rows = appendQueries(previous, incoming);
    const temp = `${store}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(rows, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    fs.renameSync(temp, store);
    console.log(JSON.stringify({ store, previous: previous.length, rows: rows.length, added: rows.length - previous.length, noPageQueryInference: true }));
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
void main().catch(() => { console.error("Query-page import failed; no secrets or API response bodies logged. Check input schema, window, lock, and authenticated access."); process.exitCode = 1; });
