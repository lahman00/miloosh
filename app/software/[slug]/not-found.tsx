import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { Container } from "@/components/Container";
import { ButtonLink } from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Software not found",
};

export default function SoftwareNotFound() {
  return (
    <main className="page-shell page-shell-centered flex flex-1 items-center justify-center">
      <Container className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
          <SearchX className="h-6 w-6" strokeWidth={2} />
        </span>

        <h1 className="page-title">
          We don&apos;t have that software yet
        </h1>

        <p className="mt-4 max-w-md text-zinc-400">
          We couldn&apos;t find alternatives for that search. Try one of the tools we already
          cover.
        </p>

        <ButtonLink href="/" className="mt-8">
          Back to search
        </ButtonLink>
      </Container>
    </main>
  );
}
