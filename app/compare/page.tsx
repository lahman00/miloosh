import type { Metadata } from "next";
import { GitCompare } from "lucide-react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SectionHeading } from "@/components/SectionHeading";
import { SearchForm } from "@/components/SearchForm";
import { CompareGrid } from "@/components/CompareGrid";
import { JsonLd } from "@/components/JsonLd";
import { getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import {
  GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS,
  shouldPrioritizeComparisonDiscovery,
} from "@/data/seo/gsc-sitemap-comparison-cohort";
import { getCategoryName } from "@/data/categories";
import { getBreadcrumbJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Compare software",
  description:
    "Side-by-side comparisons of popular software tools — features, platforms, and positioning sourced from each vendor's own site.",
  alternates: { canonical: "/compare" },
};

const explicitDiscoveryPriority = new Map<string, number>(
  GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS.map((slug, index) => [slug, index])
);

export default function ComparePage() {
  const comparisons = PUBLISHED_COMPARISONS.map(([slugA, slugB], sourceIndex) => {
    const softwareA = getSoftware(slugA);
    const softwareB = getSoftware(slugB);
    if (!softwareA || !softwareB) return null;
    const comparisonSlug = getComparisonSlug(slugA, slugB);
    return {
      softwareA,
      softwareB,
      sourceIndex,
      explicitDiscoveryPriority: explicitDiscoveryPriority.get(comparisonSlug) ?? null,
      discoveryPriority: shouldPrioritizeComparisonDiscovery(comparisonSlug),
    };
  })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort(
      (a, b) => {
        const aRank = a.explicitDiscoveryPriority ?? Number.POSITIVE_INFINITY;
        const bRank = b.explicitDiscoveryPriority ?? Number.POSITIVE_INFINITY;
        return (
          aRank - bRank ||
          Number(b.discoveryPriority) - Number(a.discoveryPriority) ||
          a.sourceIndex - b.sourceIndex
        );
      }
    );

  return (
    <main className="flex-1 py-16 sm:py-20">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Compare", url: `${SITE_URL}/compare` },
        ])}
      />

      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Compare" }]} />

        <header className="mt-6 max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <GitCompare className="h-5 w-5" strokeWidth={2.25} />
          </span>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Compare software
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-400">
            A curated set of head-to-head comparisons — not every possible pair, just the ones
            people actually search for. Every fact comes from each vendor&apos;s own official
            site.
          </p>
        </header>

        <section className="mt-14">
          <SectionHeading
            title={`${comparisons.length} comparisons`}
            description="Pick a pair below to see a full side-by-side breakdown, or filter to find one fast."
          />

          <div className="mt-8">
            <CompareGrid
              items={comparisons.map(({ softwareA, softwareB }) => ({
                slugA: softwareA.slug,
                nameA: softwareA.name,
                slugB: softwareB.slug,
                nameB: softwareB.name,
                categoryLabel:
                  getCategoryName(softwareA.category) === getCategoryName(softwareB.category)
                    ? getCategoryName(softwareA.category)
                    : `${getCategoryName(softwareA.category)} · ${getCategoryName(softwareB.category)}`,
              }))}
            />
          </div>
        </section>

        <section className="mt-16 border-t border-white/10 pt-14 text-center">
          <SectionHeading
            align="center"
            title="Comparing something else?"
            description="Search any software by name to see its alternatives."
          />
          <div className="mx-auto mt-8 max-w-2xl">
            <SearchForm />
          </div>
        </section>
      </Container>
    </main>
  );
}
