import Link from "next/link";
import { DollarSign, ExternalLink } from "lucide-react";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { formatIsoDate } from "@/lib/date";
import {
  getSoftwareCtaRel,
  getSoftwareCtaUrl,
  shouldShowAffiliateDisclosure,
} from "@/lib/affiliate";
import type { Software } from "@/data/software";

/**
 * 2026-08-17 growth sprint, Phase 3 — the first public renderer for the
 * source-backed pricing fields added to data/software/schema.ts. Only
 * renders when there's real, source-backed data to show (status,
 * entryPaid, or tiers) — a product with none of these simply gets no
 * pricing card, never a fabricated placeholder.
 */
export function PricingSection({ software }: { software: Software }) {
  const pricing = software.pricing;
  const hasBackfilledData = pricing?.status || pricing?.entryPaid || (pricing?.tiers && pricing.tiers.length > 0);
  if (!hasBackfilledData) return null;

  const hasActiveAffiliatePath = shouldShowAffiliateDisclosure(software);

  return (
    <Card className="mt-14">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
          <DollarSign className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <h2 className="text-2xl font-semibold text-white">Pricing</h2>
      </div>

      {pricing.status === "contact_sales" ? (
        <p className="mt-4 leading-7 text-zinc-400">{software.name} doesn&apos;t publish pricing — contact sales for a quote.</p>
      ) : pricing.status === "unavailable" ? (
        <p className="mt-4 leading-7 text-zinc-400">No public pricing page was found for {software.name} as of our last check.</p>
      ) : pricing.status === "free_only" ? (
        <p className="mt-4 leading-7 text-zinc-400">{software.name} is free to use — no paid tier.</p>
      ) : null}

      {pricing.freePlan !== undefined ? (
        <p className="mt-3 text-sm text-zinc-400">
          Free plan: <span className="text-white">{pricing.freePlan ? "yes" : "no"}</span>
        </p>
      ) : null}

      {pricing.freeTrial ? (
        <p className="mt-1 text-sm text-zinc-400">
          Free trial: <span className="text-white">{pricing.freeTrial.available ? (pricing.freeTrial.days ? `yes, ${pricing.freeTrial.days} days` : "yes") : "no"}</span>
        </p>
      ) : null}

      {pricing.entryPaid ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm text-zinc-500">Entry paid plan</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {pricing.entryPaid.currency} {pricing.entryPaid.amount}
            <span className="ml-1 text-sm font-normal text-zinc-500">
              / {pricing.entryPaid.billingPeriod === "unknown" ? "billing period unstated" : pricing.entryPaid.billingPeriod}
              {pricing.entryPaid.perSeat ? " / seat" : ""}
            </span>
          </p>
          {pricing.entryPaid.annualBillingRequired ? <p className="mt-1 text-xs text-amber-300/80">Annual billing required at this price.</p> : null}
        </div>
      ) : null}

      {pricing.tiers && pricing.tiers.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pricing.tiers.map((tier) => (
            <li key={tier.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-semibold text-white">{tier.name}</p>
              {tier.amount ? (
                <p className="mt-1 text-sm text-zinc-400">
                  {tier.currency} {tier.amount}
                  {tier.billingPeriod && tier.billingPeriod !== "unknown" ? ` / ${tier.billingPeriod}` : ""}
                  {tier.unit ? ` / ${tier.unit}` : ""}
                </p>
              ) : null}
              {tier.notes ? <p className="mt-1 text-xs text-zinc-500">{tier.notes}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {pricing.enterpriseContactSales ? <p className="mt-4 text-sm text-zinc-400">Enterprise: contact sales for custom pricing.</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {pricing.lastVerified ? (
          <Badge className="border-white/10 bg-white/5 text-zinc-400">Pricing checked {formatIsoDate(pricing.lastVerified)}</Badge>
        ) : null}
        {pricing.officialSource ? (
          <a href={pricing.officialSource} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300">
            Official pricing page
          </a>
        ) : null}
      </div>

      {hasActiveAffiliatePath ? (
        <div className="mt-6 border-t border-white/10 pt-6">
          <TrackedCtaLink
            slug={software.slug}
            href={getSoftwareCtaUrl(software)}
            rel={getSoftwareCtaRel(software)}
            target="_blank"
            variant="primary"
            className="w-full sm:w-auto"
            ctaLocation="pricing-section-cta"
          >
            Check {software.name} plans
            <ExternalLink className="h-4 w-4" />
          </TrackedCtaLink>
          <p className="mt-3 text-xs text-zinc-500">
            Affiliate link. Our research and recommendations are independent of commissions. See our{" "}
            <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-zinc-300">
              Affiliate Disclosure
            </Link>
            .
          </p>
        </div>
      ) : null}
    </Card>
  );
}
