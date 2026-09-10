import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, FileCheck2, Users, ExternalLink } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";
import { ShareButton } from "@/components/ShareButton";
import { PricingIndexTable } from "@/components/pricing-index/PricingIndexTable";
import { buildPricingIndex } from "@/lib/pricing-index/build";
import { formatIndexMoney } from "@/lib/pricing-index/format";
import { SITE_URL } from "@/lib/site";

const PAGE_URL = `${SITE_URL}/research/saas-pricing-pressure-index-2026`;
const SMART_SME_COVERAGE_URL =
  "https://smartsme.co.uk/what-business-software-really-costs-in-2026-188-vendor-price-lists-checked/";

export const metadata: Metadata = {
  title: "Miloosh SaaS Pricing Pressure Index 2026",
  description:
    "Published SaaS starting prices and documented plan availability, with dated vendor sources, explicit sample sizes, currencies, and modeled-cost limitations.",
  alternates: { canonical: "/research/saas-pricing-pressure-index-2026" },
  openGraph: {
    title: "Miloosh SaaS Pricing Pressure Index 2026",
    description: "Published SaaS list prices, not customer invoices. Dated sources, sample sizes, and modeled-cost limitations included.",
  },
};

/**
 * MILOOSH WAR MODE mission (2026-08-24), Phase 6-9 — the flagship PR
 * data asset. Every number on this page traces back to buildPricingIndex(),
 * which only counts catalog entries with pricing.status "verified" or
 * "contact_sales" -- see the Methodology section below for the full
 * inclusion/exclusion rule text (the exact strings the PR pitch doc
 * requires: sample size, verification window, methodology).
 */
export default function PricingPressureIndexPage() {
  const index = buildPricingIndex();
  const statByLabel = (label: string) => index.stats.find((s) => s.label === label)!;

  const freeTier = statByLabel("Free tier available");
  const freeTrial = statByLabel("Free trial available");
  const enterpriseContact = statByLabel("Enterprise tier requires contacting sales");
  const perSeat = statByLabel("Explicitly per-seat pricing");

  const generatedDate = new Date(index.generatedAt).toISOString().slice(0, 10);

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "SaaS Pricing Pressure Index 2026" }]} />

        <header className="mt-6 max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <TrendingUp className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            SaaS Pricing Pressure Index 2026
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            {`Published SaaS list prices and plan availability from ${index.sampleSize} catalog products. Sources were checked between ${index.verificationWindow.earliest ?? 'an unrecorded date'} and ${index.verificationWindow.latest ?? 'an unrecorded date'}; this view was compiled on ${generatedDate}. These are not customer invoices or evidence of actual spending.`}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <ShareButton title="Miloosh SaaS Pricing Pressure Index 2026" url={PAGE_URL} />
          </div>
        </header>

        {index.highestModeledCost50Seats ? (
          <Card className="mt-10 max-w-3xl border-white/15 bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Illustrative licensed-seat scenario</p>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {`50 licensed seats × the recorded ${index.highestModeledCost50Seats.name} starting rate = ${formatIndexMoney(index.highestModeledCost50Seats.cost50)}/month`}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {`Illustrative arithmetic, not a quote: 50 × ${formatIndexMoney(index.highestModeledCost50Seats.perSeatMonthlyRate)}. Limited to ${index.modeledTeamCosts.length} records explicitly marked USD, monthly and per-seat. Licensed users or agents are not necessarily all employees. Plan caps, seat bundles, minimums, discounts, taxes, usage charges and feature upgrades can change the payable total.`}
            </p>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{freeTier.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Documented free tier (${freeTier.numerator}/${freeTier.denominator} known records)`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{enterpriseContact.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Enterprise contact-sales flag (${enterpriseContact.numerator}/${enterpriseContact.denominator} known records)`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{perSeat.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Explicit per-seat flag (${perSeat.numerator}/${perSeat.denominator} known records)`}</p>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{formatIndexMoney(index.medianStartingPrice)}</p>
            <p className="mt-1 text-xs text-zinc-500">{`Median recorded USD monthly starting rate (${index.monthlyUsdSampleSize} records)`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{formatIndexMoney(index.medianModeledCost10Seats)}</p>
            <p className="mt-1 text-xs text-zinc-500">{`Median arithmetic scenario for 10 licensed seats (${index.modeledTeamCosts.length} explicitly per-seat products)`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{freeTrial.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Documented free trial (${freeTrial.numerator}/${freeTrial.denominator} known records)`}</p>
          </Card>
        </div>

        {index.categoryMedianStartingPrice.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white">Median recorded USD monthly rate by category</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Only categories with at least 3 explicit USD monthly records are shown. Rates may cover different seats, contacts, usage allowances or features; these medians are not like-for-like quotes or market-wide estimates.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Median starting price</th>
                    <th className="px-4 py-3">Sample size</th>
                  </tr>
                </thead>
                <tbody>
                  {index.categoryMedianStartingPrice.map((c) => (
                    <tr key={c.category} className="border-b border-white/5">
                      <td className="px-4 py-3 text-zinc-300">{c.category}</td>
                      <td className="px-4 py-3 text-zinc-300">{`${formatIndexMoney(c.median)}/mo`}</td>
                      <td className="px-4 py-3 text-zinc-500">{c.sampleSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-12">
          <h2 className="text-lg font-semibold text-white">Full dataset</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Filter by category or documented free-tier availability. Recorded starting-price text preserves the source currency and unit. Sorting by monthly rate uses only explicit USD monthly records; excluded or unknown-basis rows remain at the end. Each row links to its vendor source.
          </p>
          <div className="mt-4">
            <PricingIndexTable products={index.products} />
          </div>
        </div>

        <Card className="mt-12 max-w-3xl">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Methodology</h2>
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sample</dt>
              <dd className="mt-1 text-zinc-400">
                {`${index.sampleSize} of ${index.totalCatalogSize} catalog products (as of ${generatedDate}).`} {index.inclusionRule}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Exclusion rule</dt>
              <dd className="mt-1 text-zinc-400">{index.exclusionRule}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Modeled team costs</dt>
              <dd className="mt-1 text-zinc-400">
                5/10/25/50 licensed-seat figures are arithmetic scenarios using explicit USD monthly per-seat records only. Annual records are excluded because the legacy data mixes annual invoice amounts and monthly equivalents. No foreign-exchange conversion is applied. We do not verify that every starting plan permits every modeled seat count. These are not quotes, invoices, actual customer spending or a representative market sample.
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-zinc-500">
            Want to check a specific stack instead of the whole dataset?{" "}
            <Link href="/tools/saas-cost-calculator" className="text-zinc-300 underline underline-offset-4 hover:text-white">
              Use the SaaS cost calculator
            </Link>
            .
          </p>
        </Card>

        <Card className="mt-8 max-w-3xl">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Independent coverage</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Smart SME published an independent write-up of this dataset on September 8, 2026,
            covering the sample, methodology, pricing structure, and selected findings for UK
            small businesses.
          </p>
          <a
            href={SMART_SME_COVERAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 underline underline-offset-4 transition hover:text-white"
          >
            Read Smart SME&apos;s coverage
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>

        <Card className="mt-8 max-w-3xl">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Get notified when this index updates</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Occasional emails when the dataset materially changes. Each product carries its own source-verification date; compilation does not mean every vendor was rechecked today.
          </p>
          <div className="mt-4">
            <NewsletterSignupForm source="pricing-pressure-index" />
          </div>
        </Card>
      </Container>
    </main>
  );
}
