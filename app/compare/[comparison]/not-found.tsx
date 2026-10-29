import type { Metadata } from "next";
import { GitCompare } from "lucide-react";
import { Container } from "@/components/Container";
import { ButtonLink } from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Comparison not found",
};

export default function ComparisonNotFound() {
  return (
    <main className="page-shell page-shell-centered flex flex-1 items-center justify-center">
      <Container className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
          <GitCompare className="h-6 w-6" strokeWidth={2} />
        </span>

        <h1 className="page-title">
          We don&apos;t have that comparison yet
        </h1>

        <p className="mt-4 max-w-md text-zinc-400">
          We publish a curated set of comparisons, not every possible pair. Browse the ones we do
          have.
        </p>

        <ButtonLink href="/compare" className="mt-8">
          Browse comparisons
        </ButtonLink>
      </Container>
    </main>
  );
}
