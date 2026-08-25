import type { Metadata } from "next";
import { DollarSign } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SectionHeading } from "@/components/SectionHeading";
import { buildMoneyMap, type MoneyMapBucket, type MoneyMapPage } from "@/lib/revenue/money-map";

/**
 * Internal Money Map. Basic-Auth gated and excluded from indexing. Reads live
 * Search Console data plus the Blob-backed outbound revenue log at request
 * time. Revenue-log events are operational evidence, not human-qualified
 * traffic; QA/test events are excluded explicitly by lib/revenue/money-map.ts.
 */
export const metadata: Metadata = {
  title: "Money Map",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const BUCKET_LABEL: Record<Exclude<MoneyMapBucket, null>, string> = {
  A: "A — Money now",
  B: "B — CTR opportunity",
  C: "C — Ranking strike zone",
  D: "D — Monetization gap",
  E: "E — Click optimization",
  F: "F — Build/expand",
};

const BUCKET_COLOR: Record<Exclude<MoneyMapBucket, null>, string> = {
  A: "border-emerald-500/30 text-emerald-300",
  B: "border-sky-500/30 text-sky-300",
  C: "border-amber-500/30 text-amber-300",
  D: "border-rose-500/30 text-rose-300",
  E: "border-violet-500/30 text-violet-300",
  F: "border-white/10 text-zinc-300",
};

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function RowGsc({ page }: { page: MoneyMapPage }) {
  if (page.gscAvailability === "unavailable") {
    return <span className="text-zinc-600">unavailable</span>;
  }
  if (!page.gsc) {
    return <span className="text-zinc-500">0 impr.</span>;
  }
  return (
    <span className="text-zinc-400">
      {page.gsc.impressions} impr · {page.gsc.clicks} clk · {fmtPct(page.gsc.ctr)} · pos {page.gsc.position.toFixed(1)}
    </span>
  );
}

export default async function MoneyMapPageRoute() {
  const data = await buildMoneyMap();

  const bucketCounts = data.pages.reduce(
    (acc, page) => {
      if (page.bucket) acc[page.bucket] = (acc[page.bucket] ?? 0) + 1;
      return acc;
    },
    {} as Record<Exclude<MoneyMapBucket, null>, number>
  );

  const top20 = data.pages.slice(0, 20);
  const unclassifiedCount = data.pages.filter((page) => page.bucket === null).length;

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <DollarSign className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">Money Map</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Internal only. Ranks software and comparison pages with a transparent score built from
            available evidence. Missing components are excluded, not replaced with invented neutral values.
            Human-qualified affiliate priority is handled separately by the canonical Money Priority Engine.
          </p>
          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Search Console: <strong className="text-zinc-300">{data.gscFetchAvailability}</strong> —{" "}
            {data.gscFetchNote}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Revenue outbound log: {data.totalOutboundEventsSitewide} non-test event(s) included;{" "}
            {data.totalTestOutboundEventsSitewide} QA/test event(s) excluded. These stored events are not
            human-qualified because this revenue log carries no session classifier.
          </p>
        </header>

        <section className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(BUCKET_LABEL) as Array<Exclude<MoneyMapBucket, null>>).map((bucket) => (
            <Card key={bucket}>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{bucket}</p>
              <p className="mt-2 text-2xl font-bold text-white">{bucketCounts[bucket] ?? 0}</p>
              <p className="mt-1 text-xs text-zinc-500">{BUCKET_LABEL[bucket].split("— ")[1]}</p>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Pages analyzed</p>
            <p className="mt-2 text-2xl font-bold text-white">{data.totalPagesAnalyzed}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Unclassified (no bucket met evidence threshold)
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{unclassifiedCount}</p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Top 20 by Money Score"
            description="Highest near-term opportunity first. The click component is deliberately weak and uses only non-test revenue-log events; it is not a human count."
          />

          <Card className="mt-8 overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[2.2fr_1fr_1.6fr_1fr_1.6fr_1fr_1.4fr_2fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Page</span>
                <span>Type</span>
                <span>Products / coverage</span>
                <span>Score</span>
                <span>Search Console</span>
                <span>Non-test outbound log</span>
                <span>Bucket</span>
                <span>Recommended action</span>
              </div>
              <div className="divide-y divide-white/10">
                {top20.map((page) => (
                  <div key={page.url} className="grid grid-cols-[2.2fr_1fr_1.6fr_1fr_1.6fr_1fr_1.4fr_2fr] gap-4 py-3 text-sm">
                    <span className="font-medium text-white">{page.url}</span>
                    <span className="text-zinc-400">{page.pageType}</span>
                    <span className="text-zinc-400">
                      {page.products.map((product) => product.name).join(" vs ")}
                      <br />
                      <span className="text-xs text-zinc-500">coverage: {page.monetizationCoverage}</span>
                    </span>
                    <span className="text-zinc-300">{page.moneyScore}/100</span>
                    <span>
                      <RowGsc page={page} />
                    </span>
                    <span className="text-zinc-400">
                      {page.clicks.totalClicks} ({page.clicks.affiliateClicks} affiliate)
                    </span>
                    <span>
                      {page.bucket ? (
                        <Badge className={BUCKET_COLOR[page.bucket]}>{BUCKET_LABEL[page.bucket]}</Badge>
                      ) : (
                        <Badge className="border-white/10 text-zinc-500">unclassified</Badge>
                      )}
                    </span>
                    <span className="text-xs leading-5 text-zinc-500">{page.recommendedAction}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Score formula"
            description="Every available component is 0-10, weighted, then rescaled to 0-100. Missing components are excluded from the average."
          />
          <Card className="mt-8">
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>Search visibility (weight 3) — live Search Console impressions.</li>
              <li>Ranking proximity (weight 2) — live Search Console average position.</li>
              <li>CTR opportunity gap (weight 1.5) — live CTR versus a heuristic expected-CTR curve.</li>
              <li>Commercial intent (weight 2) — derived from stored pricing or explicitly labeled heuristic comparison intent.</li>
              <li>Monetization readiness (weight 2.5) — active affiliate registry coverage.</li>
              <li>Non-test outbound-log evidence (weight 1) — QA excluded; weak operational evidence only, not human-qualified traffic.</li>
            </ul>
          </Card>
        </section>
      </Container>
    </main>
  );
}
