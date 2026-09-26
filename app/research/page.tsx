import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const TITLE = "Research";
const DESCRIPTION =
  "Miloosh's original, source-verified research: datasets built from our own software catalog and each vendor's own pricing page, published with methodology and a downloadable dataset.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/research" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

/**
 * Citable Research Asset Factory (2026-09-26) — built once a second real
 * research asset existed alongside the SaaS Pricing Pressure Index. Not
 * built for a single lonely page; this is a real index of real assets.
 */
const RESEARCH_ASSETS = [
  {
    href: "/research/customer-support-pricing-2026",
    title: "Customer Support Pricing Benchmark 2026",
    summary:
      "Which of 16 customer support platforms bill AI-handled conversations separately from seats, verified against each vendor's own pricing page.",
    verified: "2026-09-26",
  },
  {
    href: "/research/saas-pricing-pressure-index-2026",
    title: "SaaS Pricing Pressure Index 2026",
    summary:
      "Published starting prices and plan availability across the Miloosh catalog, with sample size, verification window, and modeled-cost limitations disclosed.",
    verified: "2026-08-24",
  },
];

export default function ResearchHubPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: TITLE }]} />
        <header className="mt-6 max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <FileCheck2 className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">{TITLE}</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">{DESCRIPTION}</p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {RESEARCH_ASSETS.map((asset) => (
            <Link key={asset.href} href={asset.href} className="block">
              <Card className="h-full transition hover:border-white/25 hover:bg-white/[0.05]">
                <h2 className="text-base font-semibold text-white">{asset.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{asset.summary}</p>
                <p className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Verified {asset.verified}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
