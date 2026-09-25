import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { getSoftware } from "@/data/software";
import { getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
import { firstRevenueCompactPrice } from "@/lib/revenue/first-revenue-price";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

export default async function SoftwareMoneyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const target = getFirstRevenuePage(slug);
  const software = getSoftware(slug);

  if (!target || !software || !shouldShowAffiliateDisclosure(software)) {
    return children;
  }

  const price = firstRevenueCompactPrice(software);

  return (
    <>
      <div className="pb-36">{children}</div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 px-4 py-3 shadow-2xl backdrop-blur">
        {/* Narrow phones stack the terms above a full-width button, so the
            billing commitment is never squeezed into a one-word column. */}
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="hidden truncate text-sm font-semibold text-white sm:block">{software.name}: ready to decide?</p>
            <p className="text-xs leading-5 text-zinc-400">
              {price ? price : "Check current plans and terms on the vendor site."}
              <span className="block text-xs text-zinc-400">Affiliate link</span>
            </p>
          </div>
          <TrackedCtaLink
            slug={software.slug}
            href={getSoftwareCtaUrl(software, "pricing")}
            rel={getSoftwareCtaRel(software)}
            target="_blank"
            variant="primary"
            ctaLocation="money-page-sticky-cta"
            className="w-full sm:w-auto sm:shrink-0"
          >
            {target.ctaLabel}
            <ExternalLink className="h-4 w-4" />
          </TrackedCtaLink>
        </div>
      </div>
    </>
  );
}
