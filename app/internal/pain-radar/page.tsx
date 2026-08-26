import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/ButtonLink";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllPainCandidates } from "@/lib/growth/pain-candidate-store";
import { buildPainRadarDashboard } from "@/lib/growth/pain-dashboard";

export const metadata: Metadata = {
  title: "Pain Radar Operator Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  BUILD_ASSET_NOW: "border-emerald-500/30 text-emerald-300",
  DISTRIBUTE_EXISTING_ASSET: "border-cyan-500/30 text-cyan-300",
  PREPARE_PR_HOOK: "border-violet-500/30 text-violet-300",
  REDDIT_REPLY_CANDIDATE: "border-orange-500/30 text-orange-300",
  MONITOR: "border-amber-500/30 text-amber-300",
  REJECT: "border-white/10 text-zinc-500",
};

const TREND_STYLE: Record<string, string> = {
  exploding: "border-red-500/30 text-red-300",
  accelerating: "border-orange-500/30 text-orange-300",
  rising: "border-emerald-500/30 text-emerald-300",
  stable: "border-cyan-500/30 text-cyan-300",
  cooling: "border-white/10 text-zinc-400",
  isolated: "border-white/10 text-zinc-500",
};

function MetricCard({ value, label }: { value: number; label: string }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </Card>
  );
}

function communityRuleLabel(allowsPromotion: boolean | undefined, verifiedAt: string | undefined): string {
  if (!verifiedAt) return "HUMAN_REVIEW: rules not verified";
  if (allowsPromotion === true) return `promotion allowed · verified ${verifiedAt}`;
  if (allowsPromotion === false) return `promotion not allowed · verified ${verifiedAt}`;
  return `HUMAN_REVIEW: ambiguous · checked ${verifiedAt}`;
}

export default async function PainRadarDashboardPage() {
  const candidates = await getAllPainCandidates();
  const dashboard = buildPainRadarDashboard(candidates);

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Radar className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Pain Radar</h1>
            <Badge className="border-amber-500/30 text-amber-300">Internal only</Badge>
          </div>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Operator view of persisted buyer-pain signals, scored actions, corroborating clusters, lifecycle state, and
            measured outcomes. Community complaints remain demand signals, not vendor truth.
          </p>
          <p className="mt-3 text-sm text-zinc-500">Generated {dashboard.generatedAt} from the live PainCandidate store.</p>
        </header>

        <section className="mt-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard value={dashboard.summary.totalCandidates} label="Persisted signals" />
            <MetricCard value={dashboard.summary.freshCandidates} label="Fresh ≤30d" />
            <MetricCard value={dashboard.summary.verifiedCandidates} label="Vendor facts verified" />
            <MetricCard value={dashboard.summary.actionableCandidates} label="Actionable now" />
            <MetricCard value={dashboard.clusters.length} label="Pain clusters" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard value={dashboard.summary.publishedRemedies} label="Published remedies" />
            <MetricCard value={dashboard.summary.distributedCandidates} label="Distributed" />
            <MetricCard value={dashboard.summary.attributedHumanSessions} label="Human sessions" />
            <MetricCard value={dashboard.summary.attributedCtaClicks} label="CTA clicks" />
            <MetricCard value={dashboard.summary.attributedAffiliateClicks} label="Affiliate clicks" />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Top fresh pain signals"
            description="Up to 20 persisted signals from the last 30 days, ranked by the deterministic Pain Radar score. If no signal is fresh, the strongest persisted signals are shown instead."
          />
          {dashboard.signals.length === 0 ? (
            <Card className="mt-6">
              <p className="text-sm text-zinc-400">No persisted PainCandidate records are available in this runtime.</p>
            </Card>
          ) : (
            <div className="mt-6 space-y-3">
              {dashboard.signals.map((signal) => (
                <Card key={signal.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{signal.title}</p>
                        <Badge className={ACTION_STYLE[signal.action] ?? "border-white/10 text-zinc-400"}>
                          {signal.action}
                        </Badge>
                        {signal.affiliateRelevant ? (
                          <Badge className="border-emerald-500/30 text-emerald-300">affiliate relevant</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {signal.vendor ?? signal.product ?? "Unknown vendor"} · {signal.intent} · {signal.normalizedPainClass}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>verification: {signal.verificationState}</span>
                        <span>remedy: {signal.remedyState}{signal.remedyAction ? ` / ${signal.remedyAction}` : ""}</span>
                        <span>distribution: {signal.distributionState}</span>
                        <span>discovered: {signal.discoveredAt}</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        community: {communityRuleLabel(signal.communityAllowsPromotion, signal.communityRulesVerifiedAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>humans {signal.classifiedHumanSessions}</span>
                        <span>CTA {signal.ctaClicks}</span>
                        <span>leads {signal.leads}</span>
                        <span>affiliate clicks {signal.affiliateClicks}</span>
                      </div>
                      {signal.sourceHref ? (
                        <a
                          href={signal.sourceHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-xs text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-white"
                        >
                          Source: {signal.sourceHost}
                        </a>
                      ) : (
                        <p className="mt-3 text-xs text-red-300">Source URL is not a safe HTTP(S) destination.</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-3xl font-bold text-white">{signal.score}</p>
                      <p className="text-xs text-zinc-500">score / 100</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Corroborating pain clusters"
            description="Cross-signal grouping by vendor, normalized pain class, and 30-day window. Single signals remain explicitly isolated rather than being presented as trends."
          />
          {dashboard.clusters.length === 0 ? (
            <Card className="mt-6">
              <p className="text-sm text-zinc-400">No clusterable signals yet.</p>
            </Card>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[1.5fr_1.5fr_.7fr_.7fr_1fr_1fr_2.2fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span>Vendor</span>
                  <span>Pain class</span>
                  <span>Signals</span>
                  <span>Sources</span>
                  <span>Velocity</span>
                  <span>Trend</span>
                  <span>Explanation</span>
                </div>
                <div className="divide-y divide-white/10">
                  {dashboard.clusters.map((cluster) => (
                    <div key={cluster.id} className="grid grid-cols-[1.5fr_1.5fr_.7fr_.7fr_1fr_1fr_2.2fr] gap-4 py-4 text-sm">
                      <span className="font-medium text-white">{cluster.vendor}</span>
                      <span className="text-zinc-400">{cluster.normalizedPainClass}</span>
                      <span className="text-zinc-300">{cluster.signalCount}</span>
                      <span className="text-zinc-300">{cluster.uniqueSourceCount}</span>
                      <span className="text-zinc-300">{cluster.painVelocityScore}/100</span>
                      <span>
                        <Badge className={TREND_STYLE[cluster.trendDirection] ?? "border-white/10 text-zinc-400"}>
                          {cluster.trendDirection}
                        </Badge>
                      </span>
                      <span className="text-xs leading-5 text-zinc-500">{cluster.painVelocityExplanation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-14">
          <SectionHeading title="Measured outcomes" description="Attribution is shown only when persisted on the candidate. Zero means no measured outcome is currently recorded, not proof of zero real-world impact." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard value={dashboard.summary.attributedHumanSessions} label="Classified human sessions" />
            <MetricCard value={dashboard.summary.attributedCtaClicks} label="CTA clicks" />
            <MetricCard value={dashboard.summary.attributedLeads} label="Leads" />
            <MetricCard value={dashboard.summary.attributedAffiliateClicks} label="Affiliate clicks" />
          </div>
          <Card className="mt-4 border-amber-500/20">
            <p className="text-sm font-semibold text-amber-200">Revenue attribution is not stored on PainCandidate yet.</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              The current durable outcome schema ends at affiliate clicks. This dashboard therefore does not invent a
              revenue number. Wiring verified commission/revenue outcomes back to a PainCandidate remains a separate
              issue #4 completion step.
            </p>
          </Card>
        </section>

        <section className="mt-16 border-t border-white/10 pt-10 text-center">
          <p className="mx-auto max-w-2xl text-sm text-zinc-500">
            This page is read-only. It does not publish content, post to communities, verify vendor facts automatically,
            or bypass community rules. All /internal routes remain protected by the existing dashboard auth gate.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/internal/growth" variant="secondary">Growth/QA dashboard</ButtonLink>
            <ButtonLink href="/internal/money-map" variant="secondary">Money map</ButtonLink>
          </div>
        </section>
      </Container>
    </main>
  );
}
