import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RecommendWizard } from "@/components/recommend/RecommendWizard";
import { initialRecommendAnswers } from "@/lib/recommend/query";

export const metadata: Metadata = {
  title: "Find your software",
  description:
    "Answer a few questions about your team and get 3 software recommendations — deterministic, explainable, built only from our verified dataset. No AI guessing, no invented facts.",
  alternates: { canonical: "/recommend" },
};

export default async function RecommendPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialAnswers = initialRecommendAnswers(await searchParams);

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container size="narrow">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find your software" }]} />

        <header className="mt-6 max-w-2xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Compass className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Find your software
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Answer a few questions and we&apos;ll match you against our verified dataset — no AI
            guessing, no invented facts. Every recommendation comes with the exact reasons behind
            it.
          </p>
        </header>

        <div className="mt-12">
          <RecommendWizard initialAnswers={initialAnswers} />
        </div>
      </Container>
    </main>
  );
}
