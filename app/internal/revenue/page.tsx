import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllSoftware } from "@/data/software";
import { getCategoryName } from "@/data/categories";
import { NETWORK_PERFORMANCE_SIGNALS } from "@/data/affiliate/network-performance-signals";
import { getRevenueScores } from "@/lib/revenue/scoring";
import { getRevenueTier, countByTier, explainTier } from "@/lib/revenue/tiers";
import { getAffiliateProgram, countAffiliateProgramsByStatus } from "@/lib/revenue/affiliate-manager";
import { getRevenueOpportunities } from "@/lib/revenue/opportunities";

export const metadata: Metadata = {
  title: "Revenue Dashboard",
  robots: { index: false, follow: false },
};

export default function RevenueDashboardPage() {
  const software = getAllSoftware();
  const scores = getRevenueScores(software);
  const tierCounts = countByTier(scores);
  const publicProgramCounts = countAffiliateProgramsByStatus();
  const opportunities = getRevenueOpportunities();
  const softwareBySlug = new Map(software.map((item) => [item.slug, item]));

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <TrendingUp className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">Revenue dashboard</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Internal static opportunity view. Affiliate scoring uses Miloosh&apos;s current relationship truth:
            active, approved, pending, owner-blocked, rejected or absent. Generic vendor program existence can
            only contribute a lower fallback score when no Miloosh relationship exists. Comparison count is
            content coverage, not measured user buying intent. No commission percentage is used as a score input.
          </p>
        </header>

        <section className="mt-12 grid gap-6 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tier A</p>
            <p className="mt-2 text-3xl font-bold text-white">{tierCounts.A}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tier B</p>
            <p className="mt-2 text-3xl font-bold text-white">{tierCounts.B}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tier C</p>
            <p className="mt-2 text-3xl font-bold text-white">{tierCounts.C}</p>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Public programs found in research</p>
            <p className="mt-2 text-3xl font-bold text-white">{publicProgramCounts.yes}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Public no-program findings</p>
            <p className="mt-2 text-3xl font-bold text-white">{publicProgramCounts.no}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Public-program research unresolved</p>
            <p className="mt-2 text-3xl font-bold text-white">{publicProgramCounts.unknown}</p>
          </Card>
        </section>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          These three cards describe vendor public-program research only. They are not Miloosh approval counts and do not override the current relationship ledger.
        </p>

        <section className="mt-14">
          <SectionHeading
            eyebrow="First-party network evidence"
            title="Partners already showing click activity"
            description="Vendor/network-side evidence stays separate from Miloosh telemetry and is never treated as a conversion, revenue event or proof of the originating page."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {NETWORK_PERFORMANCE_SIGNALS.map((signal) => {
              const item = softwareBySlug.get(signal.partnerSlug);
              return (
                <Card key={`${signal.partnerSlug}-${signal.observedAt}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{item?.name ?? signal.partnerSlug}</h3>
                    <Badge>{signal.signal === "CLICK_MILESTONE" ? `${signal.clickFloor}+ clicks` : "New clicks"}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{signal.summary}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Observed {signal.observedAt} via {signal.network}. This proves neither a sale nor revenue and does not identify the originating Miloosh page.
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            title="All software, ranked by static revenue score"
            description="Score breakdown: current Miloosh affiliate availability, category value, stored commercial intent and comparison coverage. Live human-qualified revenue priority is a separate engine."
          />

          <Card className="mt-8 overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Software</span>
                <span>Category</span>
                <span>Tier</span>
                <span>Score</span>
                <span>Relationship</span>
                <span>Category value</span>
                <span>Intent / Coverage</span>
                <span>Public program research</span>
              </div>
              <div className="divide-y divide-white/10">
                {scores.map((score) => {
                  const item = softwareBySlug.get(score.slug);
                  if (!item) return null;
                  const tier = getRevenueTier(score.totalScore);
                  const program = getAffiliateProgram(score.slug);

                  return (
                    <div key={score.slug} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 py-3 text-sm">
                      <span className="font-medium text-white">{item.name}</span>
                      <span className="text-zinc-400">{getCategoryName(item.category)}</span>
                      <span>
                        <Badge
                          className={
                            tier === "A"
                              ? "border-emerald-500/30 text-emerald-300"
                              : tier === "B"
                                ? "border-amber-500/30 text-amber-300"
                                : "border-white/10 text-zinc-400"
                          }
                        >
                          Tier {tier}
                        </Badge>
                      </span>
                      <span className="text-zinc-300">{score.totalScore}/100</span>
                      <span className="text-zinc-400">{score.affiliateAvailabilityScore}/10</span>
                      <span className="text-zinc-400">{score.categoryValueScore}/10</span>
                      <span className="text-zinc-400">{score.commercialIntentScore}/10 · {score.buyingIntentScore}/10</span>
                      <span className="text-zinc-400">
                        {program?.programExists === "yes"
                          ? `Exists${program.networkName ? ` (${program.networkName})` : ""}`
                          : program?.programExists === "unknown"
                            ? "Unresolved"
                            : program
                              ? "No public program"
                              : "Not researched"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading title="Tier rationale" description="Why each static repository score landed where it did." />
          <div className="mt-8 grid gap-4">
            {scores.map((score) => {
              const item = softwareBySlug.get(score.slug);
              if (!item) return null;
              return (
                <Card key={score.slug} className="flex items-center justify-between gap-4">
                  <span className="font-medium text-white">{item.name}</span>
                  <span className="text-sm text-zinc-400">{explainTier(score)}</span>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            eyebrow="Strategic backlog"
            title="Future revenue models"
            description="Architecture-level ideas only. These are not vendor approvals, measured demand or current revenue forecasts."
          />
          <div className="mt-8 grid gap-4">
            {opportunities.map((opportunity) => (
              <Card key={opportunity.name}>
                <div className="flex items-center gap-3">
                  <Badge>#{opportunity.rank}</Badge>
                  <h3 className="text-lg font-semibold text-white">{opportunity.name}</h3>
                </div>
                <p className="mt-3 leading-6 text-zinc-400">{opportunity.summary}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{opportunity.rationale}</p>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
