import { Card } from "@/components/Card";
import type { Software } from "@/data/software";
import { buildPricingRows } from "@/lib/comparison-v2";

/** Pricing facts of the two products side by side, with the date and the official page each came from. */
export function ComparisonPricingTable({ softwareA, softwareB }: { softwareA: Software; softwareB: Software }) {
  const rows = buildPricingRows(softwareA, softwareB);
  if (!rows) return null;
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold tracking-tight text-white">Pricing at a glance</h2>
      <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
        Taken from each vendor&apos;s own pricing page on the date shown. Prices change; confirm the plan you need on the vendor&apos;s site.
      </p>
      <Card className="mt-8">
        <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-4">
          <span className="text-sm text-zinc-400">Plan facts</span>
          <span className="text-center font-semibold text-white">{softwareA.name}</span>
          <span className="text-center font-semibold text-white">{softwareB.name}</span>
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-3 gap-4 py-4">
              <span className="text-sm text-zinc-400">{row.label}</span>
              <span className="text-center text-sm text-zinc-300">{row.a}</span>
              <span className="text-center text-sm text-zinc-300">{row.b}</span>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4 py-4">
            <span className="text-sm text-zinc-400">Official pricing page</span>
            {[softwareA, softwareB].map((software) => (
              <span key={software.slug} className="text-center text-sm">
                <a href={software.pricing!.officialSource} target="_blank" rel="noopener noreferrer" className="break-all text-zinc-300 underline underline-offset-4 hover:text-white">
                  {new URL(software.pricing!.officialSource!).hostname.replace(/^www\./, "")}
                </a>
              </span>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
