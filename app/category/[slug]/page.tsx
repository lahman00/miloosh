import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Compass, GitCompare, LayoutGrid } from "lucide-react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SectionHeading } from "@/components/SectionHeading";
import { SoftwareCard } from "@/components/SoftwareCard";
import { Card } from "@/components/Card";
import { ButtonLink } from "@/components/ButtonLink";
import { JsonLd } from "@/components/JsonLd";
import { getAllCategories, getCategory } from "@/data/categories";
import { getSoftware } from "@/data/software";
import { getSoftwareByCategory } from "@/lib/related";
import { getBreadcrumbJsonLd, getCategoryJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { generateCategorySynthesis, getCategoryFeaturedComparisons } from "@/lib/category";
import {
  GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS,
  shouldPrioritizeComparisonDiscovery,
} from "@/data/seo/gsc-sitemap-comparison-cohort";
import { getRoleGuidesForCategory } from "@/data/guides/registry";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const explicitDiscoveryPriority = new Set<string>(GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS);

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);

  if (!category) {
    return {
      title: "Category not found",
    };
  }

  const softwareCount = getSoftwareByCategory(category.slug).length;

  return {
    title: category.name,
    description: `${category.description} Compare ${softwareCount} ${category.name.toLowerCase()} tools.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategory(slug);

  if (!category) {
    notFound();
  }

  const software = getSoftwareByCategory(category.slug);
  const categorySlugs = new Set(software.map((item) => item.slug));
  const roleGuides = getRoleGuidesForCategory(category.slug);
  const featuredComparisons = getCategoryFeaturedComparisons(category.slug, PUBLISHED_COMPARISONS.length)
    .filter((item) => shouldPrioritizeComparisonDiscovery(item.comparisonSlug))
    .sort(
      (a, b) =>
        Number(explicitDiscoveryPriority.has(b.comparisonSlug)) -
          Number(explicitDiscoveryPriority.has(a.comparisonSlug)) ||
        b.score - a.score ||
        a.comparisonSlug.localeCompare(b.comparisonSlug)
    )
    .slice(0, 6);
  const comparisons = PUBLISHED_COMPARISONS.filter(
    ([slugA, slugB]) =>
      (categorySlugs.has(slugA) || categorySlugs.has(slugB)) &&
      shouldPrioritizeComparisonDiscovery(getComparisonSlug(slugA, slugB))
  )
    .map(([slugA, slugB]) => {
      const softwareA = getSoftware(slugA);
      const softwareB = getSoftware(slugB);
      return softwareA && softwareB ? { softwareA, softwareB } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const slugA = getComparisonSlug(a.softwareA.slug, a.softwareB.slug);
      const slugB = getComparisonSlug(b.softwareA.slug, b.softwareB.slug);
      return Number(explicitDiscoveryPriority.has(slugB)) - Number(explicitDiscoveryPriority.has(slugA));
    });

  return (
    <main className="flex-1 py-16 sm:py-20">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: category.name, url: `${SITE_URL}/category/${category.slug}` },
        ])}
      />
      <JsonLd data={getCategoryJsonLd(category, software)} />

      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: category.name }]} />

        <header className="mt-6 max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <LayoutGrid className="h-5 w-5" strokeWidth={2.25} />
          </span>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {category.name}
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-400">
            {generateCategorySynthesis(category, software)}
          </p>
        </header>

        <section className="mt-14">
          <SectionHeading
            title={`${software.length} ${software.length === 1 ? "tool" : "tools"} in this category`}
          />

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {software.map((item) => (
              <SoftwareCard key={item.slug} software={item} />
            ))}
          </div>
        </section>

        {software.length > 3 ? (
          <section className="mt-14">
            <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
                  <Compass className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Still not sure which one fits?
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Answer a few questions and get a deterministic, explained match instead of reading through all {software.length}.
                  </p>
                </div>
              </div>
              <ButtonLink href="/recommend" className="w-full shrink-0 sm:w-auto">
                Find my software
              </ButtonLink>
            </Card>
          </section>
        ) : null}

        {roleGuides.length > 0 && (
          <section className="mt-16 border-t border-white/10 pt-14">
            <SectionHeading
              eyebrow="Buyer Guides"
              title={`Best ${category.name.toLowerCase()} software by role`}
              description={`In-depth decision guides tailored to specific business models, team sizes, and workflows.`}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {roleGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/${guide.slug}`}
                  className="group block h-full"
                >
                  <Card className="flex h-full flex-col justify-between group-hover:border-white/25 group-hover:bg-white/[0.05]">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
                          Role Guide
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-white" />
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {guide.title}
                      </h3>
                      <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                        {guide.headline}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {featuredComparisons.length > 0 ? (
          <section className="mt-16 border-t border-white/10 pt-14">
            <SectionHeading
              eyebrow="Head-to-head"
              title="Popular comparisons"
              description={`Side-by-side breakdowns of commonly compared ${category.name.toLowerCase()} tools.`}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredComparisons.map((item) => (
                <Link
                  key={item.comparisonSlug}
                  href={`/compare/${item.comparisonSlug}`}
                  className="group block h-full"
                >
                  <Card className="flex h-full flex-col justify-between group-hover:border-white/25 group-hover:bg-white/[0.05]">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <GitCompare className="h-3.5 w-3.5 text-zinc-500" />
                          Head-to-head
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-white" />
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {item.softwareA.name} <span className="font-normal text-zinc-400">vs</span>{" "}
                        {item.softwareB.name}
                      </h3>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {comparisons.length > featuredComparisons.length ? (
          <section className="mt-14">
            <SectionHeading
              eyebrow="Directory"
              title={`More ${category.name.toLowerCase()} comparisons`}
            />
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {comparisons.map(({ softwareA, softwareB }) => (
                <Link
                  key={getComparisonSlug(softwareA.slug, softwareB.slug)}
                  href={`/compare/${getComparisonSlug(softwareA.slug, softwareB.slug)}`}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                >
                  <span>
                    {softwareA.name} <span className="text-zinc-500">vs</span> {softwareB.name}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </main>
  );
}
