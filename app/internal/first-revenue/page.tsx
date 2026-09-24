import type { Metadata } from "next";
import { FIRST_REVENUE_GUIDES } from "@/data/guides/first-revenue";
import { NETWORK_PERFORMANCE_SIGNALS } from "@/data/affiliate/network-performance-signals";
import { getAllFirstPartyEvents, type FirstPartyEvent } from "@/lib/analytics/events";
import { GoogleSearchConsoleClient, type SearchAnalyticsRow } from "@/scripts/agents/seo/lib/google-search-console-client";
import { recentAndPriorWindows } from "@/scripts/agents/seo/lib/date-windows";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "First Revenue Funnel", robots: { index: false, follow: false } };

type GscPage = {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  queries: Array<{ query: string; impressions: number; clicks: number; position: number }>;
};

function uniqueSessions(events: readonly FirstPartyEvent[]): number {
  return new Set(events.map((event) => event.sessionId)).size;
}

async function loadGsc(): Promise<{ status: "real" | "unavailable"; note: string; byPath: Map<string, GscPage> }> {
  const client = GoogleSearchConsoleClient.fromEnv();
  if (!client) return { status: "unavailable", note: "Search Console env unavailable.", byPath: new Map() };
  try {
    const { recent } = recentAndPriorWindows(28);
    const [pageRows, queryRows] = await Promise.all([
      client.queryAllSearchAnalytics({ startDate: recent.startDate, endDate: recent.endDate, dimensions: ["page"], rowLimit: 5000 }),
      client.queryAllSearchAnalytics({ startDate: recent.startDate, endDate: recent.endDate, dimensions: ["query", "page"], rowLimit: 25000 }),
    ]);
    const byPath = new Map<string, GscPage>();
    for (const plan of FIRST_REVENUE_GUIDES) {
      const full = `${SITE_URL}/${plan.slug}`;
      const page = (pageRows as SearchAnalyticsRow[]).find((row) => row.keys[0] === full);
      const queries = (queryRows as SearchAnalyticsRow[])
        .filter((row) => row.keys[1] === full)
        .map((row) => ({ query: row.keys[0] ?? "", impressions: row.impressions, clicks: row.clicks, position: row.position }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);
      byPath.set(`/${plan.slug}`, {
        impressions: page?.impressions ?? 0,
        clicks: page?.clicks ?? 0,
        ctr: page?.ctr ?? 0,
        position: page?.position ?? 0,
        queries,
      });
    }
    return { status: "real", note: `Live GSC ${recent.startDate} to ${recent.endDate}.`, byPath };
  } catch (error) {
    return { status: "unavailable", note: `GSC failed: ${error instanceof Error ? error.message : String(error)}`, byPath: new Map() };
  }
}

export default async function FirstRevenueFunnelPage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return <Unavailable note="Private analytics storage unavailable." />;
  const evidence = await Promise.all([getAllFirstPartyEvents(), loadGsc()]).catch(() => null);
  if (!evidence) return <Unavailable note="Complete funnel evidence could not be loaded." />;
  const [events, gsc] = evidence;
  const realEvents = events.filter((event) => !event.isTest);

  const rows = FIRST_REVENUE_GUIDES.map((plan) => {
    const path = `/${plan.slug}`;
    const views = realEvents.filter((e) => e.type === "guide_view" && e.path === path);
    const impressions = realEvents.filter((e) => e.type === "cta_impression" && e.path === path && e.ctaLocation === "money-page-decision-card");
    const clicks = realEvents.filter((e) => e.type === "cta_click" && e.path === path && e.ctaLocation === "money-page-decision-card");
    const handoffs = realEvents.filter((e) => e.type === "outbound_click" && e.path === path && e.ctaLocation === "money-page-decision-card");
    const affiliateHandoffs = handoffs.filter((e) => e.type === "outbound_click" && e.destination === "affiliate");
    const networkSignals = NETWORK_PERFORMANCE_SIGNALS.filter((signal) => plan.activePartnerSlugs.includes(signal.partnerSlug));
    return {
      plan,
      path,
      gsc: gsc.byPath.get(path),
      guideSessions: uniqueSessions(views),
      ctaImpressions: impressions.length,
      ctaClicks: clicks.length,
      ctaClickSessions: uniqueSessions(clicks),
      merchantHandoffs: handoffs.length,
      affiliateHandoffs: affiliateHandoffs.length,
      networkSignals,
    };
  });

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-10 text-zinc-100">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">First Revenue Sprint</p>
        <h1 className="mt-2 text-3xl font-bold">Decision-stage funnel</h1>
        <p className="mt-3 max-w-5xl text-sm leading-6 text-zinc-400">
          Five money pages only. Stages stay separate: GSC impressions, guide sessions, visible primary CTA,
          browser CTA click, then server-recorded merchant handoff. A handoff does not prove the vendor page finished loading.
          Conversion stays NOT_MEASURED until verified downstream partner evidence exists.
        </p>
        <p className="mt-2 text-xs text-zinc-500">GSC: {gsc.status} - {gsc.note}</p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-[1300px] w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Money page</th><th className="px-4 py-3">GSC impr.</th><th className="px-4 py-3">GSC clicks</th>
              <th className="px-4 py-3">Guide sessions</th><th className="px-4 py-3">CTA impressions</th><th className="px-4 py-3">CTA clicks</th>
              <th className="px-4 py-3">Merchant handoffs</th><th className="px-4 py-3">Affiliate handoffs</th>
              <th className="px-4 py-3">Network evidence</th><th className="px-4 py-3">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
            {rows.map((row) => (
              <tr key={row.path} className="align-top">
                <td className="px-4 py-3"><a className="font-semibold text-white hover:underline" href={row.path}>{row.plan.label}</a><div className="mt-1 font-mono text-xs text-zinc-500">{row.path}</div></td>
                <td className="px-4 py-3 font-mono">{gsc.status === "real" ? row.gsc?.impressions ?? 0 : "NOT_MEASURED"}</td>
                <td className="px-4 py-3 font-mono">{gsc.status === "real" ? row.gsc?.clicks ?? 0 : "NOT_MEASURED"}</td>
                <td className="px-4 py-3 font-mono">{row.guideSessions}</td><td className="px-4 py-3 font-mono">{row.ctaImpressions}</td>
                <td className="px-4 py-3 font-mono">{row.ctaClicks} / {row.ctaClickSessions} sessions</td>
                <td className="px-4 py-3 font-mono">{row.merchantHandoffs}</td><td className="px-4 py-3 font-mono">{row.affiliateHandoffs}</td>
                <td className="px-4 py-3 text-xs text-zinc-400">{row.networkSignals.length ? row.networkSignals.map((signal) => `${signal.partnerSlug}: ${signal.clickFloor ?? "unknown"}+`).join(" / ") : "none evidenced"}</td>
                <td className="px-4 py-3 font-semibold text-amber-300">NOT_MEASURED</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        {rows.map((row) => (
          <article key={`queries-${row.path}`} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="font-semibold text-white">{row.plan.label}</h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Decision-stage query set</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">{row.plan.decisionQueries.map((query) => <li key={query}>- {query}</li>)}</ul>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Queries surfaced in GSC</p>
            {row.gsc?.queries.length ? (
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {row.gsc.queries.map((query) => <li key={query.query}>- {query.query} - {query.impressions} impr / {query.clicks} clk / pos {query.position.toFixed(1)}</li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-zinc-500">{gsc.status === "real" ? "No GSC query rows in this 28-day window." : "NOT_MEASURED"}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}

function Unavailable({ note }: { note: string }) {
  return <main className="mx-auto max-w-5xl px-6 py-10 text-zinc-100"><h1 className="text-3xl font-bold">First Revenue Funnel</h1><p role="alert" className="mt-4 text-amber-300">UNKNOWN - {note} Missing evidence is not treated as zero.</p></main>;
}
