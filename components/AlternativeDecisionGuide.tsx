import Link from "next/link";
import { ArrowRight, Compass, ExternalLink } from "lucide-react";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { getCategoryName } from "@/data/categories";
import { getSoftware, type Software } from "@/data/software";
import type { AlternativeGuide } from "@/data/seo/alternative-guides";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

/**
 * Only surface a price in a decision card when the pricing record itself is
 * verified and already carries the vendor-sourced starting-price string.
 * Never derive a price from a tier, guess a billing period, or turn
 * contact-sales/unavailable pricing into a pseudo-number.
 */
export function getVerifiedStartingPrice(software: Software): string | null {
  if (software.pricing?.status !== "verified") return null;
  return software.pricing.startingPrice ?? null;
}

export function AlternativeDecisionGuide({ guide, category }: { guide: AlternativeGuide; category: string }) {
  return (
    <section className="mt-14" aria-labelledby="alternative-decision-heading">
      <SectionHeading eyebrow="Decision guide" title={<span id="alternative-decision-heading">{guide.heading}</span>} description={guide.introduction} />
      <Card className="mt-8">
        <div className="flex items-center gap-3"><Compass className="h-5 w-5 text-zinc-300" /><h3 className="text-lg font-semibold text-white">Why consider another option?</h3></div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">{guide.whySeekAlternative.map((reason) => <li key={reason} className="text-sm leading-6 text-zinc-400">{reason}</li>)}</ul>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {guide.decisions.map((decision) => {
          const alternative = getSoftware(decision.alternativeSlug);
          if (!alternative) return null;
          const startingPrice = getVerifiedStartingPrice(alternative);

          return (
            <Card key={decision.heading} className="flex h-full flex-col">
              <h3 className="text-lg font-semibold text-white">{decision.heading}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">{decision.fit}</p>
              {startingPrice ? (
                <p className="mt-4 text-sm font-medium text-zinc-200">
                  Verified starting price: {startingPrice}
                </p>
              ) : null}
              <div className="mt-5 space-y-2 text-sm">
                <Link className="flex items-center justify-between text-zinc-200 underline underline-offset-4 hover:text-white" href={`/software/${alternative.slug}`}>Explore {alternative.name}<ArrowRight className="h-4 w-4" /></Link>
                <Link className="flex items-center justify-between text-zinc-400 underline underline-offset-4 hover:text-white" href={`/compare/${decision.comparisonSlug}`}>Open comparison<ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-5">
                <TrackedCtaLink
                  slug={alternative.slug}
                  href={getSoftwareCtaUrl(alternative)}
                  rel={getSoftwareCtaRel(alternative)}
                  target="_blank"
                  variant="secondary"
                  className="w-full"
                  ctaLocation="alternative-decision-guide"
                >
                  Visit {alternative.name}
                  <ExternalLink className="h-4 w-4" />
                </TrackedCtaLink>
                {shouldShowAffiliateDisclosure(alternative) ? (
                  <p className="mt-2 text-center text-xs text-zinc-500">
                    This is an affiliate link. See our{" "}
                    <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-zinc-300">
                      Affiliate Disclosure
                    </Link>
                    .
                  </p>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-zinc-400">See the wider <Link href={`/category/${category}`} className="text-white underline underline-offset-4">{getCategoryName(category)}</Link> category for more Miloosh-covered options.</p>
    </section>
  );
}
