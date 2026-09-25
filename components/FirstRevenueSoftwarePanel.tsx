import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/Card";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { Software } from "@/data/software";
import { getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

import { firstRevenuePriceLine } from "@/lib/revenue/first-revenue-price";

export function FirstRevenueSoftwarePanel({ software }: { software: Software }) {
  const target = getFirstRevenuePage(software.slug);
  if (!target || !shouldShowAffiliateDisclosure(software)) return null;

  const price = firstRevenuePriceLine(software);
  const watchouts = software.cons?.slice(0, 2) ?? [];
  const alternatives = software.alternatives.slice(0, 3);

  return (
    <section id="buying-decision" className="scroll-mt-24">
    <Card className="mt-8 border-emerald-400/20 bg-emerald-400/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Buyer decision</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Should you choose {software.name}?</h2>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-semibold text-white">Best fit</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{software.bestFor}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-semibold text-white">Not the best fit</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{target.notFor}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 p-4">
        <p className="text-sm font-semibold text-white">Before you commit</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{target.buyingCheck}</p>
      </div>

      {price ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-semibold text-white">Price check</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{price}</p>
          {software.pricing?.officialSource ? (
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              <a href={software.pricing.officialSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Vendor pricing source</a>
              {" "}for billing terms, regional rates and applicable taxes. Introductory offers are not renewal prices.
            </p>
          ) : null}
        </div>
      ) : null}

      {watchouts.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-white">Watch before buying</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
            {watchouts.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      ) : null}

      {alternatives.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-white">Alternatives to compare</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {alternatives.map((alternative) => (
              <Link
                key={alternative.slug}
                href={`/software/${alternative.slug}`}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:border-white/20 hover:text-white"
              >
                {alternative.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-5">
        <TrackedCtaLink
          slug={software.slug}
          href={getSoftwareCtaUrl(software, "pricing")}
          rel={getSoftwareCtaRel(software)}
          target="_blank"
          variant="primary"
          ctaLocation="money-page-decision-card"
          className="w-full sm:w-auto"
        >
          {target.ctaLabel}
          <ExternalLink className="h-4 w-4" />
        </TrackedCtaLink>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Affiliate link. Miloosh may earn a commission if you buy through this link. Editorial ranking and comparison criteria are independent of commissions.
        </p>
      </div>
    </Card>
    </section>
  );
}
