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
import { SITE_URL } from "@/lib/site";

const PAGE_URL = `${SITE_URL}/research/saas-pricing-pressure-index-2026`;
const SMART_SME_COVERAGE_URL =
  "https://smartsme.co.uk/what-business-software-really-costs-in-2026-188-vendor-price-lists-checked/";

export const metadata: Metadata = {
  title: "Miloosh SaaS Pricing Pressure Index 2026",
  description:
    "How much SaaS teams really pay in 2026, built from first-party verified pricing across the Miloosh catalog — sample size, methodology, and source links published in full.",
  alternates: { canonical: "/research/saas-pricing-pressure-index-2026" },
  openGraph: {
    title: "Miloosh SaaS Pricing Pressure Index 2026",
    description: "What SaaS teams really pay in 2026 — from verified, first-party pricing data, methodology published in full.",
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
            {`What SaaS teams really pay, built from ${index.sampleSize} products with pricing verified directly on each vendor's own site as of ${generatedDate} — not estimated, not scraped from third-party aggregators.`}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <ShareButton title="Miloosh SaaS Pricing Pressure Index 2026" url={PAGE_URL} />
          </div>
        </header>

        {index.highestModeledCost50Seats ? (
          <Card className="mt-10 max-w-3xl border-white/15 bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Headline finding</p>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {`A 50-seat team on ${index.highestModeledCost50Seats.name} costs $${index.highestModeledCost50Seats.cost50.toLocaleString()}/month`}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {`Modeled directly from ${index.highestModeledCost50Seats.name}'s own published per-seat rate of $${index.highestModeledCost50Seats.perSeatMonthlyRate}/seat/month — the highest 50-seat figure among the ${index.modeledTeamCosts.length} products in this dataset with an explicit, structurally-recorded per-seat price.`}
            </p>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{freeTier.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Have a free tier (${freeTier.numerator}/${freeTier.denominator})`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{enterpriseContact.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Require contacting sales for enterprise pricing (${enterpriseContact.numerator}/${enterpriseContact.denominator})`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{perSeat.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Price explicitly per seat (${perSeat.numerator}/${perSeat.denominator})`}</p>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{index.medianStartingPrice !== null ? `$${index.medianStartingPrice}` : "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">Median starting monthly price, sampled products</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{index.medianModeledCost10Seats !== null ? `$${index.medianModeledCost10Seats.toLocaleString()}` : "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">{`Median modeled cost for a 10-seat team (${index.modeledTeamCosts.length} explicitly per-seat products)`}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{freeTrial.pct}%</p>
            <p className="mt-1 text-xs text-zinc-500">{`Offer a free trial (${freeTrial.numerator}/${freeTrial.denominator})`}</p>
          </Card>
        </div>

        {index.categoryMedianStartingPrice.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white">Median starting price by category</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Only categories with at least 3 verified data points — a median from fewer points isn&apos;t a defensible statistic.
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
                      <td className="px-4 py-3 text-zinc-300">{`$${c.median}/mo`}</td>
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
            Sort by price, filter by category, or check a product&apos;s free-tier status. Each row links to the Miloosh page and the vendor&apos;s own pricing source.
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
                5/10/25/50-seat figures are calculated only for products with an explicit, structurally-recorded per-seat monthly rate — never assumed or extrapolated for flat-rate or usage-based products, which are excluded from those figures entirely.
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
            We re-verify pricing continuously. Occasional emails when the dataset materially changes — no spam.
          </p>
          <div className="mt-4">
            <NewsletterSignupForm source="pricing-pressure-index" />
          </div>
        </Card>
      </Container>
    </main>
  );
}
