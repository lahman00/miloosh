import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Check, ExternalLink, Scale, ThumbsUp, Users } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ShareButton } from "@/components/ShareButton";
import { ComparisonTable } from "@/components/ComparisonTable";
import { SectionHeading } from "@/components/SectionHeading";
import { SoftwareCard } from "@/components/SoftwareCard";
import { JsonLd } from "@/components/JsonLd";
import { SearchForm } from "@/components/SearchForm";
import { WixShopifyBuyerChecks } from "@/components/WixShopifyBuyerChecks";
import { ShopifyWooMigrationRecords } from "@/components/ShopifyWooMigrationRecords";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { ButtonLink } from "@/components/ButtonLink";
import { getSoftware, type Software } from "@/data/software";
import {
  PUBLISHED_COMPARISONS,
  getComparisonSlug,
  getComparisonsInvolving,
  isPublishedComparison,
} from "@/data/comparisons";
import {
  CONS_DISCLOSURE,
  generateProsList,
  getComparisonBySlug,
  type ComparisonData,
} from "@/lib/comparison";
import { getComparisonRelatedSoftware } from "@/lib/store-related";
import { getBreadcrumbJsonLd, getComparisonJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import { formatIsoDate } from "@/lib/date";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { resolveComparisonCtaUrl, getWixContextForComparison, getWixProductLabelForComparison } from "@/lib/wix-funnels";
import { getAlternativeGuide } from "@/data/seo/alternative-guides";
import { getComparisonSearchIntentNote, getComparisonSerpOverride } from "@/data/seo/serp-overrides";

type ComparePageProps = {
  params: Promise<{ comparison: string }>;
};

/**
 * CTA for a "Choose X if…" card — always renders, for every product,
 * exactly like the software page's own CTA (getSoftwareCtaUrl never
 * returns an empty string: it resolves to the affiliate link when one is
 * active, otherwise the plain official site). WAR MODE mission (2026-08-22)
 * Phase 22 fix: this used to early-return null for any non-affiliate
 * product, so a real buyer persuaded by "Choose X if…" text had no button
 * to act on it — found on 138 of 1212 published comparisons where only
 * one side had a deal (the other side's card was silently dead) and on
 * 1062 more where both sides were dead. Rendering unconditionally and
 * gating only the disclosure text on affiliate status restores parity
 * between the two sides regardless of which one Miloosh monetizes — the
 * same commission-independent-of-display principle already enforced by
 * lib/recommend and lib/comparison's editorial neutrality.
 *
 * Wix specifically routes through the funnel-aware resolver
 * (lib/wix-funnels.ts) using the OTHER product in the pairing to pick
 * the right funnel (e.g. a headless-CMS comparison routes to the
 * Headless funnel, not the generic Website Builder one) — every other
 * product just uses its own single affiliate_url, same as the software
 * page.
 */
function ComparisonChoiceCta({ software, otherSlug }: { software: Software; otherSlug: string }) {
  const href = resolveComparisonCtaUrl(software, otherSlug);
  const wixContext = software.slug === "wix" ? getWixContextForComparison(otherSlug) : undefined;
  const ctaProductName = software.slug === "wix" ? getWixProductLabelForComparison(otherSlug) : software.name;

  return (
    <div className="mt-5">
      {software.slug === "wix" && wixContext === "headless" ? (
        <p className="mb-3 text-sm leading-6 text-zinc-400">
          For this comparison, the relevant Wix offering is <span className="font-medium text-zinc-200">Wix Headless</span>.
        </p>
      ) : null}
      <TrackedCtaLink
        slug={software.slug}
        href={href}
        rel={getSoftwareCtaRel(software)}
        target="_blank"
        variant="secondary"
        className="w-full"
        ctaLocation="compare-page-choose-card"
        wixContext={wixContext}
      >
        Visit {ctaProductName}
        <ExternalLink className="h-4 w-4" />
      </TrackedCtaLink>
      {shouldShowAffiliateDisclosure(software) ? (
        <p className="mt-2 text-center text-xs text-zinc-500">
          This is an affiliate link. See our{" "}
          <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-zinc-300">
            Affiliate Disclosure
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

// Only ever render the curated set below — a valid-but-uncurated pair
// (e.g. two real software slugs that just happen to parse) must 404, not
// render as a full page. resolvePublishedComparison() below enforces this
// on every request, so dynamicParams doesn't need to be forced to false —
// leaving it at the default lets an uncurated pair fall through to this
// segment's own not-found.tsx (a "we curate, not every pair" explanation)
// instead of the generic site-wide 404.
export function generateStaticParams() {
  return PUBLISHED_COMPARISONS.map(([slugA, slugB]) => ({
    comparison: getComparisonSlug(slugA, slugB),
  }));
}

function resolvePublishedComparison(comparison: string): ComparisonData | null {
  const data = getComparisonBySlug(comparison);
  if (!data) {
    return null;
  }
  if (!isPublishedComparison(data.softwareA.slug, data.softwareB.slug)) {
    return null;
  }
  return data;
}

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const { comparison } = await params;
  const data = resolvePublishedComparison(comparison);

  if (!data) {
    return { title: "Comparison not found" };
  }

  const serpOverride = getComparisonSerpOverride(comparison);

  return {
    title: serpOverride?.title ?? data.title,
    description: serpOverride?.description ?? data.metaDescription,
    alternates: { canonical: `/compare/${comparison}` },
    openGraph: {
      title: serpOverride?.title ?? data.title,
      description: serpOverride?.description ?? data.metaDescription,
    },
  };
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { comparison } = await params;
  const data = resolvePublishedComparison(comparison);

  if (!data) {
    notFound();
  }

  const { softwareA, softwareB } = data;
  const searchIntentNote = getComparisonSearchIntentNote(comparison);
  const guidedAlternatives = [softwareA, softwareB].filter((software) => getAlternativeGuide(software.slug));

  const relatedComparisons = [
    ...getComparisonsInvolving(softwareA.slug),
    ...getComparisonsInvolving(softwareB.slug),
  ].filter(
    ([a, b]) =>
      !(
        (a === softwareA.slug && b === softwareB.slug) ||
        (a === softwareB.slug && b === softwareA.slug)
      )
  );
  const uniqueRelatedComparisons = Array.from(
    new Map(relatedComparisons.map((pair) => [getComparisonSlug(pair[0], pair[1]), pair])).values()
  ).slice(0, 4);

  const relatedSoftware = getComparisonRelatedSoftware(softwareA, softwareB, 3);
  const isStoreComparison = softwareA.category === "ecommerce" || softwareB.category === "ecommerce";

  return (
    <main className="flex-1 py-16 sm:py-20">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Compare", url: `${SITE_URL}/compare` },
          { name: data.title, url: `${SITE_URL}/compare/${comparison}` },
        ])}
      />
      <JsonLd data={getComparisonJsonLd(softwareA, softwareB)} />

      <Container>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Compare", href: "/compare" },
            { name: data.title },
          ]}
        />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {data.title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">{data.intro}</p>
          {searchIntentNote ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-400">
              {searchIntentNote}
            </p>
          ) : null}
          <div className="mt-4">
            <ShareButton title={data.title} url={`${SITE_URL}/compare/${comparison}`} />
          </div>
        </header>

        <section className="mt-14">
          <SectionHeading title="Side-by-side summary" />
          <div className="mt-8">
            <ComparisonTable data={data} />
          </div>
        </section>

        <WixShopifyBuyerChecks comparison={comparison} />
        <ShopifyWooMigrationRecords comparison={comparison} />

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
                <Users className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg font-semibold text-white">Best for {softwareA.name}</h2>
            </div>
            <p className="mt-4 leading-7 text-zinc-400">{softwareA.bestFor}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
                <Users className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg font-semibold text-white">Best for {softwareB.name}</h2>
            </div>
            <p className="mt-4 leading-7 text-zinc-400">{softwareB.bestFor}</p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Feature comparison"
            description="Every feature listed here comes directly from each vendor's own official site."
          />
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[softwareA, softwareB].map((software) => (
              <Card key={software.slug}>
                <h3 className="text-lg font-semibold text-white">{software.name}</h3>
                <ul className="mt-4 space-y-2">
                  {software.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading title="Pros and cons" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[softwareA, softwareB].map((software) => (
              <Card key={software.slug}>
                <h3 className="text-lg font-semibold text-white">{software.name}</h3>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <ThumbsUp className="h-4 w-4 text-zinc-500" />
                  Pros
                </div>
                <ul className="mt-2 space-y-2">
                  {generateProsList(software).map((pro) => (
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
                <p className="mt-2 text-sm leading-6 text-zinc-500">{CONS_DISCLOSURE}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="mt-14">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
              <Scale className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <h2 className="text-2xl font-semibold text-white">Key differences</h2>
          </div>
          {isStoreComparison ? (
            <p className="mt-4 leading-7 text-zinc-400">
              The feature summaries above use each vendor&apos;s own terminology; unmatched wording is not proof that the other platform lacks a capability. For a store-platform decision, verify the requirements that matter to your workflow in the cited vendor sources instead of treating wording differences as a capability matrix.
            </p>
          ) : data.keyDifferences.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {data.keyDifferences.map((difference) => (
                <li key={difference} className="flex items-start gap-2 text-zinc-400">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                  <span className="leading-7">{difference}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 leading-7 text-zinc-400">
              {softwareA.name} and {softwareB.name} list similar stated features and platforms —
              the difference likely comes down to workflow fit rather than raw capability.
            </p>
          )}
        </Card>

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-white">Choose {softwareA.name} if…</h2>
            <p className="mt-4 leading-7 text-zinc-400">{data.whoShouldChooseA}</p>
            <ComparisonChoiceCta software={softwareA} otherSlug={softwareB.slug} />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-white">Choose {softwareB.name} if…</h2>
            <p className="mt-4 leading-7 text-zinc-400">{data.whoShouldChooseB}</p>
            <ComparisonChoiceCta software={softwareB} otherSlug={softwareA.slug} />
          </Card>
        </section>

        {guidedAlternatives.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
            {guidedAlternatives.map((software) => (
              <Link key={software.slug} href={`/software/${software.slug}#alternative-decision-heading`} className="underline underline-offset-4 hover:text-white">
                Explore the {software.name} alternatives decision guide
              </Link>
            ))}
          </div>
        ) : null}

        <Card className="mt-14 border-amber-500/20 bg-amber-500/[0.03]">
          <p className="text-sm leading-7 text-zinc-400">
            Facts on this page are sourced from each vendor&apos;s official site (linked below),
            not from ratings or reviews. Products change — verify anything that matters to your
            decision directly on the vendor&apos;s own site before switching. See our{" "}
            <Link href="/disclaimer" className="text-white underline underline-offset-4">
              Disclaimer
            </Link>{" "}
            and{" "}
            <Link href="/sources-policy" className="text-white underline underline-offset-4">
              Sources Policy
            </Link>
            .
          </p>
        </Card>

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          {[softwareA, softwareB].map((software) => (
            <Card key={software.slug}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                {software.name} sources
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Last verified {formatIsoDate(software.accessedAt)}
              </p>
              <ul className="mt-3 space-y-2">
                {software.sources.map((source) => (
                  <li key={source}>
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 items-center gap-2 break-all text-sm text-zinc-300 underline underline-offset-4 transition hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      {source}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href={`/software/${software.slug}`}
                className="mt-4 inline-block text-sm text-white underline underline-offset-4"
              >
                Full {software.name} comparison page
              </Link>
            </Card>
          ))}
        </section>

        {relatedSoftware.length > 0 ? (
          <section className="mt-14">
            <SectionHeading eyebrow="Keep exploring" title="Related software" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedSoftware.map((software) => (
                <SoftwareCard key={software.slug} software={software} />
              ))}
            </div>
          </section>
        ) : null}

        {uniqueRelatedComparisons.length > 0 ? (
          <section className="mt-14">
            <SectionHeading eyebrow="Keep exploring" title="Related comparisons" />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {uniqueRelatedComparisons.map(([slugA, slugB]) => {
                const relSoftwareA = getSoftware(slugA);
                const relSoftwareB = getSoftware(slugB);
                if (!relSoftwareA || !relSoftwareB) return null;

                return (
                  <Link
                    key={getComparisonSlug(slugA, slugB)}
                    href={`/compare/${getComparisonSlug(slugA, slugB)}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    {relSoftwareA.name} vs {relSoftwareB.name}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-16 border-t border-white/10 pt-14 text-center">
          <SectionHeading
            align="center"
            title="Still not sure which one fits?"
            description="Answer a few questions and get a deterministic, explained match instead of comparing tool by tool."
          />
          <ButtonLink href="/recommend" className="mt-8">
            Find my software
          </ButtonLink>
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
