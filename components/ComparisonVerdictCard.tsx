import { Card } from "@/components/Card";
import type { ComparisonVerdict } from "@/data/seo/comparison-verdicts";

/** A two-sentence decision rule and a short verdict, written from the two products' sourced data. */
export function ComparisonVerdictCard({ verdict }: { verdict: ComparisonVerdict }) {
  return (
    <Card className="decision-surface mt-10 border-white/20">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Quick verdict</h2>
      <p className="mt-3 text-lg leading-8 text-white">{verdict.rule}</p>
      <p className="mt-3 leading-7 text-zinc-400">{verdict.verdict}</p>
    </Card>
  );
}
