import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/Card";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { Software } from "@/data/software";
import type { ComparisonData } from "@/lib/comparison";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { getRecommendationVendorCtaLabel } from "@/lib/recommend/vendor-cta";
import { getWixContextForComparison, resolveComparisonCtaUrl } from "@/lib/wix-funnels";

function SummaryAction({ software, otherSlug }: { software: Software; otherSlug: string }) {
  const href = resolveComparisonCtaUrl(software, otherSlug);
  const wixContext = software.slug === "wix" ? getWixContextForComparison(otherSlug) : undefined;
  const isAffiliate = shouldShowAffiliateDisclosure(software);
  const ctaLabel = getRecommendationVendorCtaLabel(software);

  return (
    <div>
      <TrackedCtaLink
        slug={software.slug}
        href={href}
        rel={getSoftwareCtaRel(software)}
        target="_blank"
        variant="secondary"
        className="w-full"
        ctaLocation="compare-summary-direct-vendor"
        wixContext={wixContext}
      >
        {ctaLabel}
        <ExternalLink className="h-4 w-4" />
      </TrackedCtaLink>
      {isAffiliate ? (
        <p className="mt-2 text-center text-[11px] leading-4 text-zinc-500">
          Affiliate link. Analysis is independent. {" "}
          <Link href="/affiliate-disclosure" className="underline underline-offset-2 hover:text-zinc-300">
            Disclosure
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Head-to-head summary table, used by app/compare/[comparison]/page.tsx. */
export function ComparisonTable({ data }: { data: ComparisonData }) {
  return (
    <Card>
      <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-4">
        <span className="text-sm text-zinc-500">Comparing</span>
        <span className="text-center font-semibold text-white">{data.softwareA.name}</span>
        <span className="text-center font-semibold text-white">{data.softwareB.name}</span>
      </div>

      <div className="divide-y divide-white/10">
        {data.rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-4 py-4">
            <span className="text-sm text-zinc-500">{row.label}</span>
            <span className="text-center text-sm text-zinc-300">{row.a}</span>
            <span className="text-center text-sm text-zinc-300">{row.b}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
        <SummaryAction software={data.softwareA} otherSlug={data.softwareB.slug} />
        <SummaryAction software={data.softwareB} otherSlug={data.softwareA.slug} />
      </div>
    </Card>
  );
}
