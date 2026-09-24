import type { Metadata } from "next";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "First Revenue Funnel",
  robots: { index: false, follow: false },
};

export default function FirstRevenueFunnelPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-100">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
        First Revenue Sprint
      </p>
      <h1 className="mt-2 text-3xl font-bold">Primary software cohort</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Only the five canonical software decision pages are in the primary cohort.
      </p>
      <div className="mt-8 grid gap-4">
        {FIRST_REVENUE_PAGES.map((page) => (
          <article key={page.slug} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <a className="font-semibold text-white hover:underline" href={"/software/" + page.slug}>
              {page.slug}
            </a>
            <p className="mt-2 text-sm text-zinc-400">
              Baseline: {page.baseline.impressions} impressions, {page.baseline.clicks} clicks,
              average position {page.baseline.position.toFixed(1)}.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {page.queries.map((item) => (
                <li key={item.query}>{item.query} [{item.evidence}]</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
