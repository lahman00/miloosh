import { Card } from "@/components/Card";
import type { Software } from "@/data/software";
import type { FirstRevenueCohortEntry } from "@/data/revenue/first-revenue-cohort";

export function FirstRevenueDecisionPanel({ software, cohort }: { software: Software; cohort: FirstRevenueCohortEntry }) {
  return (
    <section className="mt-10">
      <Card>
        <h2 className="text-2xl font-semibold text-white">Should you choose {software.name}?</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-white">Choose it if</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {cohort.chooseIf.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white">Skip it if</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {cohort.skipIf.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </Card>
    </section>
  );
}
