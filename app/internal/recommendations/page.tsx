import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllSoftware } from "@/data/software";
import { isOutboundTrackingEnabled } from "@/lib/revenue/events";
import { readRecommendationEventsDetailed, summarizeRecommendationEventsByProduct } from "@/lib/recommend/events";

/**
 * Sprint 10 Phase 7 — private admin report for recommendation-engine
 * usage. Same posture as /internal/revenue and /internal/outbound-clicks:
 * noindex/nofollow, disallowed in app/robots.ts (already covers /internal/
 * as a whole), not linked from the site.
 */
export const metadata: Metadata = {
  title: "Recommendation Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RecommendationAnalyticsPage() {
  const trackingEnabled = isOutboundTrackingEnabled();
  const read = readRecommendationEventsDetailed();
  const events = read.events;
  const summary = summarizeRecommendationEventsByProduct(events);
  const softwareBySlug = new Map(getAllSoftware().map((item) => [item.slug, item]));

  const generatedCount = events.filter((event) => event.type === "recommendation_generated").length;
  const shownCount = events.filter((event) => event.type === "recommendation_shown").length;
  const clickedCount = events.filter((event) => event.type === "recommendation_result_click").length;

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Compass className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Recommendation analytics
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Internal only — not indexed, not linked from the site. Tracking is currently{" "}
            <strong className="text-white">{trackingEnabled ? "enabled" : "disabled"}</strong>. See{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
              docs/recommendation-engine.md
            </code>
            .
          </p>
        </header>
        <p className="mt-6 max-w-3xl text-sm text-amber-200">{read.note}</p>

        <section className="mt-10 grid gap-6 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Recommendations generated
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{read.status === "available" ? generatedCount : "UNKNOWN"}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Products shown
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{read.status === "available" ? shownCount : "UNKNOWN"}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Result clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{read.status === "available" ? clickedCount : "UNKNOWN"}</p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Recommended software"
            description="How often each product was shown vs. actually clicked through."
          />

          {summary.length === 0 ? (
            <Card className="mt-8">
              <p className="text-sm text-zinc-400">{read.status === "available" ? "No observations in this local log." : "Production totals are unavailable from this legacy log."}</p>
            </Card>
          ) : (
            <Card className="mt-8 overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span>Software</span>
                  <span>Times shown</span>
                  <span>Times clicked</span>
                </div>
                <div className="divide-y divide-white/10">
                  {summary.map((row) => (
                    <div key={row.softwareSlug} className="grid grid-cols-[2fr_1fr_1fr] gap-4 py-3 text-sm">
                      <span className="font-medium text-white">
                        {softwareBySlug.get(row.softwareSlug)?.name ?? row.softwareSlug}
                      </span>
                      <span className="text-zinc-400">{row.timesShown}</span>
                      <span className="text-zinc-400">{row.timesClicked}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </section>
      </Container>
    </main>
  );
}
