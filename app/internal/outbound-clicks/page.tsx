import type { Metadata } from "next";
import { MousePointerClick } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllSoftware } from "@/data/software";
import {
  getOutboundEvents,
  isOutboundTrackingEnabled,
  summarizeOutboundEventsByProduct,
} from "@/lib/revenue/events";

/**
 * Sprint 9 Tasks 7-8 — private admin report over the local, first-party
 * click log (lib/revenue/events.ts). Not linked from the navbar, footer,
 * homepage, or sitemap, and marked noindex/nofollow; /internal/ is also
 * disallowed in app/robots.ts as defense in depth — same posture as
 * /internal/revenue (Sprint 8). Reads the log at request time
 * (force-dynamic) since it changes after the page is built, unlike the
 * rest of this mostly-static site.
 */
export const metadata: Metadata = {
  title: "Outbound Clicks",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DESTINATION_LABEL: Record<string, string> = {
  official_site_click: "Official site",
  affiliate_link_click: "Affiliate link",
  vendor_link_click: "Vendor link",
};

export default async function OutboundClicksReportPage() {
  const trackingEnabled = isOutboundTrackingEnabled();
  const events = await getOutboundEvents();
  const summary = summarizeOutboundEventsByProduct(events);
  const softwareBySlug = new Map(getAllSoftware().map((item) => [item.slug, item]));

  const totalOfficial = summary.reduce((sum, row) => sum + row.officialClicks, 0);
  const totalAffiliate = summary.reduce((sum, row) => sum + row.affiliateClicks, 0);
  const totalVendorLink = summary.reduce((sum, row) => sum + row.vendorLinkClicks, 0);
  const totalTest = summary.reduce((sum, row) => sum + row.testClicks, 0);

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <MousePointerClick className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Outbound clicks
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Internal only — not indexed, not linked from the site. Tracking is currently{" "}
            <strong className="text-white">{trackingEnabled ? "enabled" : "disabled"}</strong> (
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
              NEXT_PUBLIC_REVENUE_TRACKING_ENABLED
            </code>
            ). See <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">docs/revenue.md</code>.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            The three totals below exclude QA/test clicks (this project&apos;s{" "}
            <code className="rounded bg-white/10 px-1 py-0.5">?qa=1</code> convention) so a real
            first click can&apos;t hide inside routine verification noise — test clicks are
            reported separately, never discarded. Every row in the table below is a real,
            individually recorded event; each is tagged <strong className="text-white">real</strong>{" "}
            or <strong className="text-amber-300">test</strong> explicitly.
          </p>
        </header>

        {!trackingEnabled ? (
          <Card className="mt-10 border-amber-500/20 bg-amber-500/[0.03]">
            <p className="text-sm leading-6 text-zinc-400">
              Tracking is off, which is this project&apos;s default (see the privacy-policy
              prerequisite in <code className="rounded bg-white/10 px-1 py-0.5">docs/revenue.md</code>).
              No clicks are being recorded right now, so the tables below will stay empty until
              it&apos;s turned on.
            </p>
          </Card>
        ) : null}

        <section className="mt-10 grid gap-6 sm:grid-cols-4">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Official-site clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{totalOfficial}</p>
          </Card>
          <Card className="border-emerald-500/20">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Affiliate-link clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{totalAffiliate}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Vendor-link clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{totalVendorLink}</p>
          </Card>
          <Card className="border-amber-500/20">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Test clicks (excluded above)
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{totalTest}</p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading title="Clicks by product" description="Official vs. affiliate vs. vendor-link, per software entry." />

          {summary.length === 0 ? (
            <Card className="mt-8">
              <p className="text-sm text-zinc-400">No outbound clicks recorded yet.</p>
            </Card>
          ) : (
            <Card className="mt-8 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span>Software</span>
                  <span>Official</span>
                  <span>Affiliate</span>
                  <span>Vendor link</span>
                  <span>Total (real)</span>
                  <span>Test</span>
                </div>
                <div className="divide-y divide-white/10">
                  {summary.map((row) => (
                    <div
                      key={row.softwareSlug}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 py-3 text-sm"
                    >
                      <span className="font-medium text-white">
                        {softwareBySlug.get(row.softwareSlug)?.name ?? row.softwareSlug}
                      </span>
                      <span className="text-zinc-400">{row.officialClicks}</span>
                      <span className="text-zinc-400">{row.affiliateClicks}</span>
                      <span className="text-zinc-400">{row.vendorLinkClicks}</span>
                      <span className="text-zinc-300">{row.totalClicks}</span>
                      <span className="text-amber-300/80">{row.testClicks}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </section>

        <section className="mt-14">
          <SectionHeading
            title="Recent clicks"
            description="Most recent first — product, official vs. affiliate, source page, timestamp."
          />

          {events.length === 0 ? (
            <Card className="mt-8">
              <p className="text-sm text-zinc-400">No outbound clicks recorded yet.</p>
            </Card>
          ) : (
            <Card className="mt-8 overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[2fr_1.5fr_2fr_2fr_1fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span>Software</span>
                  <span>Link type</span>
                  <span>Source page</span>
                  <span>Timestamp (UTC)</span>
                  <span>Traffic</span>
                </div>
                <div className="divide-y divide-white/10">
                  {events.slice(0, 200).map((event, index) => (
                    <div
                      key={`${event.timestamp}-${index}`}
                      className="grid grid-cols-[2fr_1.5fr_2fr_2fr_1fr] gap-4 py-3 text-sm"
                    >
                      <span className="font-medium text-white">
                        {softwareBySlug.get(event.softwareSlug)?.name ?? event.softwareSlug}
                      </span>
                      <span>
                        <Badge
                          className={
                            event.destination === "affiliate"
                              ? "border-emerald-500/30 text-emerald-300"
                              : "border-white/10 text-zinc-400"
                          }
                        >
                          {DESTINATION_LABEL[event.type] ?? event.type}
                        </Badge>
                      </span>
                      <span className="text-zinc-400">{event.sourcePage}</span>
                      <span className="text-zinc-400">{event.timestamp}</span>
                      <span>
                        <Badge className={event.isTest ? "border-amber-500/30 text-amber-300" : "border-emerald-500/30 text-emerald-300"}>
                          {event.isTest ? "test" : "real"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {events.length > 200 ? (
                <p className="mt-4 text-xs text-zinc-500">
                  Showing the 200 most recent of {events.length} total recorded clicks.
                </p>
              ) : null}
            </Card>
          )}
        </section>
      </Container>
    </main>
  );
}
