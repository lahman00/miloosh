import { Card } from "@/components/Card";
import type { ComparisonData } from "@/lib/comparison";

/** Head-to-head summary table, used by app/compare/[comparison]/page.tsx. */
export function ComparisonTable({ data }: { data: ComparisonData }) {
  return (
    <Card>
      <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-4">
        <span className="text-sm text-zinc-400">Comparing</span>
        <span className="text-center font-semibold text-white">{data.softwareA.name}</span>
        <span className="text-center font-semibold text-white">{data.softwareB.name}</span>
      </div>

      <div className="divide-y divide-white/10">
        {data.rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-4 py-4">
            <span className="text-sm text-zinc-400">{row.label}</span>
            <span className="text-center text-sm text-zinc-300">{row.a}</span>
            <span className="text-center text-sm text-zinc-300">{row.b}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
