import { StorePlanFit } from "@/components/StorePlanFit";
import { DecisionBuyerChecklist } from "@/components/DecisionBuyerChecklist";
import { getBuyerChecklist } from "@/data/seo/buyer-checklists";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Check, ExternalLink, GitCompare, Scale } from "lucide-react";
import { Container } from "@/components/Container";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AlternativeCard } from "@/components/AlternativeCard";
import { SoftwareCard } from "@/components/SoftwareCard";
import { SearchForm } from "@/components/SearchForm";
import { SectionHeading } from "@/components/SectionHeading";
import { FaqSection } from "@/components/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { ListingBadges } from "@/components/ListingBadges";
import { ShareButton } from "@/components/ShareButton";
import { VendorLinksBlock } from "@/components/VendorLinksBlock";
import { PricingSection } from "@/components/PricingSection";
import { AlternativeDecisionGuide } from "@/components/AlternativeDecisionGuide";
import { getAlternativeGuide } from "@/data/seo/alternative-guides";
import { CTA_COPY_EXPERIMENT_ID, getCtaCopyLabel } from "@/lib/experiments/cta-copy-experiment";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getCategoryName } from "@/data/categories";
import { getRelatedSoftware } from "@/lib/related";
import { getComparisonSlug, getComparisonsInvolving } from "@/data/comparisons";
import {
  getSoftwareCtaRel,
  getSoftwareCtaUrl,
  shouldShowAffiliateDisclosure,
} from "@/lib/affiliate";
import { formatIsoDate } from "@/lib/date";
import {
  generateChoosingGuide,
  generateComparisonIntro,
  generateFaq,
  generateH1,
  generateIntro,
  generateMetaDescription,
  generateOverview,
  generateTitle,
  generateWhoShouldntUseIt,
} from "@/lib/generators";
import {
  getBreadcrumbJsonLd,
  getFaqJsonLd,
  getSoftwareApplicationJsonLd,
} from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import { getSoftwareSerpOverride } from "@/data/seo/serp-overrides";

type SoftwarePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getAllSoftware().map((software) => ({ slug: software.slug }));
}

export async function generateMetadata({ params }: SoftwarePageProps): Promise<Metadata> {
  const { slug } = await params;
  const software = getSoftware(slug);

  if (!software) {
    return {
      title: "Software not found",
    };
  }

  const serpOverride = getSoftwareSerpOverride(slug);
  const title = serpOverride?.title ?? generateTitle(software);
  const description = serpOverride?.description ?? generateMetaDescription(software);

  return {
    title,
    description,
    alternates: { canonical: `/software/${slug}` },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function SoftwarePage({ params }: SoftwarePageProps) {
  const { slug } = await params;
  const software = getSoftware(slug);

  if (!software) {
    notFound();
  }

  const relatedSoftware = getRelatedSoftware(software, 3);
  const faqItems = generateFaq(software);
  const comparisons = getComparisonsInvolving(software.slug)
    .map(([slugA, slugB]) => {
      const softwareA = getSoftware(slugA);
      const softwareB = getSoftware(slugB);
      return softwareA && softwareB ? { softwareA, softwareB } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const alternativeGuide = getAlternativeGuide(software.slug);
  const buyerChecklist = getBuyerChecklist(software.slug);

  return (
    <main className="flex-1 py-16 sm:py-20">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: software.name, url: `${SITE_URL}/software/${software.slug}` },
        ])}
      />
      <JsonLd data={getSoftwareApplicationJsonLd(software)} />
      <JsonLd data={getFaqJsonLd(faqItems)} />

      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: software.name }]} />

        <header className="mt-6 max-w-3xl">
          <Link href={`/category/${software.category}`}>
            <Badge className="transition hover:border-white/25 hover:text-white">
              {getCategoryName(software.category)}
            </Badge>
          </Link>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {generateH1(software)}
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-400">{generateIntro(software)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300">
              <GitCompare className="h-4 w-4" />
              {software.alternatives.length} alternatives compared
            </div>
            <ListingBadges software={software} />
            <ShareButton title={`${software.name} alternatives — Miloosh`} url={`${SITE_URL}/software/${software.slug}`} />
          </div>
        </header>

        <section className="mt-14 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h2 className="text-xl font-semibold text-white">About {software.name}</h2>
            <p className="mt-4 leading-7 text-zinc-400">{generateOverview(software)}</p>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {software.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col">
            {software.platforms?.length ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Platforms
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {software.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <TrackedCtaLink
              slug={software.slug}
              href={getSoftwareCtaUrl(software)}
              rel={getSoftwareCtaRel(software)}
              target="_blank"
              variant="secondary"
              className="mt-6 w-full"
              ctaLocation="software-page-cta"
              ctaCopyExperiment={{
                experimentId: CTA_COPY_EXPERIMENT_ID,
                control: (
                  <>
                    {getCtaCopyLabel("control", software.name)}
                    <ExternalLink className="h-4 w-4" />
                  </>
                ),
                treatment: (
                  <>
                    {getCtaCopyLabel("treatment", software.name)}
                    <ExternalLink className="h-4 w-4" />
                  </>
                ),
              }}
            />

            {shouldShowAffiliateDisclosure(software) ? (
              <p className="mt-3 text-center text-xs text-zinc-500">
                This is an affiliate link. See our{" "}
                <Link
                  href="/affiliate-disclosure"
                  className="underline underline-offset-4 hover:text-zinc-300"
                >
                  Affiliate Disclosure
                </Link>
                .
              </p>
            ) : null}

            <VendorLinksBlock software={software} />
          </Card>
        </section>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading title="Top alternatives" description={generateComparisonIntro(software)} />

            <span className="hidden shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 sm:block">
              {software.alternatives.length} options
            </span>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {software.alternatives.map((alternative, index) => (
              <AlternativeCard key={alternative.slug} alternative={alternative} rank={index + 1} />
            ))}
          </div>
        </section>

        {buyerChecklist ? <DecisionBuyerChecklist checklist={buyerChecklist} /> : null}

        {alternativeGuide ? <AlternativeDecisionGuide guide={alternativeGuide} category={software.category} /> : null}

        <StorePlanFit slug={software.slug} />
        <PricingSection software={software} />

        <Card className="mt-14">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
              <Scale className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <h2 className="text-2xl font-semibold text-white">How to choose</h2>
          </div>

          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">{generateChoosingGuide(software)}</p>
          <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
            {generateWhoShouldntUseIt(software)}
          </p>
        </Card>

        <FaqSection items={faqItems} />

        <Card className="mt-14">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
              <BookOpen className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <h2 className="text-2xl font-semibold text-white">Sources</h2>
          </div>

          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            The facts on this page come from {software.name}&apos;s own official site, accessed{" "}
            {formatIsoDate(software.accessedAt)}. See our{" "}
            <Link href="/sources-policy" className="text-white underline underline-offset-4">
              Sources Policy
            </Link>{" "}
            for how we handle sourcing.
          </p>

          <ul className="mt-4 space-y-2">
            {software.sources.map((source) => (
              <li key={source}>
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-zinc-300 underline underline-offset-4 transition hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {source}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        {comparisons.length > 0 ? (
          <section className="mt-14">
            <SectionHeading eyebrow="Head-to-head" title={`${software.name} comparisons`} />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {comparisons.map(({ softwareA, softwareB }) => (
                <Link
                  key={getComparisonSlug(softwareA.slug, softwareB.slug)}
                  href={`/compare/${getComparisonSlug(softwareA.slug, softwareB.slug)}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                >
                  {softwareA.name} vs {softwareB.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedSoftware.length > 0 ? (
          <section className="mt-14">
            <SectionHeading eyebrow="Keep exploring" title="Compare other tools" />

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedSoftware.map((item) => (
                <SoftwareCard key={item.slug} software={item} />
              ))}
            </div>
          </section>
        ) : null}

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
