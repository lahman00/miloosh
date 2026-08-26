import type { Metadata } from "next";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { computeCtaPlacementPerformance } from "@/lib/analytics/cta-performance";
import { diagnoseCtaPlacement } from "@/lib/analytics/cta-placement-diagnosis";

export const metadata: Metadata = {
  title: "CTA Performance | Miloosh Internal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function displayRate(value: number | "NOT_MEASURED"): string {
  return value === "NOT_MEASURED" ? value : `${value}%`;
}

export default async function CtaPerformancePage() {
  const events = await getAllFirstPartyEvents();
  const rows = computeCtaPlacementPerformance(events);
  const diagnosed = rows.map((row) => ({ row, diagnosis: diagnoseCtaPlacement(row) }));

  const totalPlacementExposureSessions = rows.reduce((sum, row) => sum + row.humanImpressionSessions, 0);
  const matchedClickSessions = rows.reduce((sum, row) => sum + row.humanClickSessionsWithPriorImpression, 0);
  const leakCount = diagnosed.filter(({ diagnosis }) => diagnosis.status === "LEAK").length;
  const workingCount = diagnosed.filter(({ diagnosis }) => diagnosis.status === "WORKING").length;

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-10 text-zinc-100">
      <header className="mb-8 max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Revenue conversion telemetry</p>
        <h1 className="mt-2 text-3xl font-bold">CTA placement performance</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Classifier-qualified CTA impressions joined to outbound clicks by the same session, software and exact CTA
          placement. A click only enters the numerator when a prior impression exists, so a direct POST to the click
          endpoint cannot inflate CTR. QA, known automation, suspicious and unresolved sessions are excluded.
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          WAIT/WATCH/LEAK are conservative operating heuristics, not statistical significance claims. Placement exposure
          sessions are summed by placement and may include the same human session more than once when it saw multiple
          CTA locations.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Measured placements" value={String(rows.length)} />
        <Stat label="Placement exposure sessions" value={String(totalPlacementExposureSessions)} />
        <Stat label="Matched click sessions" value={String(matchedClickSessions)} />
        <Stat label="Working placements" value={String(workingCount)} />
        <Stat label="Leak candidates" value={String(leakCount)} />
      </section>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
          No classifier-qualified CTA impressions are measured yet. Do not infer a zero CTR until real eligible-human
          exposure exists.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Software</th>
                <th className="px-4 py-3">Placement</th>
                <th className="px-4 py-3">Human impression sessions</th>
                <th className="px-4 py-3">Human impression visitors</th>
                <th className="px-4 py-3">Matched click sessions</th>
                <th className="px-4 py-3">Affiliate click sessions</th>
                <th className="px-4 py-3">Official click sessions</th>
                <th className="px-4 py-3">Seen to click</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
              {diagnosed.map(({ row, diagnosis }) => (
                <tr key={`${row.softwareSlug}:${row.ctaLocation}`} className="align-top">
                  <td className="px-4 py-3 font-semibold text-white">{row.softwareSlug}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">{row.ctaLocation}</td>
                  <td className="px-4 py-3 font-mono">{row.humanImpressionSessions}</td>
                  <td className="px-4 py-3 font-mono">{row.humanImpressionVisitors}</td>
                  <td className="px-4 py-3 font-mono">{row.humanClickSessionsWithPriorImpression}</td>
                  <td className="px-4 py-3 font-mono">{row.affiliateClickSessionsWithPriorImpression}</td>
                  <td className="px-4 py-3 font-mono">{row.officialClickSessionsWithPriorImpression}</td>
                  <td className="px-4 py-3 font-mono">{displayRate(row.seenToClickRatePercent)}</td>
                  <td className="px-4 py-3 font-semibold">{diagnosis.status}</td>
                  <td className="max-w-md px-4 py-3 text-zinc-300">{diagnosis.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
