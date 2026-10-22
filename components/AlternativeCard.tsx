import { ArrowRight, Star } from "lucide-react";
import { Card } from "@/components/Card";
import { ButtonLink } from "@/components/ButtonLink";
import type { Alternative } from "@/data/software";

export function AlternativeCard({
  alternative,
  rank,
  showTopPick = true,
}: {
  alternative: Alternative;
  rank: number;
  showTopPick?: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-500">#{rank}</span>
        {rank === 1 && showTopPick ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-950">
            <Star className="h-3 w-3" fill="currentColor" />
            Top pick
          </span>
        ) : null}
      </div>

      <h3 className="mt-6 text-2xl font-semibold text-white">{alternative.name}</h3>
      <p className="mt-4 flex-1 leading-7 text-zinc-400">{alternative.description}</p>

      <div className="mt-6">
        <p className="text-sm font-medium text-white">Best for</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{alternative.bestFor}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {alternative.strengths.map((strength) => (
          <span
            key={strength}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
          >
            {strength}
          </span>
        ))}
      </div>

      <ButtonLink href={`/software/${alternative.slug}`} variant="secondary" className="mt-8">
        View {alternative.name}
        <ArrowRight className="h-4 w-4" />
      </ButtonLink>
    </Card>
  );
}
