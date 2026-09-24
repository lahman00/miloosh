import type { Metadata } from "next";
import {
  FIRST_REVENUE_CAPTURED_AT,
  FIRST_REVENUE_GSC_WINDOW,
  FIRST_REVENUE_PAGES,
} from "@/data/revenue/first-revenue-cohort";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { readOutboundEventsDetailed } from "@/lib/revenue/outbound-read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "First Revenue Funnel",
  robots: { index: false, follow: false },
};

export default async function FirstRevenueFunnelPage() {
  const evidence = await Promise.all([
    getAllFirstPartyEvents(),
    readOutboundEventsDetailed(),
  ]).catch(() => null);

  const analytics = evidence?.[0] ?? null;
  const outboundRead = evidence?.[1] ?? null;
  const handoffComplete = outboundRead?.status === "COMPLETE";
  const since = FIRST_REVENUE_CAPTURED_AT;

  const rows = FIRST_REVENUE_PAGES.map((page) => {
    const path = `/software/${page.slug}`;
    const eligibleAnalytics = analytics?.filter(
      (event) => event.isTest !== true && event.timestamp >= since,
    ) ?? [];

    const pageViews = eligibleAnalytics.filter(
      (event) => event.type === "page_view" && event.path === path,
    ).length;
    const ctaImpressions = eligibleAnalytics.filter(
      (event) => event.type === "cta_impression" && event.softwareSlug === page.slug,
    ).length;
    const ctaClicks = eligibleAnalytics.filter(
      (event) => event.type === "cta_click" && event.softwareSlug === page.slug,
    ).length;

    const merchantHandoffs = handoffComplete
      ? outboundRead.events.filter(
          (event) =>
            event.timestamp >= since &&
            event.isTest === false &&
            event.softwareSlug === page.slug &&
            event.type === "affiliate_link_click",
        ).length
      : null;

    const unclassifiedHandoffs = handoffComplete
      ? outboundRead.events.filter(
          (event) =>
            event.timestamp >= since &&
            event.isTest === undefined &&
            event.softwareSlug === page.slug &&
            event.type === "affiliate_link_click",
        ).length
      : null;

    return { page, pageViews, ctaImpressions, ctaClicks, merchantHandoffs, unclassifiedHandoffs };
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-zinc-100">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
        First Revenue Sprint
      </p>
      <h1 className="mt-2 text-3xl font-bold">Primary software funnel</h1>
      <p className="mt-3 max-w-5xl text-sm leading-6 text-zinc-400">
        Canonical cohort only: Airtable, Todoist, Close, Setmore and ElevenLabs. Google impressions
        below are the captured Search Console baseline for {FIRST_REVENUE_GSC_WINDOW.startDate} to{" "}
        {FIRST_REVENUE_GSC_WINDOW.endDate}. First-party visits and CTA events are counted from{" "}
        {FIRST_REVENUE_CAPTURED_AT} onward, so the two windows are intentionally not combined into
        one conversion rate.
      </p>
      <p className="mt-2 max-w-5xl text-xs leading-5 text-zinc-500">
        Merchant handoff means Miloosh recorded a non-test affiliate-link handoff at the server
        endpoint. It does not prove that the merchant loaded the page, created an account, made a
        sale, approved a commission, or paid revenue. Downstream conversion remains NOT VERIFIED
        until first-party network evidence exists.
      </p>

      {!analytics || !handoffComplete ? (
        <div role="alert" className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-sm text-amber-200">
          Measurement is incomplete or unavailable. Missing evidence is shown as unavailable, never as zero.
        </div>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Primary page</th>
              <th className="px-4 py-3">GSC impressions</th>
              <th className="px-4 py-3">GSC clicks</th>
              <th className="px-4 py-3">Recorded visits</th>
              <th className="px-4 py-3">CTA seen</th>
              <th className="px-4 py-3">CTA clicks</th>
              <th className="px-4 py-3">Merchant handoffs</th>
              <th className="px-4 py-3">Unclassified handoffs</th>
              <th className="px-4 py-3">Downstream conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
            {rows.map(({ page, pageViews, ctaImpressions, ctaClicks, merchantHandoffs, unclassifiedHandoffs }) => (
              <tr key={page.slug}>
                <td className="px-4 py-3">
                  <a className="font-semibold text-white hover:underline" href={"/software/" + page.slug}>
                    {page.slug}
                  </a>
                  <div className="mt-1 text-xs text-zinc-500">avg pos. {page.baseline.position.toFixed(1)}</div>
                </td>
                <td className="px-4 py-3 font-mono">{page.baseline.impressions}</td>
                <td className="px-4 py-3 font-mono">{page.baseline.clicks}</td>
                <td className="px-4 py-3 font-mono">{analytics ? pageViews : "UNAVAILABLE"}</td>
                <td className="px-4 py-3 font-mono">{analytics ? ctaImpressions : "UNAVAILABLE"}</td>
                <td className="px-4 py-3 font-mono">{analytics ? ctaClicks : "UNAVAILABLE"}</td>
                <td className="px-4 py-3 font-mono">{merchantHandoffs ?? "UNAVAILABLE"}</td>
                <td className="px-4 py-3 font-mono text-zinc-500">{unclassifiedHandoffs ?? "UNAVAILABLE"}</td>
                <td className="px-4 py-3 font-semibold text-amber-300">NOT VERIFIED</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {FIRST_REVENUE_PAGES.map((page) => (
          <article key={page.slug} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <a className="font-semibold text-white hover:underline" href={"/software/" + page.slug}>
              {page.slug}
            </a>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-zinc-400">
              {page.queries.map((item) => (
                <li key={item.query}>
                  {item.query} <span className="text-zinc-600">[{item.evidence}]</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
