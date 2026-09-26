import fs from "node:fs";
import { appendBrand, brandSchema } from "@/lib/authority/measurement";
import { updateLocalStore } from "@/lib/authority/store";
import { GoogleSearchConsoleClient, type SearchAnalyticsQuery } from "@/scripts/agents/seo/lib/google-search-console-client";
import baseline from "@/data/growth/authority/brand-baseline.json";
const option = (name: string) => process.argv[process.argv.indexOf(name) + 1];
export function brandQuery(start: string, end: string): SearchAnalyticsQuery {
  const test = brandSchema.safeParse({ ...baseline, window: { start, end } });
  if (!test.success || end >= new Date().toISOString().slice(0, 10)) throw new Error("Explicit completed window required");
  return { startDate: start, endDate: end, dimensions: [], type: "web", dataState: "final", rowLimit: 1,
    dimensionFilterGroups: [{ groupType: "and", filters: [{ dimension: "query", operator: "contains", expression: "miloosh" }] }] };
}
async function main() {
  let incoming: unknown = [baseline];
  if (process.argv.includes("--input")) incoming = JSON.parse(fs.readFileSync(option("--input"), "utf8"));
  if (process.argv.includes("--capture-api")) {
    const client = GoogleSearchConsoleClient.fromEnv();
    if (!client || process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY !== "sc-domain:miloosh.com") throw new Error("Expected authenticated property unavailable");
    const query = brandQuery(option("--start"), option("--end"));
    const rows = await client.querySearchAnalytics(query);
    incoming = [{ ...baseline, capturedAt: new Date().toISOString(), window: { start: query.startDate, end: query.endDate },
      scope: { ...baseline.scope, dataState: "final" }, impressions: rows[0]?.impressions ?? 0, clicks: rows[0]?.clicks ?? 0,
      source: "Authenticated GSC API aggregate filtered query contains miloosh; successful empty result=zero observable filtered metrics, not all anonymous brand demand" }];
  }
  const rows = updateLocalStore("var/growth/authority/brand-history.json", previous => appendBrand(appendBrand([], previous), incoming));
  console.log(JSON.stringify({ captures: rows.length, latest: rows.at(-1), note: "No scheduled background job created; rerunnable read-only measurement command" }));
}
if (process.argv[1]?.endsWith("brand-demand.ts")) void main().catch(() => { console.error("Brand measurement unavailable/invalid; previous history retained, no error response or credentials logged"); process.exitCode = 1; });
