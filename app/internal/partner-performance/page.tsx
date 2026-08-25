import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { KNOWN_GSC_IMPRESSIONS } from "@/lib/growth-audit/comparison-graph";
import { getOutboundEvents, summarizeOutboundEventsByProduct } from "@/lib/revenue/events";
import { buildPartnerPerformanceRows, type GscPartnerMetric } from "@/lib/revenue/partner-performance";

export const dynamic = "force-dynamic";

function displayUnknown(value: number | null): string {
  return value == null ? "UNKNOWN" : String(value);
}

export default async function PartnerPerformancePage() {
  const events = await getOutboundEvents();
  const outboundRows = summarizeOutboundEventsByProduct(events);

  const comparisonCountBySlug: Record<string, number> = {};
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    comparisonCountBySlug[a] = (comparisonCountBySlug[a] ?? 0) + 1;
    comparisonCountBySlug[b] = (comparisonCountBySlug[b] ?? 0) + 1;
  }

  // This is intentionally labelled as a repository baseline rather than live
  // Search Console data. The outbound store is live, but its legacy rows only
  // prove non-test events; they do not carry a joinable human classifier.
  const gscBySlug: Record<string, GscPartnerMetric> = {};
  for (const [slug, impressions] of Object.entries(KNOWN_GSC_IMPRESSIONS)) {
    gscBySlug[slug] = {
      impressions,
      searchClicks: null,
      source: "repository baseline (not live GSC)",
    };
  }

  const rows = buildPartnerPerformanceRows({
    outboundRows,
    gscBySlug,
    comparisonCountBySlug,
  });

  const nonTestAffiliateEvents = rows.reduce((sum, row) => sum + row.nonTestFirstPartyAffiliateEvents, 0);
  const testEvents = rows.reduce((sum, row) => sum + row.firstPartyTestEvents, 0);
  const networkSignalPartners = rows.filter((row) => row.networkClickActivity).length;

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-10 text-zinc-100">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Internal revenue truth</p>
        <h1 className="mt-2 text-3xl font-bold">Partner performance</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
          Metric classes stay separate by design. GSC search clicks mean Google → Miloosh. Legacy first-party
          outbound rows prove non-test Miloosh → vendor events, but they do not currently prove an eligible-human
          session. Network click emails are separate evidence and are never added to first-party totals. Unknown
          human-qualified clicks, conversions, commissions and revenue remain UNKNOWN.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active partners" value={String(rows.length)} />
        <Stat label="Non-test affiliate events" value={String(nonTestAffiliateEvents)} />
        <Stat label="Excluded test events" value={String(testEvents)} />
        <Stat label="Partners with network click evidence" value={String(networkSignalPartners)} />
      </section>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Human affiliate clicks</th>
              <th className="px-4 py-3">Non-test affiliate events</th>
              <th className="px-4 py-3">All non-test outbound</th>
              <th className="px-4 py-3">Test events</th>
              <th className="px-4 py-3">Network clicks</th>
              <th className="px-4 py-3">GSC impressions</th>
              <th className="px-4 py-3">GSC clicks</th>
              <th className="px-4 py-3">Comparisons</th>
              <th className="px-4 py-3">Conversions</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
            {rows.map((row, index) => (
              <tr key={row.slug} className="align-top">
                <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-white">{row.slug}</td>
                <td className="px-4 py-3 font-mono">{row.revenueProximityScore}</td>
                <td className="px-4 py-3 font-mono">{displayUnknown(row.eligibleHumanAffiliateClicks)}</td>
                <td className="px-4 py-3 font-mono font-semibold">{row.nonTestFirstPartyAffiliateEvents}</td>
                <td className="px-4 py-3 font-mono">{row.nonTestFirstPartyOutboundEvents}</td>
                <td className="px-4 py-3 font-mono text-zinc-500">{row.firstPartyTestEvents}</td>
                <td className="px-4 py-3">
                  {row.networkClickActivity ? (
                    <span title={row.networkSignalSummary ?? undefined}>
                      {row.networkClickFloor == null ? "YES, count UNKNOWN" : `${row.networkClickFloor}+`}
                    </span>
                  ) : (
                    "none evidenced"
                  )}
                </td>
                <td className="px-4 py-3 font-mono" title={row.gscSource ?? undefined}>
                  {displayUnknown(row.gscImpressions)}
                </td>
                <td className="px-4 py-3 font-mono">{displayUnknown(row.gscSearchClicks)}</td>
                <td className="px-4 py-3 font-mono">{displayUnknown(row.comparisonCount)}</td>
                <td className="px-4 py-3">{displayUnknown(row.conversions)}</td>
                <td className="px-4 py-3">{displayUnknown(row.commissions)}</td>
                <td className="px-4 py-3">{displayUnknown(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-xs leading-5 text-zinc-500">
        Ranking uses proven downstream movement first, then classifier-qualified human affiliate clicks when such
        evidence exists. Legacy non-test first-party events receive lower weight, followed by network-side evidence,
        explicitly sourced GSC demand and comparison coverage. Repository GSC values are labelled as a baseline and
        never presented as a live Search Console pull.
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
