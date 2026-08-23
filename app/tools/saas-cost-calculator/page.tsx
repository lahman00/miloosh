import type { Metadata } from "next";
import { Suspense } from "react";
import { Calculator } from "lucide-react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SaasCostCalculator, type CalculatorProduct } from "@/components/tools/SaasCostCalculator";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";
import { Card } from "@/components/Card";
import { getAllSoftware } from "@/data/software";
import { getCategoryName } from "@/data/categories";

export const metadata: Metadata = {
  title: "SaaS Stack Cost Calculator — Miloosh",
  description:
    "Add the software tools you use and see your real monthly and annual cost, built from first-party pricing verified on each vendor's own site — no estimates.",
  alternates: { canonical: "/tools/saas-cost-calculator" },
  openGraph: {
    title: "SaaS Stack Cost Calculator",
    description: "See what your software stack really costs, from verified first-party pricing.",
  },
};

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23), Phase 16 — the first linkable
 * tool, built from real data already in the catalog rather than invented
 * for the occasion. Only products with a real, first-party-sourced
 * `pricing.entryPaid` are included (59/247 as of this build) -- a product
 * without verified pricing is left out entirely rather than estimated.
 */
export default function SaasCostCalculatorPage() {
  const products: CalculatorProduct[] = getAllSoftware()
    .filter((s) => s.pricing?.entryPaid)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      category: getCategoryName(s.category) ?? s.category,
      amount: Number.parseFloat(s.pricing!.entryPaid!.amount),
      billingPeriod: s.pricing!.entryPaid!.billingPeriod,
      perSeat: Boolean(s.pricing!.entryPaid!.perSeat),
      officialSource: s.pricing?.officialSource,
    }))
    .filter((p) => Number.isFinite(p.amount))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "SaaS Stack Cost Calculator" }]} />

        <header className="mt-6 max-w-2xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Calculator className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            SaaS Stack Cost Calculator
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            {`Add the tools your team actually uses and see the real monthly and annual cost — built from ${products.length} products with pricing verified directly on each vendor's own site, never estimated.`}
          </p>
        </header>

        <div className="mt-12">
          <Suspense fallback={<div className="text-sm text-zinc-500">Loading calculator…</div>}>
            <SaasCostCalculator products={products} />
          </Suspense>
        </div>

        <Card className="mx-auto mt-12 max-w-2xl">
          <h2 className="text-sm font-semibold text-white">Get pricing alerts for the tools you use</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Occasional emails when a tool in our catalog changes pricing or plan limits — verified, not speculative.
          </p>
          <div className="mt-4">
            <NewsletterSignupForm source="saas-cost-calculator" />
          </div>
        </Card>
      </Container>
    </main>
  );
}
