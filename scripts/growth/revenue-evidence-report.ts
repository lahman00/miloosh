/** Read-only evidence collector. Never writes analytics or visits affiliate destinations. */
import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { list, get } from "@vercel/blob";
import { classifySessions, classifyVisitors, summarizeBuckets } from "@/lib/analytics/human-classification";
import { isLegacyContaminatedSession } from "@/lib/analytics/legacy-contaminated-sessions";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { getAllSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { readLatestSeoFactoryRun, readSeoExperiments } from "@/lib/seo-factory/store";

async function main() {
  loadEnvConfig(process.env.MILOOSH_ENV_DIR ?? process.cwd());
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Authenticated Blob access is required; refusing a local/zero-traffic fallback.");
  const capturedAt = new Date().toISOString();
  const files: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "first-party-analytics/", limit: 1000, cursor });
    files.push(...page.blobs.map((b) => b.pathname));
    if (files.length > 10000) throw new Error("Read budget exceeded. No incomplete dataset will be called complete.");
    cursor = page.hasMore ? page.cursor : undefined;
    if (page.hasMore && !cursor) throw new Error("Missing pagination cursor.");
  } while (cursor);
  const events: FirstPartyEvent[] = [];
  let next = 0;
  let failedReads = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (next < files.length) {
      const file = files[next++];
      try {
        const response = await get(file, { access: "private", useCache: false });
        if (!response || response.statusCode !== 200) throw new Error("Unreadable event");
        const event = JSON.parse(await new Response(response.stream).text()) as FirstPartyEvent;
        if (!event.type || !event.timestamp || !event.visitorId || !event.sessionId) throw new Error("Invalid event shape");
        events.push(event);
      } catch { failedReads++; }
    }
  }));
  const sessions = classifySessions(events);
  const bySession = new Map(sessions.map((s) => [s.sessionId, s.bucket]));
  const qualified = events.filter((e) => !e.isTest && !isLegacyContaminatedSession(e.sessionId) && ["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE"].includes(bySession.get(e.sessionId) ?? ""));
  const sevenDayStart = new Date(Date.parse(capturedAt) - 7 * 86400000).toISOString();
  const last7 = qualified.filter((e) => e.timestamp >= sevenDayStart && e.timestamp <= capturedAt);
  const unique = (es: FirstPartyEvent[]) => new Set(es.map((e) => e.visitorId)).size;
  const summary = (es: FirstPartyEvent[]) => ({ visitors: unique(es), sessions: new Set(es.map((e) => e.sessionId)).size, pageViews: es.filter((e) => e.type === "page_view").length, outboundClickers: unique(es.filter((e) => e.type === "outbound_click")), affiliateClickers: unique(es.filter((e) => e.type === "outbound_click" && e.destination === "affiliate")) });
  const software = getAllSoftware();
  const partners = ACTIVE_PARTNERS.map((p) => {
    const eligibleClicks = qualified.filter((e) => e.type === "outbound_click" && e.softwareSlug === p.slug);
    return { slug: p.slug, canonicalStatus: p.status, hasVerifiedLink: Boolean(p.affiliateUrl), pricingSource: software.find((s) => s.slug === p.slug)?.pricing?.officialSource ?? null, historicalQualifiedClickers: unique(eligibleClicks), qualifiedClicks: eligibleClicks.length, last7dClickers: unique(eligibleClicks.filter((e) => e.timestamp >= sevenDayStart)), signups: null, paidConversions: null, commissions: null };
  });
  const seo = await readLatestSeoFactoryRun();
  const experiments = await readSeoExperiments();
  const report = { capturedAt, analytics: { source: "authenticated private Blob, fully paginated metadata and bounded reads", listedFiles: files.length, readEvents: events.length, failedReads, complete: failedReads === 0, classification: "Behavioral classification is evidence, not verified person identity. Raw and unresolved traffic are not called human growth.", buckets: summarizeBuckets(sessions), visitorBuckets: Object.fromEntries([...new Set(classifyVisitors(sessions).map((v) => v.bucket))].map((bucket) => [bucket, classifyVisitors(sessions).filter((v) => v.bucket === bucket).length])), period: { start: sevenDayStart, end: capturedAt }, classifiedStrongAllTime: summary(qualified), classifiedStrongLast7Days: summary(last7) }, partners, seo: seo ? { generatedAt: seo.generatedAt, window: seo.window, gscRowsAnalyzed: seo.gscRowsAnalyzed, inventory: seo.inventory, comparisonDiagnosis: seo.comparisonDiagnosis, actionCounts: seo.actionCounts, opportunities: seo.opportunities } : null, experiments: experiments.map((e) => ({ id: e.id, page: e.page, decision: e.decision, recordedAt: e.recordedAt })) };
  const output = path.join("var", "agents", "revenue-evidence-2026-09-10.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, capturedAt, analytics: report.analytics, partners }, null, 2));
  if (failedReads) process.exitCode = 2;
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Evidence collection failed"); process.exitCode = 1; });
