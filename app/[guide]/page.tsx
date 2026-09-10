import { BuyerDecisionBrief } from "@/components/BuyerDecisionBrief";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, AlertCircle, ArrowRight, ExternalLink, GitCompare, ShieldCheck, Star } from "lucide-react";
import { Container } from "@/components/Container";
import { Badge } from "@/components/Badge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection } from "@/components/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { getAllRoleGuides, getRoleGuide } from "@/data/guides/registry";
import { getSoftware } from "@/data/software";
import { getCategoryName } from "@/data/categories";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

type GuidePageProps = {
  params: Promise<{
    guide: string;
  }>;
};

export function generateStaticParams() {
  return getAllRoleGuides().map((g) => ({ guide: g.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { guide: slug } = await params;
  const guide = getRoleGuide(slug);
  if (!guide) return {};

  const url = `${SITE_URL}/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${guide.title} | Miloosh`,
      description: guide.metaDescription,
      url,
      type: "article",
      siteName: "Miloosh",
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | Miloosh`,
      description: guide.metaDescription,
    },
  };
}

export default async function RoleGuidePage({ params }: GuidePageProps) {
  const { guide: slug } = await params;
  const guide = getRoleGuide(slug);
  if (!guide) notFound();

  const categoryName = getCategoryName(guide.categorySlug);

  // Hydrate reviewed software from catalog
  const reviewedProducts = guide.products
    .map((item) => {
      const software = getSoftware(item.slug);
      if (!software) return null;
      return {
        ...item,
        software,
        ctaUrl: getSoftwareCtaUrl(software),
        ctaRel: getSoftwareCtaRel(software),
        hasAffiliate: shouldShowAffiliateDisclosure(software),
      };
    })
    .filter((item) => item !== null);

  const hasAnyAffiliate = reviewedProducts.some((p) => p.hasAffiliate);

  // Structured Data Schema
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guide.title,
    description: guide.metaDescription,
    numberOfItems: reviewedProducts.length,
    itemListElement: reviewedProducts.map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: p.software.name,
      url: `${SITE_URL}/software/${p.software.slug}`,
      description: p.fitReason,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryName,
        item: `${SITE_URL}/category/${guide.categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: `${SITE_URL}/${guide.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />

      <main className="flex-1 py-16 sm:py-20">
        <Container>
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: categoryName, href: `/category/${guide.categorySlug}` },
              { name: guide.title },
            ]}
          />

          {/* Hero Header */}
          <header className="mt-6 mb-10 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge>Buyer Decision Guide</Badge>
              <span className="text-xs text-zinc-400 font-medium">Updated: {guide.updatedAt}</span>
              <span className="text-xs text-zinc-400 font-medium">• Curated for {guide.roleName}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              {guide.title}
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed">
              {guide.headline}
            </p>
          </header>

          {/* Affiliate Disclosure Notice */}
          {hasAnyAffiliate && (
            <div className="mb-8 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-400 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-200">Editorial Independence & Disclosure:</strong> Miloosh independently reviews software using first-party facts and pricing. Some links in this guide are affiliate links, which may earn us a commission at no additional cost to you. Rankings and editorial evaluations are determined strictly by product merit and role suitability.
              </div>
            </div>
          )}

          {/* Overview & Target Audience */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-white">Why This Role Decision Matters</h2>
              <p className="text-zinc-300 leading-relaxed text-base sm:text-lg">
                {guide.intro}
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Star className="w-4 h-4 text-amber-400" />
                Who This Guide Is For
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
                {guide.targetAudience.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <BuyerDecisionBrief slug={guide.slug} />

        {/* Evaluation Criteria */}
          <section className="mb-14">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">How We Evaluated Software for {guide.roleName}</h2>
              <p className="text-zinc-400 text-sm sm:text-base">
                Generic feature lists fail to capture role-specific realities. We evaluated each platform against four critical dimensions that directly impact daily operations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {guide.keyCriteria.map((criterion, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-white/10 font-bold text-white flex items-center justify-center text-sm mb-3">
                      {idx + 1}
                    </div>
                    <h3 className="font-semibold text-white mb-2 text-base">{criterion.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{criterion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Comparison Summary Table */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-white mb-4">Quick Comparison Summary</h2>
            <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/[0.02]">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-zinc-300 font-semibold border-b border-white/10 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Rank & Tool</th>
                    <th className="py-3.5 px-4">Best For</th>
                    <th className="py-3.5 px-4">Starting Price</th>
                    <th className="py-3.5 px-4">Trial / Free Option</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {reviewedProducts.map((p) => (
                    <tr key={p.slug} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white text-zinc-950 text-xs flex items-center justify-center font-bold">
                            {p.ranking}
                          </span>
                          <Link href={`/software/${p.software.slug}`} className="hover:underline text-blue-400">
                            {p.software.name}
                          </Link>
                        </div>
                        <span className="text-xs text-zinc-400">{p.badge}</span>
                      </td>
                      <td className="py-4 px-4 text-zinc-300 max-w-xs text-xs">
                        {p.summaryBestFor ?? p.software.bestFor}
                      </td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {p.summaryPrice ?? p.software.pricing?.startingPrice ?? "Contact sales"}
                      </td>
                      <td className="py-4 px-4 text-xs text-zinc-400">
                        {p.summaryAvailability ? (
                          <span className="text-zinc-300">{p.summaryAvailability}</span>
                        ) : p.software.pricing?.hasFreeTier ? (
                          <span className="text-emerald-400 font-semibold">Free Plan</span>
                        ) : p.software.pricing?.freeTrial?.available ? (
                          <span className="text-zinc-300">Free Trial</span>
                        ) : (
                          <span className="text-zinc-500">Paid only</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <TrackedCtaLink
                          slug={p.software.slug}
                          href={p.ctaUrl}
                          rel={p.ctaRel}
                          target="_blank"
                          ctaLocation="role-guide-summary-table"
                          variant="secondary"
                          size="md"
                        >
                          Visit Site <ExternalLink className="w-3 h-3 ml-1" />
                        </TrackedCtaLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detailed Product Reviews */}
          <section className="mb-14 space-y-8">
            <h2 className="text-2xl font-bold text-white">In-Depth Software Reviews</h2>

            {reviewedProducts.map((p) => (
              <div
                key={p.slug}
                id={p.slug}
                className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] scroll-mt-20"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-md bg-white text-zinc-950 font-bold text-xs">
                        #{p.ranking}
                      </span>
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                        {p.badge}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                      <Link href={`/software/${p.software.slug}`} className="hover:underline">
                        {p.software.name}
                      </Link>
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <TrackedCtaLink
                      slug={p.software.slug}
                      href={p.ctaUrl}
                      rel={p.ctaRel}
                      target="_blank"
                      ctaLocation="role-guide-card-cta"
                      variant="primary"
                    >
                      Visit {p.software.name} <ExternalLink className="w-4 h-4 ml-1.5" />
                    </TrackedCtaLink>
                  </div>
                </div>

                {/* Why it fits */}
                <div className="py-6 border-b border-white/10 space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-1 text-sm uppercase tracking-wider text-emerald-400">
                      Why It Fits {guide.roleName}
                    </h4>
                    <p className="text-zinc-300 leading-relaxed text-base">
                      {p.fitReason}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-zinc-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300">Tradeoff to Consider:</strong> {p.limitations}
                    </div>
                  </div>
                </div>

                {/* Pros & Cons & Pricing */}
                <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Key Strengths</h5>
                    <ul className="space-y-2 text-xs sm:text-sm text-zinc-400">
                      {(p.strengths ?? p.software.pros ?? []).map((pro, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Pricing Context</h5>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-3">
                      {p.pricingNote}
                    </p>
                    <div className="text-xs text-zinc-500">
                      Platforms: {p.software.platforms?.join(", ") ?? "Web"}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between bg-white/[0.03] p-4 rounded-xl border border-white/10">
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Detailed Profile</h5>
                      <p className="text-xs text-zinc-400 mb-3">
                        Read our complete breakdown with full feature analysis and alternatives.
                      </p>
                    </div>
                    <Link
                      href={`/software/${p.software.slug}`}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Explore {p.software.name} Profile <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Related Comparisons */}
          {guide.comparisons.length > 0 && (
            <section className="mb-14">
              <h2 className="text-2xl font-bold text-white mb-4">Relevant 1-on-1 Head-to-Head Comparisons</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {guide.comparisons.map((compSlug) => {
                  const parts = compSlug.split("-vs-");
                  const slugA = parts[0];
                  const slugB = parts[1];
                  const nameA = slugA ? getSoftware(slugA)?.name ?? slugA : slugA;
                  const nameB = slugB ? getSoftware(slugB)?.name ?? slugB : slugB;

                  return (
                    <Link
                      key={compSlug}
                      href={`/compare/${compSlug}`}
                      className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 group-hover:text-white">
                        <GitCompare className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                        <span>{nameA} vs {nameB}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-transform" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* FAQs */}
          {guide.faqs.length > 0 && (
            <div className="mb-12">
              <FaqSection items={guide.faqs} />
            </div>
          )}
        </Container>
      </main>
    </>
  );
}
