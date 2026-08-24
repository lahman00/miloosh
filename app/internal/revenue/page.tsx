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

/**
 * Sprint 8 — internal Revenue Dashboard. Not linked from the navbar,
 * footer, homepage, or sitemap, and marked noindex/nofollow: this
 * surfaces our own commercial scoring of the dataset, not something meant
 * for public search results or casual visitors. See docs/revenue.md.
 */
export const metadata: Metadata = {
  title: "Revenue Dashboard",
  robots: { index: false, follow: false },
};

export default function RevenueDashboardPage() {
  const software = getAllSoftware();
  const scores = getRevenueScores(software);
  const tierCounts = countByTier(scores);
  const affiliateCounts = countAffiliateProgramsByStatus();
  const opportunities = getRevenueOpportunities();

  const softwareBySlug = new Map(software.map((item) => [item.slug, item]));

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <TrendingUp className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Revenue dashboard
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Internal only — not indexed, not linked from the site. Every score below is computed
            from real stored data (Phase 1 affiliate research, stored pricing model, comparison
            involvement) plus a documented editorial category-value weight. No commission figures
            are used as score inputs. See{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">docs/revenue.md</code>.
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
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Confirmed affiliate programs
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{affiliateCounts.yes}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Confirmed no program
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{affiliateCounts.no}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Unresolved (needs follow-up)
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{affiliateCounts.unknown}</p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading
            eyebrow="First-party network evidence"
            title="Partners already showing click activity"
            description="Vendor/network-side evidence is kept separate from Miloosh click telemetry and never treated as a conversion or revenue event."
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
            title="All software, ranked by revenue score"
            description="Score breakdown: affiliate availability, category value, commercial intent, buying intent."
          />

          <Card className="mt-8 overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Software</span>
                <span>Category</span>
                <span>Tier</span>
                <span>Score</span>
                <span>Affiliate</span>
                <span>Category value</span>
                <span>Intent / Buying</span>
                <span>Affiliate program</span>
              </div>
              <div className="divide-y divide-white/10">
                {scores.map((score) => {
                  const item = softwareBySlug.get(score.slug);
                  if (!item) return null;
                  const tier = getRevenueTier(score.totalScore);
                  const program = getAffiliateProgram(score.slug);

                  return (
                    <div
                      key={score.slug}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 py-3 text-sm"
                    >
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
                      <span className="text-zinc-400">
                        {score.commercialIntentScore}/10 · {score.buyingIntentScore}/10
                      </span>
                      <span className="text-zinc-400">
                        {program?.programExists === "yes"
                          ? `Yes${program.networkName ? ` (${program.networkName})` : ""}`
                          : program?.programExists === "unknown"
                            ? "Unresolved"
                            : "No"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading title="Tier rationale" description="Why each entry landed where it did." />
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
            eyebrow="Phase 5"
            title="Future revenue opportunities"
            description="Ranked by effort to activate vs. what already exists in the codebase. Full rationale in docs/revenue.md."
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