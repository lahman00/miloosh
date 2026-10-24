import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { StoredOutboundEvent } from "@/lib/revenue/events";
import { loadPartnerFacts } from "@/lib/growth-agents/partners";
import { buildDailyRevenueReport, type DailyRevenueReport, type NetworkObservation, type SourceRead } from "@/lib/growth/daily-revenue-report";

/**
 * Daily revenue-evidence report (read-only).
 *
 *   MILOOSH_ENV_DIR=<dir with the production-authorized env> npm run growth:daily-report -- --live [--days 7] [--network-file f.json] [--out dir]
 *   npm run growth:daily-report -- --events-file e.json [--ledger-file l.json] [--network-file f.json]
 *
 * Reads private storage only (list + get). It never writes analytics, never opens a partner or affiliate URL and never
 * logs in to a partner network: network figures come from a file the owner or an approved session exported.
 * Without a source the report is NOT_MEASURED.
 */
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

async function readLedger(): Promise<{ events: StoredOutboundEvent[] | null; read: SourceRead }> {
  const { list, get } = await import("@vercel/blob");
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "outbound-clicks/", limit: 1000, cursor });
    paths.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
    if (page.hasMore && !cursor) return { events: null, read: { status: "PARTIAL", listed: paths.length, read: null, failed: null, note: "missing pagination cursor" } };
  } while (cursor);
  const events: StoredOutboundEvent[] = [];
  let failed = 0;
  for (const pathname of paths) {
    try {
      const response = await get(pathname, { access: "private", useCache: false });
      if (!response || response.statusCode !== 200) throw new Error("unreadable");
      events.push(JSON.parse(await new Response(response.stream).text()) as StoredOutboundEvent);
    } catch {
      failed += 1;
    }
  }
  return { events, read: { status: failed === 0 ? "COMPLETE" : "PARTIAL", listed: paths.length, read: events.length, failed } };
}

export function toMarkdown(r: DailyRevenueReport): string {
  const line = (label: string, v: unknown) => `| ${label} | ${typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)} |`;
  const out: string[] = [`# Miloosh daily revenue evidence, ${r.generatedAt.slice(0, 10)}`, "", `Window: ${r.windowDays} days, UTC. First-party read: ${r.reads.firstParty.status} (${r.reads.firstParty.read ?? "?"} of ${r.reads.firstParty.listed ?? "?"} records). Ledger read: ${r.reads.ledger.status}. captureIntegrity: ${r.captureIntegrity}.`, ""];
  for (const [name, w] of [["Current", r.current], ["Previous", r.previous]] as const) {
    out.push(`## ${name} window`);
    if (w === "NOT_MEASURED") { out.push("NOT_MEASURED (the first-party store was not read).", ""); continue; }
    out.push(`${w.start} to ${w.end}`, "", "| Metric | Value |", "|---|---|", line("Events", w.events), line("Sessions (strict / probable / excluded / total)", `${w.sessions.qualified} / ${w.sessions.probableHuman} / ${w.sessions.excluded} / ${w.sessions.total}`), line("By channel", w.byChannel), line("By device (strict / probable)", w.byViewport), line("Commercial-page sessions (strict / probable)", `${w.commercialPageSessions.qualified} / ${w.commercialPageSessions.probableHuman}`), line("CTA impression events (not people)", w.ctaImpressionEvents), line("CTA click events", w.ctaClickEvents), line("First-party outbound (affiliate / official / test-marked)", `${w.firstPartyOutbound.affiliate} / ${w.firstPartyOutbound.official} / ${w.firstPartyOutbound.testMarked}`), line("Legacy ledger (separate store)", w.ledger), "");
  }
  out.push("## Change against the previous window", JSON.stringify(r.delta), "", "## Partners", "| Partner | Payout | Site handoffs (first-party / ledger non-test / ledger test) | Network clicks | Leads | Conversions | Approved | Paid |", "|---|---|---|---|---|---|---|---|");
  for (const p of r.partners) out.push(`| ${p.slug} | ${p.payoutReadiness} | ${p.siteHandoffs.firstPartyAffiliate} / ${p.siteHandoffs.ledgerAffiliateNonTest} / ${p.siteHandoffs.ledgerTest} | ${p.network.clicks} | ${p.network.leads} | ${p.network.conversions} | ${JSON.stringify(p.network.approvedCommission)} | ${JSON.stringify(p.network.paidCommission)} |`);
  out.push("", "## Notes", ...r.statements.map((s) => `- ${s}`), "");
  return out.join("\n");
}

export async function run(): Promise<number> {
  const days = Number(arg("days") ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 30) { console.error("--days must be 1 to 30"); return 2; }
  let events: FirstPartyEvent[] | null = null;
  let ledger: StoredOutboundEvent[] | null = null;
  let firstParty: SourceRead = { status: "UNAVAILABLE", listed: null, read: null, failed: null, note: "no source given" };
  let ledgerRead: SourceRead = { status: "UNAVAILABLE", listed: null, read: null, failed: null, note: "no source given" };
  if (arg("events-file")) {
    events = JSON.parse(fs.readFileSync(arg("events-file")!, "utf8"));
    firstParty = { status: "COMPLETE", listed: events!.length, read: events!.length, failed: 0, note: "file supplied by the caller; completeness not independently verified" };
    if (arg("ledger-file")) {
      ledger = JSON.parse(fs.readFileSync(arg("ledger-file")!, "utf8"));
      ledgerRead = { status: "COMPLETE", listed: ledger!.length, read: ledger!.length, failed: 0, note: "file supplied by the caller" };
    }
  } else if (process.argv.includes("--live")) {
    loadEnvConfig(process.env.MILOOSH_ENV_DIR ?? process.cwd());
    if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error("UNAVAILABLE: no production-authorized storage token in this environment; nothing was read and nothing is reported as zero."); return 2; }
    try {
      const { getAllFirstPartyEvents } = await import("@/lib/analytics/events");
      events = await getAllFirstPartyEvents();
      firstParty = { status: "COMPLETE", listed: events.length, read: events.length, failed: 0, note: "reader throws on an incomplete listing or failed reads" };
    } catch (error) {
      firstParty = { status: "UNAVAILABLE", listed: null, read: null, failed: null, note: String(error).slice(0, 160) };
    }
    try {
      ({ events: ledger, read: ledgerRead } = await readLedger());
    } catch (error) {
      ledgerRead = { status: "UNAVAILABLE", listed: null, read: null, failed: null, note: String(error).slice(0, 160) };
    }
  } else {
    console.log(JSON.stringify({ readStatus: "NOT_MEASURED", reason: "No source given (use --live or --events-file)." }, null, 2));
    return 2;
  }
  const network: NetworkObservation[] = arg("network-file") ? JSON.parse(fs.readFileSync(arg("network-file")!, "utf8")) : [];
  const partners = loadPartnerFacts().map((p) => ({ slug: p.slug, payoutReadiness: p.payout.readiness, revenueReady: p.revenueReady }));
  const report = buildDailyRevenueReport({ now: new Date(arg("now") ?? new Date().toISOString()), windowDays: days, events, ledger, reads: { firstParty, ledger: ledgerRead }, partners, network });
  const md = toMarkdown(report);
  const outDir = arg("out");
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = report.generatedAt.slice(0, 10);
    fs.writeFileSync(path.join(outDir, `daily-revenue-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, `daily-revenue-${stamp}.md`), md);
  }
  console.log(md);
  return firstParty.status === "COMPLETE" ? 0 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().then((c) => process.exit(c));
