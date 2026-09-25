import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/Card";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { Software } from "@/data/software";
import type { FirstRevenueCohortEntry } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

function entryPriceLabel(software: Software): string | null {
  const entry = software.pricing?.entryPaid;
  if (!entry) return null;
  const cadence =
    entry.billingPeriod === "monthly"
      ? "/month"
      : entry.billingPeriod === "annual"
        ? "/year"
        : entry.billingPeriod === "one_time"
          ? " one-time"
          : "";
  const seat = entry.perSeat ? "/seat" : "";
  const billed = entry.annualBillingRequired ? " · billed annually" : "";
  return `${entry.currency} ${entry.amount}${cadence}${seat}${billed}`;
}

export function FirstRevenueDecisionPanel({
  software,
  cohort,
}: {
  software: Software;
  cohort: FirstRevenueCohortEntry;
}) {
  const entryPrice = entryPriceLabel(software);
  const alternatives = software.alternatives.slice(0, 3);

  return (
    <section className="mt-10">
      <Card className="border-emerald-400/20 bg-emerald-400/[0.04]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Buyer decision</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Should you choose {software.name}?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Check fit, drawbacks, pricing and alternatives before opening the vendor.
            </p>
          </div>
          {entryPrice ? (
            <span className="rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white">
              {entryPrice}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-emerald-300">Choose it if</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              {cohort.chooseIf.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-amber-300">Skip it if</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              {cohort.skipIf.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>

        {alternatives.length > 0 ? (
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-sm font-semibold text-white">Alternatives to compare</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {alternatives.map((alternative) => (
                <Link
                  key={alternative.slug}
                  href={`/software/${alternative.slug}`}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
                >
                  {alternative.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-white/10 pt-6">
          <TrackedCtaLink
            slug={software.slug}
            href={getSoftwareCtaUrl(software)}
            rel={getSoftwareCtaRel(software)}
            target="_blank"
            variant="primary"
            className="w-full sm:w-auto"
            ctaLocation="first-revenue-decision-panel"
          >
            {cohort.ctaLabel}
            <ExternalLink className="h-4 w-4" />
          </TrackedCtaLink>
          {shouldShowAffiliateDisclosure(software) ? (
            <p className="mt-3 text-xs text-zinc-500">
              Affiliate link. See our{" "}
              <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-zinc-300">
                Affiliate Disclosure
              </Link>
              .
            </p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
