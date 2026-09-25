import Link from "next/link";
import { AlertTriangle, ArrowRight, DollarSign, ExternalLink, Target } from "lucide-react";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { DecisionMoneyPageConfig } from "@/data/growth/decision-money-pages";
import type { Software } from "@/data/software";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import {
  getWixContextForComparison,
  getWixProductLabelForComparison,
  resolveComparisonCtaUrl,
} from "@/lib/wix-funnels";

function pricingSummary(software: Software): string {
  const pricing = software.pricing;
  if (!pricing) return "No verified public pricing snapshot is on file.";
  if (pricing.startingPrice) return pricing.startingPrice;

  if (pricing.entryPaid) {
    const billing =
      pricing.entryPaid.billingPeriod === "unknown"
        ? ""
        : `/${pricing.entryPaid.billingPeriod}`;
    const seat = pricing.entryPaid.perSeat ? " per seat" : "";
    return `${pricing.entryPaid.currency} ${pricing.entryPaid.amount}${billing}${seat}`;
  }

  if (pricing.freePlan || pricing.hasFreeTier) {
    return "Free plan available; verify paid-tier limits before choosing.";
  }
  return pricing.enterpriseContactSales
    ? "Contact sales for the required tier."
    : "Verify current vendor pricing.";
}

function MoneyVendorCard({
  software,
  other,
}: {
  software: Software;
  other: Software;
}) {
  const href = resolveComparisonCtaUrl(software, other.slug);
  const wixContext =
    software.slug === "wix"
      ? getWixContextForComparison(other.slug)
      : undefined;
  const productName =
    software.slug === "wix"
      ? getWixProductLabelForComparison(other.slug)
      : software.name;
  const watchOuts = software.cons?.slice(0, 3) ?? [];
  const alternatives = software.alternatives
    .filter((alternative) => alternative.slug !== other.slug)
    .slice(0, 2);

  return (
    <Card>
      <h3 className="text-xl font-semibold text-white">{software.name}</h3>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <DollarSign className="h-4 w-4" />
          Price snapshot
        </div>
        <p className="mt-2 text-base font-medium text-white">
          {pricingSummary(software)}
        </p>
        {software.pricing?.lastVerified ? (
          <p className="mt-1 text-xs text-zinc-500">
            Pricing last verified {software.pricing.lastVerified}.
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-zinc-200">Good fit when</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {software.bestFor}
        </p>
      </div>

      <div className="mt-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <AlertTriangle className="h-4 w-4 text-zinc-500" />
          Watch-outs
        </p>
        {watchOuts.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {watchOuts.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm leading-6 text-zinc-400"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Verify the exact paid tier, limits, integrations, and migration
            requirements against the vendor sources below before committing.
          </p>
        )}
      </div>

      {alternatives.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-zinc-200">
            Alternatives worth checking
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {alternatives.map((alternative) => (
              <Link
                key={alternative.slug}
                href={`/software/${alternative.slug}`}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                {alternative.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <TrackedCtaLink
        slug={software.slug}
        href={href}
        rel={getSoftwareCtaRel(software)}
        target="_blank"
        variant="primary"
        className="mt-6 w-full"
        ctaLocation="money-page-decision-card"
        wixContext={wixContext}
      >
        Check current {productName} plans
        <ExternalLink className="h-4 w-4" />
      </TrackedCtaLink>

      {shouldShowAffiliateDisclosure(software) ? (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Affiliate link — Miloosh may earn a commission at no extra cost to you.
        </p>
      ) : null}
    </Card>
  );
}

export function DecisionMoneyPanel({
  config,
  softwareA,
  softwareB,
}: {
  config: DecisionMoneyPageConfig;
  softwareA: Software;
  softwareB: Software;
}) {
  return (
    <section id="buying-decision" className="mt-14 scroll-mt-24">
      <SectionHeading
        eyebrow="Buying decision"
        title={`${softwareA.name} vs ${softwareB.name}: the decision that matters`}
        description={config.decisionQuestion}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <MoneyVendorCard software={softwareA} other={softwareB} />
        <MoneyVendorCard software={softwareB} other={softwareA} />
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Target className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold text-white">
            Do not choose either yet if…
          </h3>
        </div>
        <ul className="mt-4 space-y-3">
          {config.recheckBeforeBuying.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm leading-6 text-zinc-400"
            >
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
