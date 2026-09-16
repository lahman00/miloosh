import type { Metadata } from "next";
import { MousePointerClick } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllSoftware } from "@/data/software";
import {
  isOutboundTrackingEnabled,
  summarizeOutboundEventsByProduct,
} from "@/lib/revenue/events";
import { readOutboundEventsDetailed, countOutboundLedger } from "@/lib/revenue/outbound-read";

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
  const read = await readOutboundEventsDetailed();
  const events = read.events;
  const counts = countOutboundLedger(events);
  const summary = summarizeOutboundEventsByProduct(events.filter((event) => event.isTest !== undefined));
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
            Totals include only events explicitly marked non-test. This does not prove human traffic,
            unique visitors, conversions or revenue. Missing test markers remain unclassified.
            Do not add these counts to the separate first-party analytics store: overlap is unknown.
          </p>
        </header>

        {!trackingEnabled ? (
          <Card className="mt-10 border-amber-500/20 bg-amber-500/[0.03]">
            <p className="text-sm leading-6 text-zinc-400">
              Tracking is off, which is this project&apos;s default (see the privacy-policy
              prerequisite in <code className="rounded bg-white/10 px-1 py-0.5">docs/revenue.md</code>).
              New clicks are not being recorded right now. Existing historical records can still appear below.
            </p>
          </Card>
        ) : null}

        <Card className="mt-6">
          <p className="text-sm text-zinc-300">Read status: {read.status} ({read.backend}). Unclassified events: {counts.unclassified}. Recorded events: {counts.stored}.</p>
          {read.status !== "COMPLETE" ? <p role="alert" className="mt-2 text-sm text-amber-300">{read.status === "UNAVAILABLE" ? "Measurement unavailable, not zero traffic." : "Incomplete read. Displayed counts cover readable records only."}</p> : null}
        </Card>
        <section className="mt-10 grid gap-6 sm:grid-cols-4">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Official-site clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{read.status === "UNAVAILABLE" ? "Unavailable" : totalOfficial}</p>
          </Card>
          <Card className="border-emerald-500/20">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Affiliate-link clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{read.status === "UNAVAILABLE" ? "Unavailable" : totalAffiliate}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Vendor-link clicks
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{read.status === "UNAVAILABLE" ? "Unavailable" : totalVendorLink}</p>
          </Card>
          <Card className="border-amber-500/20">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Test clicks (excluded above)
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{read.status === "UNAVAILABLE" ? "Unavailable" : totalTest}</p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading title="Clicks by product" description="Official vs. affiliate vs. vendor-link, per software entry." />

          {summary.length === 0 ? (
            <Card className="mt-8">
              <p className="text-sm text-zinc-400">{read.status === "COMPLETE" ? "No classified outbound clicks in this view." : "Measurement is incomplete or unavailable; do not infer zero traffic."}</p>
            </Card>
          ) : (
            <Card className="mt-8 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span>Software</span>
                  <span>Official</span>
                  <span>Affiliate</span>
                  <span>Vendor link</span>
                  <span>Total (non-test)</span>
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
              <p className="text-sm text-zinc-400">{read.status === "COMPLETE" ? "No classified outbound clicks in this view." : "Measurement is incomplete or unavailable; do not infer zero traffic."}</p>
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
                        <Badge className={event.isTest === false ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                          {event.isTest === true ? "test" : event.isTest === false ? "non-test" : "unclassified"}
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
