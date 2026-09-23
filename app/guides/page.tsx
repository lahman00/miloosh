import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllRoleGuides } from "@/data/guides/registry";
import { getCategoryName } from "@/data/categories";

export const metadata: Metadata = {
  title: "Software Decision Guides",
  description:
    "Browse Miloosh decision guides for common software buying, switching, and replacement decisions, with sourced product research and dated pricing notes.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  const guides = [...getAllRoleGuides()].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Decision guides"
          title="Start with the job, not the software logo"
          description={`${guides.length} practical guides for common buying and switching decisions, built from the same sourced product dataset as our comparisons.`}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${guide.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25 hover:bg-white/[0.05]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {getCategoryName(guide.categorySlug)}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">{guide.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                {guide.metaDescription}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
