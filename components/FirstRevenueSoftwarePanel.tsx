import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/Card";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { Software } from "@/data/software";
import { getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
import { getComparisonSlug, getComparisonsInvolving } from "@/data/comparisons";
import { formatIsoDate } from "@/lib/date";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

import { firstRevenuePriceLine } from "@/lib/revenue/first-revenue-price";

export function FirstRevenueSoftwarePanel({ software }: { software: Software }) {
  const target = getFirstRevenuePage(software.slug);
  if (!target || !shouldShowAffiliateDisclosure(software)) return null;

  const price = firstRevenuePriceLine(software);
  const watchouts = software.cons?.slice(0, 2) ?? [];
  const alternatives = software.alternatives.slice(0, 3);
  const comparisons = new Map(getComparisonsInvolving(software.slug).map(([a, b]) => [
    a === software.slug ? b : a, getComparisonSlug(a, b),
  ]));

  return (
    <section id="buying-decision" className="scroll-mt-24">
    <Card className="mt-8 border-emerald-400/20 bg-emerald-400/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Buyer decision</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Should you choose {software.name}?</h2>
      <nav aria-label={`${software.name} buying decision`} className="mt-4 flex flex-wrap gap-3 text-sm">
        <a href="#buyer-price-check" className="rounded-lg border border-white/15 px-3 py-3 text-zinc-200 underline underline-offset-4">Price and billing</a>
        <a href="#buyer-alternatives" className="rounded-lg border border-white/15 px-3 py-3 text-zinc-200 underline underline-offset-4">Compare alternatives</a>
      </nav>

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
        <div id="buyer-price-check" className="mt-4 scroll-mt-24 rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-semibold text-white">Price check</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{price}</p>
          {software.pricing?.officialSource ? (
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              <a href={software.pricing.officialSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Vendor pricing source</a>
              {" "}for billing terms, regional rates and applicable taxes. Introductory offers are not renewal prices.
              {software.pricing.lastVerified ? ` Catalog pricing checked ${formatIsoDate(software.pricing.lastVerified)}.` : ""}
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
        <div id="buyer-alternatives" className="mt-4 scroll-mt-24">
          <h3 className="text-sm font-semibold text-white">Which alternative fits your reason for switching?</h3>
          <table className="mt-3 w-full table-fixed text-left text-sm leading-6 text-zinc-300">
            <caption className="sr-only">Alternatives to {software.name}, matched to the buying requirement. Existing editorial order is unchanged.</caption>
            <thead><tr className="border-b border-white/10"><th scope="col" className="w-1/3 py-3 pr-3 text-white">Option</th><th scope="col" className="py-3 text-white">When to compare</th></tr></thead>
            <tbody>
              {alternatives.map((alternative) => {
                const comparison = comparisons.get(alternative.slug);
                return (
                  <tr key={alternative.slug} className="border-b border-white/10 align-top">
                    <th scope="row" className="py-4 pr-3 font-medium break-words"><Link href={`/software/${alternative.slug}`} className="text-white underline underline-offset-4">{alternative.name}</Link></th>
                    <td className="py-4">
                      <p>{alternative.bestFor}</p>
                      {comparison ? <Link href={`/compare/${comparison}`} className="mt-2 inline-block py-2 text-emerald-300 underline underline-offset-4">{software.name} vs {alternative.name}</Link> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
