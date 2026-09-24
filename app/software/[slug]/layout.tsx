import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/Container";
import { FirstRevenueSoftwarePanel } from "@/components/FirstRevenueSoftwarePanel";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { getSoftware } from "@/data/software";
import { getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
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

  const entry = software.pricing?.entryPaid;
  const price = entry
    ? `${entry.currency} ${entry.amount}${entry.billingPeriod === "unknown" ? "" : `/${entry.billingPeriod}`}${entry.perSeat ? " per seat" : ""}`
    : null;

  return (
    <>
      <div className="pb-24">{children}</div>

      <Container>
        <FirstRevenueSoftwarePanel software={software} />
      </Container>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{software.name}: ready to decide?</p>
            <p className="truncate text-xs text-zinc-400">
              {price ? `Current entry price: ${price}` : "Check current plans and terms on the vendor site."}
            </p>
          </div>
          <TrackedCtaLink
            slug={software.slug}
            href={getSoftwareCtaUrl(software, "pricing")}
            rel={getSoftwareCtaRel(software)}
            target="_blank"
            variant="primary"
            ctaLocation="money-page-decision-card"
            className="shrink-0"
          >
            {target.ctaLabel}
            <ExternalLink className="h-4 w-4" />
          </TrackedCtaLink>
        </div>
      </div>
    </>
  );
}
