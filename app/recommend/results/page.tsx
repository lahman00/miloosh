import type { Metadata } from "next";
import { Ban, Check, Compass, ThumbsUp } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SectionHeading } from "@/components/SectionHeading";
import { ButtonLink } from "@/components/ButtonLink";
import { TrackedRecommendationLink } from "@/components/recommend/TrackedRecommendationLink";
import { TrackedComparisonLink } from "@/components/recommend/TrackedComparisonLink";
import { RecommendResultsAnalytics } from "@/components/recommend/RecommendResultsAnalytics";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";
import { getCategoryName } from "@/data/categories";
import { getComparisonBySlug } from "@/lib/comparison";
import { getRecommendations } from "@/lib/recommend/engine";
import { hasAnyAnswer, searchParamsToAnswers, summarizeAnswers } from "@/lib/recommend/query";
import { recordRecommendationEvent } from "@/lib/recommend/events";
import type { ScoreFactor } from "@/lib/recommend/types";

export const metadata: Metadata = {
  title: "Your recommendations",
  // Query-driven results aren't meaningful search-engine content, and
  // every answer combination would otherwise look like a near-duplicate
  // page — noindex here, keep /recommend itself indexable.
  robots: { index: false, follow: false },
};

type ResultsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DIRECTION_STYLES: Record<ScoreFactor["direction"], string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  informational: "text-zinc-400",
};

function FactorRow({ factor }: { factor: ScoreFactor }) {
  return (
    <li className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-zinc-300">
        <span className={`font-semibold ${DIRECTION_STYLES[factor.direction]}`}>
          {factor.points > 0 ? `+${factor.points}` : factor.points}
        </span>{" "}
        {factor.label}
        <span className="block text-xs text-zinc-400">{factor.explanation}</span>
      </span>
    </li>
  );
}

export default async function RecommendResultsPage({ searchParams }: ResultsPageProps) {
  const rawParams = await searchParams;
  const answers = searchParamsToAnswers(rawParams);
  const answersSummary = summarizeAnswers(answers);

  if (!hasAnyAnswer(answers)) {
    return (
      <main className="flex flex-1 items-center justify-center py-24">
        <Container size="narrow" className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <Compass className="h-6 w-6" strokeWidth={2} />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            No answers to work with yet
          </h1>
          <p className="mt-4 max-w-md text-zinc-400">
            Go through the wizard first so we have something real to match against.
          </p>
          <ButtonLink href="/recommend" className="mt-8">
            Start the wizard
          </ButtonLink>
        </Container>
      </main>
    );
  }

  const { recommendations, confidence, confidenceNote } = getRecommendations(answers, 3);

  recordRecommendationEvent({ type: "recommendation_generated", answersSummary });
  for (const rec of recommendations) {
    recordRecommendationEvent({
      type: "recommendation_shown",
      softwareSlug: rec.software.slug,
      rank: rec.rank,
      matchPercent: rec.scoring.matchPercent,
      answersSummary,
    });
  }

  return (
    <main className="flex-1 py-16 sm:py-20">
      <RecommendResultsAnalytics
        domain={answers.primaryNeed ?? "not_sure"}
        confidence={confidence}
        resultCount={recommendations.length}
      />
      <Container>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Find your software", href: "/recommend" },
            { name: "Your recommendations" },
          ]}
        />

        <header className="mt-6 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-white min-[360px]:text-4xl sm:text-5xl">
            {confidence === "none" ? "No strong match yet" : `Your top ${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"}`}
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Ranked by a deterministic score computed from our verified dataset — no AI, no
            invented facts. Every point below is explained.
          </p>
        </header>

        {confidenceNote ? (
          <div
            className={`mt-8 max-w-2xl rounded-xl border px-5 py-4 text-sm leading-6 ${
              confidence === "none"
                ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-200"
                : "border-white/15 bg-white/5 text-zinc-300"
            }`}
          >
            {confidenceNote}
          </div>
        ) : null}

        {confidence === "none" ? (
          <div className="mt-10 max-w-md">
            <ButtonLink href="/recommend">Adjust your answers</ButtonLink>
          </div>
        ) : null}

        {answers.primaryNeed === "ecommerce_platform" ? (
          <p className="mt-6 max-w-2xl text-sm leading-6 text-zinc-300">
            This shortlist does not evaluate your existing platform, catalog, SEO migration risk, or fulfillment workflows. Before rebuilding, use the{" "}
            <TrackedInternalCtaLink href="/best-ecommerce-platform-for-small-business#store-decision-kit" sourcePath="/recommend/results" targetPath="/best-ecommerce-platform-for-small-business#store-decision-kit" ctaName="recommend-store-decision-kit" className="underline underline-offset-4">
              stay, repair, embed, or migrate decision checklist
            </TrackedInternalCtaLink>.
          </p>
        ) : null}

        <div className="mt-14 space-y-10">
          {recommendations.map((rec) => {
            const positiveFactors = rec.scoring.factors.filter((f) => f.direction === "positive");
            const negativeFactors = rec.scoring.factors.filter((f) => f.direction === "negative");
            const informationalFactors = rec.scoring.factors.filter((f) => f.direction === "informational");

            const relatedComparisons = rec.relatedComparisonSlugs
              .map((slug) => ({ slug, data: getComparisonBySlug(slug) }))
              .filter((item): item is { slug: string; data: NonNullable<ReturnType<typeof getComparisonBySlug>> } =>
                item.data !== null
              )
              .slice(0, 3);

            return (
              <Card key={rec.software.slug} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge>#{rec.rank} pick</Badge>
                      <Badge className="border-emerald-500/30 text-emerald-300">
                        {rec.scoring.matchPercent}% of scored criteria
                      </Badge>
                      <span className="text-xs uppercase tracking-wider text-zinc-400">
                        {getCategoryName(rec.software.category)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{rec.software.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                      {rec.software.description}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white">
                      {rec.explanation.whyItMatched}
                    </p>
                    {rec.explanation.tradeoff ? (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-300/90">
                        Worth knowing: {rec.explanation.tradeoff}
                      </p>
                    ) : null}
                  </div>
                  <TrackedRecommendationLink
                    slug={rec.software.slug}
                    rank={rec.rank}
                    matchPercent={rec.scoring.matchPercent}
                    answersSummary={answersSummary}
                    domain={answers.primaryNeed ?? "not_sure"}
                    href={`/software/${rec.software.slug}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    View full page
                  </TrackedRecommendationLink>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Why we recommended it
                    </h3>
                    <ul className="mt-3 divide-y divide-white/10">
                      {positiveFactors.length > 0 ? (
                        positiveFactors.map((factor) => <FactorRow key={factor.label} factor={factor} />)
                      ) : (
                        <li className="py-2 text-sm text-zinc-400">
                          No strong positive signals from your answers — this was simply the
                          closest match available.
                        </li>
                      )}
                    </ul>

                    {negativeFactors.length > 0 ? (
                      <>
                        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                          What counted against it
                        </h3>
                        <ul className="mt-3 divide-y divide-white/10">
                          {negativeFactors.map((factor) => (
                            <FactorRow key={factor.label} factor={factor} />
                          ))}
                        </ul>
                      </>
                    ) : null}

                    {informationalFactors.length > 0 ? (
                      <>
                        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                          Not used in this score
                        </h3>
                        <ul className="mt-3 divide-y divide-white/10">
                          {informationalFactors.map((factor) => (
                            <FactorRow key={factor.label} factor={factor} />
                          ))}
                        </ul>
                      </>
                    ) : null}

                    <p className="mt-4 text-xs text-zinc-400">
                      Score: {rec.scoring.totalScore} of {rec.scoring.maxPossibleScore} possible
                      points for your answers.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                      <ThumbsUp className="h-4 w-4 text-zinc-500" />
                      Pros
                    </div>
                    <ul className="mt-2 space-y-2">
                      {rec.pros.map((pro) => (
                        <li key={pro} className="flex items-start gap-2 text-sm text-zinc-400">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                          {pro}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-zinc-300">
                      <Ban className="h-4 w-4 text-zinc-500" />
                      Cons
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{rec.consDisclosure}</p>

                    {relatedComparisons.length > 0 ? (
                      <>
                        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                          See it compared
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {relatedComparisons.map(({ slug, data }) => (
                            <TrackedComparisonLink
                              key={slug}
                              comparisonSlug={slug}
                              domain={answers.primaryNeed ?? "not_sure"}
                              href={`/compare/${slug}`}
                              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                            >
                              {data.title}
                            </TrackedComparisonLink>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <section className="mt-16 border-t border-white/10 pt-14 text-center">
          <SectionHeading
            align="center"
            title="Not quite right?"
            description="Adjust your answers and get a new set of recommendations."
          />
          <ButtonLink href="/recommend" className="mt-8">
            Retake the wizard
          </ButtonLink>
        </section>
      </Container>
    </main>
  );
}
