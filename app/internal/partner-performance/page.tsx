import { NETWORK_PERFORMANCE_SIGNALS } from "@/data/affiliate/network-performance-signals";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { computeMoneyPriorityQueue } from "@/lib/growth/money-priority-engine";
import { readOutboundEventsDetailed } from "@/lib/revenue/outbound-read";
import { readLatestSeoFactoryRun } from "@/lib/seo-factory/store";

export const dynamic = "force-dynamic";

function displayMeasured(value: number | "NOT_MEASURED"): string {
  return value === "NOT_MEASURED" ? value : String(value);
}

function displayNetwork(row: { networkClickActivity: boolean; networkClickFloor: number | null; networkEvidenceSummary: string | null }): string {
  if (!row.networkClickActivity) return "none evidenced";
  return row.networkClickFloor == null ? "YES, count UNKNOWN" : `${row.networkClickFloor}+`;
}

export default async function PartnerPerformancePage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return <Unavailable />;
  const evidence = await Promise.all([
    getAllFirstPartyEvents(),
    readOutboundEventsDetailed(),
    readLatestSeoFactoryRun(),
  ]).catch(() => null);
  if (!evidence || evidence[1].status !== "COMPLETE") return <Unavailable />;
  const [firstPartyEvents, revenueRead, seoRun] = evidence;
  const revenueLogEvents = revenueRead.events;

  const queue = computeMoneyPriorityQueue(firstPartyEvents, seoRun?.opportunities ?? [], revenueLogEvents, NETWORK_PERFORMANCE_SIGNALS);
  const humanAffiliateClicks = queue.reduce((sum, row) => sum + row.eligibleHumanAffiliateClicks, 0);
  const uniqueHumanClickers = queue.reduce((sum, row) => sum + row.uniqueEligibleHumanClickers, 0);
  const revenueLogClicks = queue.reduce((sum, row) => sum + row.revenueLogRealAffiliateClicks, 0);
  const revenueLogTests = queue.reduce((sum, row) => sum + row.revenueLogTestClicks, 0);
  const networkSignalPartners = queue.filter((row) => row.networkClickActivity).length;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-10 text-zinc-100">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Canonical revenue priority</p>
        <h1 className="mt-2 text-3xl font-bold">Partner performance</h1>
        <p className="mt-3 max-w-5xl text-sm leading-6 text-zinc-400">
          This page uses the same canonical Money Priority Engine as the CLI report. Human affiliate clicks come from
          first-party analytics joined to the canonical session classifier. The separate revenue log has no session
          identity and is shown independently. Network-side click emails are also separate evidence. GSC values come
          from the latest SEO Factory run when one exists. None of these click classes are added together.
        </p>
        <p className="mt-2 max-w-5xl text-xs leading-5 text-zinc-500">
          The priority score may award a separately-labelled network-evidence bonus because vendor-reported click
          activity is commercially actionable. That bonus never increments first-party click counts and never proves
          a conversion, commission or revenue event.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          SEO source: {seoRun ? `SEO Factory run ${seoRun.generatedAt}` : "NOT_MEASURED — no SEO Factory run available"}
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Active partners" value={String(queue.length)} />
        <Stat label="Eligible-human affiliate clicks" value={String(humanAffiliateClicks)} />
        <Stat label="Unique eligible clickers" value={String(uniqueHumanClickers)} />
        <Stat label="Separate revenue-log clicks" value={String(revenueLogClicks)} />
        <Stat label="Revenue-log test clicks" value={String(revenueLogTests)} />
        <Stat label="Network-signal partners" value={String(networkSignalPartners)} />
      </section>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Priority score</th>
              <th className="px-4 py-3">Network bonus</th>
              <th className="px-4 py-3">Readiness</th>
              <th className="px-4 py-3">Human aff. clicks</th>
              <th className="px-4 py-3">Unique human clickers</th>
              <th className="px-4 py-3">Revenue-log clicks</th>
              <th className="px-4 py-3">Revenue-log tests</th>
              <th className="px-4 py-3">Network clicks</th>
              <th className="px-4 py-3">Human page sessions</th>
              <th className="px-4 py-3">GSC impressions</th>
              <th className="px-4 py-3">GSC clicks</th>
              <th className="px-4 py-3">GSC pos.</th>
              <th className="px-4 py-3">Comparisons</th>
              <th className="px-4 py-3">Guide</th>
              <th className="px-4 py-3">Pricing CTA</th>
              <th className="px-4 py-3">Next intervention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
            {queue.map((row, index) => (
              <tr key={row.slug} className="align-top">
                <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-white">{row.name}</td>
                <td className="px-4 py-3 font-mono">{row.score}</td>
                <td className="px-4 py-3 font-mono">{row.scoreBreakdown.networkEvidence ?? 0}</td>
                <td className="px-4 py-3">{row.revenueReadiness}</td>
                <td className="px-4 py-3 font-mono font-semibold">{row.eligibleHumanAffiliateClicks}</td>
                <td className="px-4 py-3 font-mono">{row.uniqueEligibleHumanClickers}</td>
                <td className="px-4 py-3 font-mono">{row.revenueLogRealAffiliateClicks}</td>
                <td className="px-4 py-3 font-mono text-zinc-500">{row.revenueLogTestClicks}</td>
                <td className="px-4 py-3" title={row.networkEvidenceSummary ?? undefined}>{displayNetwork(row)}</td>
                <td className="px-4 py-3 font-mono">{row.eligibleHumanPageSessions}</td>
                <td className="px-4 py-3 font-mono">{displayMeasured(row.gscImpressions)}</td>
                <td className="px-4 py-3 font-mono">{displayMeasured(row.gscClicks)}</td>
                <td className="px-4 py-3 font-mono">{displayMeasured(row.gscAvgPosition)}</td>
                <td className="px-4 py-3 font-mono">{row.comparisonCoverage}</td>
                <td className="px-4 py-3">{row.hasDecisionGuideCoverage ? "yes" : "no"}</td>
                <td className="px-4 py-3">{row.hasPricingCtaCoverage ? "yes" : "no"}</td>
                <td className="max-w-md px-4 py-3 text-zinc-300">{row.nextIntervention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-xs leading-5 text-zinc-500">
        Revenue-log clicks are non-test events from the separate legacy revenue sink. They are not treated as
        eligible-human evidence because that sink intentionally stores no visitorId/sessionId. Vendor/network click
        signals remain separate evidence. Conversion, commission and revenue remain unverified until first-party
        network evidence exists.
      </p>
    </main>
  );
}

function Unavailable() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-zinc-100">
      <h1 className="text-3xl font-bold">Partner performance</h1>
      <p role="alert" className="mt-4 text-amber-300">
        UNKNOWN — complete production analytics are unavailable. This is not zero traffic or revenue.
        No evidence-based priority ranking can be calculated from an unavailable or partial read.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
