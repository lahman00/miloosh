import type { FirstPartyEvent, PageViewEvent } from "@/lib/analytics/events";
import type { OutboundReadResult } from "@/lib/revenue/outbound-read";
import { FIRST_REVENUE_CAPTURED_AT, type FirstRevenuePage } from "@/data/revenue/first-revenue-cohort";

export const PRIMARY_REVENUE_CTA = "money-page-decision-card";

/** Separate complete evidence, missing evidence, and explicitly non-test events. */
export function summarizeFirstRevenuePage(
  slug: FirstRevenuePage["slug"],
  analytics: FirstPartyEvent[] | null,
  outbound: OutboundReadResult | null,
  until: string,
  since = FIRST_REVENUE_CAPTURED_AT,
) {
  const path = `/software/${slug}`;
  const lo = Date.parse(since), hi = Date.parse(until);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) throw new Error("Invalid funnel window");
  const inWindow = (timestamp: string) => {
    const ms = Date.parse(timestamp);
    return Number.isFinite(ms) && ms >= lo && ms <= hi;
  };
  const scoped = analytics?.filter((e) => e.path === path && inWindow(e.timestamp)) ?? null;
  const qaSessions = new Set(analytics?.filter((e) => e.isTest === true).map((e) => e.sessionId));
  const nonTest = scoped?.filter((e) => e.isTest === false && !qaSessions.has(e.sessionId)) ?? null;
  const sameProduct = (e: FirstPartyEvent) => "softwareSlug" in e && e.softwareSlug === slug;
  const primary = (e: FirstPartyEvent) => sameProduct(e) &&
    "ctaLocation" in e && e.ctaLocation === PRIMARY_REVENUE_CTA;
  const handoffs = outbound?.status === "COMPLETE" ? outbound.events.filter((e) =>
    e.sourcePage === path && e.softwareSlug === slug &&
    e.type === "affiliate_link_click" && e.destination === "affiliate" && inWindow(e.timestamp),
  ) : null;
  const sourceRows = new Map<string, { source: string; medium: string; campaign: string; content: string; visits: number; ctaClicks: number; recordedHandoffs: number }>();
  // Attribution is captured only on the session's landing page. Search the
  // complete supplied history, not just this money page/reporting window:
  // Google -> supporting guide -> money page must not become "unknown".
  // A later QA marker contaminates the entire session, including earlier
  // unmarked events. These are recorded non-test events, not verified humans.
  const visits = analytics?.filter((e): e is PageViewEvent =>
    e.type === "page_view" && e.isTest === false && !qaSessions.has(e.sessionId) &&
    Number.isFinite(Date.parse(e.timestamp)),
  ).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)) ?? [];
  const stableId = (e: FirstPartyEvent) => !/^s_anon(?:_|$)/.test(e.sessionId) && !/^v_anon(?:_|$)/.test(e.visitorId);
  const identity = (e: FirstPartyEvent) => JSON.stringify([e.visitorId, e.sessionId]);
  const landingByIdentity = new Map<string, PageViewEvent>();
  for (const visit of visits) {
    if (stableId(visit) && !landingByIdentity.has(identity(visit))) landingByIdentity.set(identity(visit), visit);
  }
  const touchFor = (e: FirstPartyEvent) => {
    const landing = stableId(e) ? landingByIdentity.get(identity(e)) : undefined;
    return landing && Date.parse(landing.timestamp) <= Date.parse(e.timestamp) ? landing : undefined;
  };
  for (const event of nonTest ?? []) {
    if (event.type !== "page_view" && !sameProduct(event)) continue;
    if (!["page_view", "cta_click", "outbound_click"].includes(event.type)) continue;
    const touch = touchFor(event);
    const dims = {
      source: touch?.utmSource || touch?.referrerHost || touch?.trafficSource || "unknown",
      medium: touch?.utmMedium || "unknown", campaign: touch?.utmCampaign || "none", content: touch?.utmContent || "none",
    };
    const key = JSON.stringify(dims);
    const row = sourceRows.get(key) ?? { ...dims, visits: 0, ctaClicks: 0, recordedHandoffs: 0 };
    if (event.type === "page_view") row.visits++;
    if (event.type === "cta_click") row.ctaClicks++;
    if (event.type === "outbound_click" && event.destination === "affiliate") row.recordedHandoffs++;
    sourceRows.set(key, row);
  }
  return {
    pageViews: nonTest?.filter((e) => e.type === "page_view").length ?? null,
    ctaImpressions: nonTest?.filter((e) => e.type === "cta_impression" && sameProduct(e)).length ?? null,
    ctaClicks: nonTest?.filter((e) => e.type === "cta_click" && sameProduct(e)).length ?? null,
    primaryCtaClicks: nonTest?.filter((e) => e.type === "cta_click" && primary(e)).length ?? null,
    merchantHandoffs: handoffs?.filter((e) => e.isTest === false).length ?? null,
    unclassifiedHandoffs: handoffs?.filter((e) => e.isTest === undefined).length ?? null,
    unclassifiedAnalytics: scoped?.filter((e) => e.isTest === undefined).length ?? null,
    sourceRows: nonTest === null ? null : [...sourceRows.values()],
  };
}
