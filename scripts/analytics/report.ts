import { getAllFirstPartyEvents, type FirstPartyEvent } from "@/lib/analytics/events";
import { getOutboundEvents, type StoredOutboundEvent } from "@/lib/revenue/events";
import { LEGACY_CONTAMINATED_SESSIONS, isLegacyContaminatedSession } from "@/lib/analytics/legacy-contaminated-sessions";
import { classifySessions, classifyVisitors, summarizeBuckets, type TrafficBucket } from "@/lib/analytics/human-classification";

/**
 * Flippa Activation + Recommend Expansion Super-Mission (2026-08-21) —
 * Phase 26: Recommend usage broken down by PRIMARY DOMAIN (an aggregate
 * enum value, never personal/free text). Kept as a standalone function
 * rather than threaded into computePeriodMetrics's Set-based tracking —
 * simpler to verify correct in isolation. Joins outbound_click to a
 * domain via the same visitor's most recent recommend-domain touch in the
 * same session (the events are already sorted chronologically by the
 * caller), same "chronologically-prior touch" logic as the existing
 * outboundClickersAfter metric.
 */
export interface DomainFunnelRow {
  domain: string;
  completers: number;
  resultViewers: number;
  productOpeners: number;
  comparisonOpeners: number;
  outboundClickersAfter: number;
}

export function computeRecommendDomainBreakdown(events: FirstPartyEvent[], includeSynthetic = false): DomainFunnelRow[] {
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const byDomain = new Map<string, { completers: Set<string>; resultViewers: Set<string>; productOpeners: Set<string>; comparisonOpeners: Set<string>; outboundClickersAfter: Set<string> }>();
  const lastDomainTouchByVisitor = new Map<string, string>();

  function bucket(domain: string) {
    if (!byDomain.has(domain)) {
      byDomain.set(domain, { completers: new Set(), resultViewers: new Set(), productOpeners: new Set(), comparisonOpeners: new Set(), outboundClickersAfter: new Set() });
    }
    return byDomain.get(domain)!;
  }

  for (const e of sorted) {
    if (isSyntheticOrTestEvent(e, includeSynthetic)) continue;

    if (e.type === "recommend_completed" && e.domain) {
      bucket(e.domain).completers.add(e.visitorId);
      lastDomainTouchByVisitor.set(e.visitorId, e.domain);
    } else if (e.type === "recommend_result_viewed" && e.domain) {
      bucket(e.domain).resultViewers.add(e.visitorId);
      lastDomainTouchByVisitor.set(e.visitorId, e.domain);
    } else if (e.type === "recommend_product_open" && e.domain) {
      bucket(e.domain).productOpeners.add(e.visitorId);
    } else if (e.type === "recommend_comparison_open" && e.domain) {
      bucket(e.domain).comparisonOpeners.add(e.visitorId);
    } else if (e.type === "outbound_click") {
      const domain = lastDomainTouchByVisitor.get(e.visitorId);
      if (domain) bucket(domain).outboundClickersAfter.add(e.visitorId);
    }
  }

  return [...byDomain.entries()]
    .map(([domain, b]) => ({
      domain,
      completers: b.completers.size,
      resultViewers: b.resultViewers.size,
      productOpeners: b.productOpeners.size,
      comparisonOpeners: b.comparisonOpeners.size,
      outboundClickersAfter: b.outboundClickersAfter.size,
    }))
    .sort((a, b) => b.completers - a.completers);
}

/**
 * WAR MODE mission (2026-08-22) Phase 21 — CTA exposure vs. click, by
 * (softwareSlug, ctaLocation). Answers a question the funnel couldn't
 * answer before: of the people who actually saw a given CTA on screen,
 * how many clicked it? Distinct from the funnel's "MEANINGFUL CTA CLICK"
 * stage, which only counts clicks against total page visitors — it can't
 * tell "the CTA converts badly" apart from "almost nobody scrolled to
 * it." Joined per-visitor (an impression and a click from the same
 * visitor for the same slug+location), not just raw counts, so a single
 * visitor bouncing back and forth doesn't inflate the click side.
 */
export interface CtaExposureRow {
  softwareSlug: string;
  ctaLocation: string;
  impressions: number;
  clicks: number;
}

export function computeCtaExposure(events: FirstPartyEvent[], includeSynthetic = false): CtaExposureRow[] {
  const key = (slug: string, loc: string | undefined) => `${slug}|||${loc ?? "(unspecified)"}`;
  const impressionVisitorsByKey = new Map<string, Set<string>>();
  const clickVisitorsByKey = new Map<string, Set<string>>();

  for (const e of events) {
    if (isSyntheticOrTestEvent(e, includeSynthetic)) continue;

    if (e.type === "cta_impression") {
      const k = key(e.softwareSlug, e.ctaLocation);
      if (!impressionVisitorsByKey.has(k)) impressionVisitorsByKey.set(k, new Set());
      impressionVisitorsByKey.get(k)!.add(e.visitorId);
    } else if (e.type === "outbound_click") {
      const k = key(e.softwareSlug, e.ctaLocation);
      if (!clickVisitorsByKey.has(k)) clickVisitorsByKey.set(k, new Set());
      clickVisitorsByKey.get(k)!.add(e.visitorId);
    }
  }

  const rows: CtaExposureRow[] = [];
  for (const [k, impressionVisitors] of impressionVisitorsByKey.entries()) {
    const [softwareSlug, ctaLocation] = k.split("|||") as [string, string];
    const clickVisitors = clickVisitorsByKey.get(k) ?? new Set<string>();
    let clicks = 0;
    for (const vid of clickVisitors) {
      if (impressionVisitors.has(vid)) clicks++;
    }
    rows.push({ softwareSlug, ctaLocation, impressions: impressionVisitors.size, clicks });
  }

  return rows.sort((a, b) => b.impressions - a.impressions);
}

/**
 * TRAFFIC ACQUISITION WAR MODE mission (2026-08-22) Phase 2 — per-source
 * funnel, not just a landing-page-view count. Attributes each visitor to
 * the TrafficSource on their earliest page_view (their true landing
 * touch, not whichever page_view happens to be sorted first), then
 * reports the same engagement/commercial-intent/CTA/outbound shape as
 * the main funnel, broken down by source. A source sending 100 bounces
 * is a materially different result from one sending 5 engaged buyers —
 * this is what makes that visible, which a flat visitor-count-by-source
 * table cannot.
 */
export interface AcquisitionSourceRow {
  source: string;
  visitors: number;
  engaged: number;
  multiPage: number;
  commercialPageVisitors: number;
  ctaImpressions: number;
  ctaClickers: number;
  outboundClickers: number;
  affiliateClickers: number;
}

export function computeAcquisitionSourceBreakdown(events: FirstPartyEvent[], includeSynthetic = false): AcquisitionSourceRow[] {
  const real = events.filter((e) => !isSyntheticOrTestEvent(e, includeSynthetic));
  const sorted = [...real].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const sourceByVisitor = new Map<string, string>();
  const pageViewCountByVisitor = new Map<string, number>();
  for (const e of sorted) {
    if (e.type !== "page_view") continue;
    if (!sourceByVisitor.has(e.visitorId)) {
      sourceByVisitor.set(e.visitorId, e.trafficSource ?? "unknown");
    }
    pageViewCountByVisitor.set(e.visitorId, (pageViewCountByVisitor.get(e.visitorId) ?? 0) + 1);
  }

  type Bucket = {
    visitors: Set<string>;
    engaged: Set<string>;
    multiPage: Set<string>;
    commercialPageVisitors: Set<string>;
    ctaImpressions: Set<string>;
    ctaClickers: Set<string>;
    outboundClickers: Set<string>;
    affiliateClickers: Set<string>;
  };
  const buckets = new Map<string, Bucket>();
  function bucket(source: string): Bucket {
    if (!buckets.has(source)) {
      buckets.set(source, {
        visitors: new Set(), engaged: new Set(), multiPage: new Set(), commercialPageVisitors: new Set(),
        ctaImpressions: new Set(), ctaClickers: new Set(), outboundClickers: new Set(), affiliateClickers: new Set(),
      });
    }
    return buckets.get(source)!;
  }

  for (const visitorId of sourceByVisitor.keys()) {
    const source = sourceByVisitor.get(visitorId)!;
    bucket(source).visitors.add(visitorId);
    if ((pageViewCountByVisitor.get(visitorId) ?? 0) >= 2) {
      bucket(source).multiPage.add(visitorId);
      bucket(source).engaged.add(visitorId);
    }
  }

  for (const e of sorted) {
    const source = sourceByVisitor.get(e.visitorId);
    if (!source) continue; // no page_view ever recorded for this visitor — shouldn't happen, but never attribute to a guessed source
    const b = bucket(source);

    if (e.type === "engaged_view") {
      b.engaged.add(e.visitorId);
    } else if (e.type === "software_view" || e.type === "comparison_view") {
      b.commercialPageVisitors.add(e.visitorId);
    } else if (e.type === "cta_impression") {
      b.ctaImpressions.add(e.visitorId);
    } else if (e.type === "outbound_click") {
      b.ctaClickers.add(e.visitorId);
      b.outboundClickers.add(e.visitorId);
      if (e.destination === "affiliate") b.affiliateClickers.add(e.visitorId);
    } else if (e.type === "internal_cta_click") {
      b.ctaClickers.add(e.visitorId);
    }
  }

  return [...buckets.entries()]
    .map(([source, b]) => ({
      source,
      visitors: b.visitors.size,
      engaged: b.engaged.size,
      multiPage: b.multiPage.size,
      commercialPageVisitors: b.commercialPageVisitors.size,
      ctaImpressions: b.ctaImpressions.size,
      ctaClickers: b.ctaClickers.size,
      outboundClickers: b.outboundClickers.size,
      affiliateClickers: b.affiliateClickers.size,
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Phase 0 — the
 * durable acquisition scoreboard. Deliberately NOT separately-persisted
 * state (a second source of truth that could drift from the real event
 * store) -- every real event already carries a server-stamped timestamp
 * (app/api/analytics/event/route.ts, never client-supplied), so the exact
 * moment cumulative distinct real visitors first crossed each milestone
 * is fully recoverable by replaying events in order. "Never claim a
 * milestone until telemetry proves it": a milestone is `reached: true`
 * only once real (non-synthetic, non-legacy-contaminated) visitor #N has
 * actually been recorded, never interpolated or estimated.
 */
export const ACQUISITION_MILESTONES = [
  { name: "A", threshold: 100 },
  { name: "B", threshold: 300 },
  { name: "C", threshold: 500 },
  { name: "D", threshold: 1000 },
] as const;

export interface AcquisitionMilestoneStatus {
  name: string;
  threshold: number;
  reached: boolean;
  reachedAt: string | null;
  visitorsRemaining: number;
}

/**
 * MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23) Phase 7 --
 * "a jump such as 28 -> 60 must not be reported as human growth until
 * classification runs." `cumulativeRealVisitors`/`milestones` below keep
 * their EXACT original meaning and behavior (raw REAL_OR_UNKNOWN_HUMAN
 * visitor count -- everything that merely isn't proven test/legacy
 * traffic) for backward compatibility with the existing milestone tests
 * and any caller relying on that semantic. They must never be presented
 * as "confirmed human growth" on their own -- see
 * `cumulativeConfirmedOrStrongVisitors`/`milestonesConfirmedOrStrong`,
 * computed via lib/analytics/human-classification.ts's session-level
 * evidence rules, which is what actually answers "how many real humans."
 */
export function computeAcquisitionMilestones(
  events: FirstPartyEvent[]
): {
  cumulativeRealVisitors: number;
  milestones: AcquisitionMilestoneStatus[];
  cumulativeConfirmedOrStrongVisitors: number;
  milestonesConfirmedOrStrong: AcquisitionMilestoneStatus[];
} {
  const real = events.filter((e) => !isSyntheticOrTestEvent(e));
  const sorted = [...real].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const seenVisitors = new Set<string>();
  const crossedAt = new Map<number, string>();

  for (const e of sorted) {
    if (seenVisitors.has(e.visitorId)) continue;
    seenVisitors.add(e.visitorId);
    for (const m of ACQUISITION_MILESTONES) {
      if (seenVisitors.size === m.threshold && !crossedAt.has(m.threshold)) {
        crossedAt.set(m.threshold, e.timestamp);
      }
    }
  }

  const cumulativeRealVisitors = seenVisitors.size;
  const milestones = ACQUISITION_MILESTONES.map((m) => ({
    name: m.name,
    threshold: m.threshold,
    reached: cumulativeRealVisitors >= m.threshold,
    reachedAt: crossedAt.get(m.threshold) ?? null,
    visitorsRemaining: Math.max(0, m.threshold - cumulativeRealVisitors),
  }));

  // Classified track: only CONFIRMED_CLEAN/STRONG_HUMAN_EVIDENCE visitors count.
  // Uses the SAME real (non-synthetic) event set, then applies session-level
  // behavioral classification on top -- a raw event/visitor count alone is
  // never sufficient evidence of humanity (see human-classification.ts).
  const classifications = classifySessions(real);
  const visitorClassifications = classifyVisitors(classifications);
  const qualifyingVisitorIds = new Set(visitorClassifications.filter((v) => v.bucket === "CONFIRMED_CLEAN" || v.bucket === "STRONG_HUMAN_EVIDENCE").map((v) => v.visitorId));
  const bestSessionByVisitor = new Map(visitorClassifications.map((v) => [v.visitorId, v.bestSessionId]));
  const earliestQualifyingEventByVisitor = new Map<string, string>();
  for (const e of sorted) {
    if (!qualifyingVisitorIds.has(e.visitorId)) continue;
    if (e.sessionId !== bestSessionByVisitor.get(e.visitorId)) continue;
    if (!earliestQualifyingEventByVisitor.has(e.visitorId)) earliestQualifyingEventByVisitor.set(e.visitorId, e.timestamp);
  }

  const seenConfirmedOrStrong = new Set<string>();
  const crossedAtConfirmedOrStrong = new Map<number, string>();
  const orderedQualifying = [...earliestQualifyingEventByVisitor.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  for (const [visitorId, timestamp] of orderedQualifying) {
    seenConfirmedOrStrong.add(visitorId);
    for (const m of ACQUISITION_MILESTONES) {
      if (seenConfirmedOrStrong.size === m.threshold && !crossedAtConfirmedOrStrong.has(m.threshold)) {
        crossedAtConfirmedOrStrong.set(m.threshold, timestamp);
      }
    }
  }
  const cumulativeConfirmedOrStrongVisitors = seenConfirmedOrStrong.size;
  const milestonesConfirmedOrStrong = ACQUISITION_MILESTONES.map((m) => ({
    name: m.name,
    threshold: m.threshold,
    reached: cumulativeConfirmedOrStrongVisitors >= m.threshold,
    reachedAt: crossedAtConfirmedOrStrong.get(m.threshold) ?? null,
    visitorsRemaining: Math.max(0, m.threshold - cumulativeConfirmedOrStrongVisitors),
  }));

  return { cumulativeRealVisitors, milestones, cumulativeConfirmedOrStrongVisitors, milestonesConfirmedOrStrong };
}

export interface PeriodSummary {
  periodName: string;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  sessions: number;
  engagedVisitors: number;
  multiPageVisitors: number;
  totalPageViews: number;
  softwareVisitors: number;
  comparisonVisitors: number;
  categoryVisitors: number;
  guideVisitors: number;
  recommendUsers: number;
  meaningfulClickers: number;
  outboundClickers: number;
  affiliateClickers: number;
  funnel: {
    stage: string;
    uniquePeople: number;
    pctOfTotalVisitors: string;
    conversionFromPrev: string;
  }[];
  topLandingPages: { path: string; visits: number }[];
  topExitPages: { path: string; exits: number }[];
  topPages: { path: string; views: number }[];
  topSoftware: { slug: string; views: number }[];
  topComparisons: { slug: string; views: number }[];
  topCategories: { slug: string; views: number }[];
  topGuides: { slug: string; views: number }[];
  topOutboundDestinations: { url: string; clicks: number }[];
  topAffiliateProducts: { slug: string; clicks: number }[];
  recommendFunnel: RecommendFunnelSummary;
}

/** People/sessions/events, kept separate per Phase 8 — "Never infer people from event count." */
export interface RecommendFunnelMetric {
  people: number;
  sessions: number;
  events: number;
}

export interface RecommendFunnelSummary {
  visitors: RecommendFunnelMetric;
  starters: RecommendFunnelMetric;
  completers: RecommendFunnelMetric;
  completionRate: string;
  resultViewers: RecommendFunnelMetric;
  productOpeners: RecommendFunnelMetric;
  comparisonOpeners: RecommendFunnelMetric;
  outboundClickersAfter: RecommendFunnelMetric;
  affiliateClickersAfter: RecommendFunnelMetric;
}

/**
 * Recommend Engine Integrity Patch (2026-08-21): also treats a known
 * legacy-contaminated session (recorded before the isTest marker existed,
 * investigated and found unable to be proven organic — see
 * lib/analytics/legacy-contaminated-sessions.ts) as synthetic. This is an
 * explicit, auditable, per-session annotation applied only here at report
 * time — the underlying stored events are never mutated or deleted.
 *
 * `includeSynthetic` is the --include-synthetic debug override (Phase 1's
 * "keep an optional mode for debugging"): when true, nothing is filtered
 * out by this function, regardless of marker or legacy classification.
 */
export function isSyntheticOrTestEvent(e: FirstPartyEvent, includeSynthetic = false): boolean {
  if (includeSynthetic) return false;
  if (e.isTest) return true;
  if (e.visitorId.startsWith("v_test_") || e.visitorId.startsWith("v_synthetic_") || e.visitorId.startsWith("v_anon_test")) return true;
  if (e.sessionId.startsWith("s_test_") || e.sessionId.startsWith("s_synthetic_") || e.sessionId.startsWith("s_anon_test")) return true;
  if (isLegacyContaminatedSession(e.sessionId)) return true;
  return false;
}

export function filterEventsByDate(events: FirstPartyEvent[], startDateIso: string, endDateIso?: string, includeSynthetic = false): FirstPartyEvent[] {
  return events.filter(e => {
    if (isSyntheticOrTestEvent(e, includeSynthetic)) return false;
    if (e.timestamp < startDateIso) return false;
    if (endDateIso && e.timestamp > endDateIso) return false;
    return true;
  });
}

export function computePeriodMetrics(
  periodName: string,
  events: FirstPartyEvent[],
  allHistoricalEvents: FirstPartyEvent[] = [],
  legacyClicks: StoredOutboundEvent[] = [],
  includeSynthetic = false
): PeriodSummary {
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const sessionsByVisitor = new Map<string, Set<string>>();
  const pageViewsByVisitor = new Map<string, number>();
  const engagedVisitors = new Set<string>();
  const softwareVisitors = new Set<string>();
  const comparisonVisitors = new Set<string>();
  const categoryVisitors = new Set<string>();
  const guideVisitors = new Set<string>();
  const meaningfulClickers = new Set<string>();
  const outboundClickers = new Set<string>();
  const affiliateClickers = new Set<string>();

  // Phase 8 — Recommend funnel, kept as separate people/sessions/events
  // trackers so nothing here silently infers "people" from "events".
  const rfVisitorsP = new Set<string>(), rfVisitorsS = new Set<string>(); let rfVisitorsE = 0;
  const rfStartersP = new Set<string>(), rfStartersS = new Set<string>(); let rfStartersE = 0;
  const rfCompletersP = new Set<string>(), rfCompletersS = new Set<string>(); let rfCompletersE = 0;
  const rfResultViewersP = new Set<string>(), rfResultViewersS = new Set<string>(); let rfResultViewersE = 0;
  const rfProductOpenersP = new Set<string>(), rfProductOpenersS = new Set<string>(); let rfProductOpenersE = 0;
  const rfComparisonOpenersP = new Set<string>(), rfComparisonOpenersS = new Set<string>(); let rfComparisonOpenersE = 0;
  const rfOutboundAfterP = new Set<string>(), rfOutboundAfterS = new Set<string>(); let rfOutboundAfterE = 0;
  const rfAffiliateAfterP = new Set<string>(), rfAffiliateAfterS = new Set<string>(); let rfAffiliateAfterE = 0;
  const firstRecommendTouchByVisitor = new Map<string, string>();
  const RECOMMEND_TOUCH_TYPES = new Set([
    "recommend_use", "recommend_started", "recommend_need_selected", "recommend_completed",
    "recommend_result_viewed", "recommend_product_open", "recommend_comparison_open",
  ]);

  const landingPageCounts = new Map<string, number>();
  const sessionLastPage = new Map<string, { path: string; timestamp: string }>();
  const pageCounts = new Map<string, number>();
  const softwareCounts = new Map<string, number>();
  const comparisonCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const guideCounts = new Map<string, number>();
  const outboundCounts = new Map<string, number>();
  const affiliateCounts = new Map<string, number>();

  let totalPageViews = 0;

  // Build global session map to calculate new vs returning visitors across all time
  const globalSessionsByVisitor = new Map<string, Set<string>>();
  for (const he of allHistoricalEvents) {
    if (isSyntheticOrTestEvent(he, includeSynthetic)) continue;
    if (!globalSessionsByVisitor.has(he.visitorId)) {
      globalSessionsByVisitor.set(he.visitorId, new Set<string>());
    }
    globalSessionsByVisitor.get(he.visitorId)!.add(he.sessionId);
  }

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const e of sortedEvents) {
    if (isSyntheticOrTestEvent(e, includeSynthetic)) continue;

    // Track landing page: first page view per session
    if (!sessions.has(e.sessionId) && e.type === "page_view") {
      landingPageCounts.set(e.path, (landingPageCounts.get(e.path) ?? 0) + 1);
    }

    visitors.add(e.visitorId);
    sessions.add(e.sessionId);

    if (!sessionsByVisitor.has(e.visitorId)) {
      sessionsByVisitor.set(e.visitorId, new Set<string>());
    }
    sessionsByVisitor.get(e.visitorId)!.add(e.sessionId);

    if (RECOMMEND_TOUCH_TYPES.has(e.type)) {
      rfVisitorsP.add(e.visitorId);
      rfVisitorsS.add(e.sessionId);
      rfVisitorsE++;
      if (!firstRecommendTouchByVisitor.has(e.visitorId)) {
        firstRecommendTouchByVisitor.set(e.visitorId, e.timestamp);
      }
    }

    if (e.type === "page_view") {
      totalPageViews++;
      pageViewsByVisitor.set(e.visitorId, (pageViewsByVisitor.get(e.visitorId) ?? 0) + 1);
      pageCounts.set(e.path, (pageCounts.get(e.path) ?? 0) + 1);
      sessionLastPage.set(e.sessionId, { path: e.path, timestamp: e.timestamp });
    } else if (e.type === "engaged_view") {
      engagedVisitors.add(e.visitorId);
    } else if (e.type === "software_view") {
      softwareVisitors.add(e.visitorId);
      softwareCounts.set(e.softwareSlug, (softwareCounts.get(e.softwareSlug) ?? 0) + 1);
    } else if (e.type === "comparison_view") {
      comparisonVisitors.add(e.visitorId);
      comparisonCounts.set(e.comparisonSlug, (comparisonCounts.get(e.comparisonSlug) ?? 0) + 1);
    } else if (e.type === "category_view") {
      categoryVisitors.add(e.visitorId);
      categoryCounts.set(e.categorySlug, (categoryCounts.get(e.categorySlug) ?? 0) + 1);
    } else if (e.type === "guide_view") {
      guideVisitors.add(e.visitorId);
      guideCounts.set(e.guideSlug, (guideCounts.get(e.guideSlug) ?? 0) + 1);
    } else if (e.type === "recommend_started") {
      rfStartersP.add(e.visitorId); rfStartersS.add(e.sessionId); rfStartersE++;
    } else if (e.type === "recommend_completed") {
      rfCompletersP.add(e.visitorId); rfCompletersS.add(e.sessionId); rfCompletersE++;
    } else if (e.type === "recommend_result_viewed") {
      rfResultViewersP.add(e.visitorId); rfResultViewersS.add(e.sessionId); rfResultViewersE++;
    } else if (e.type === "recommend_product_open") {
      rfProductOpenersP.add(e.visitorId); rfProductOpenersS.add(e.sessionId); rfProductOpenersE++;
    } else if (e.type === "recommend_comparison_open") {
      rfComparisonOpenersP.add(e.visitorId); rfComparisonOpenersS.add(e.sessionId); rfComparisonOpenersE++;
    } else if (e.type === "internal_cta_click") {
      meaningfulClickers.add(e.visitorId);
    } else if (e.type === "outbound_click") {
      meaningfulClickers.add(e.visitorId);
      outboundClickers.add(e.visitorId);
      outboundCounts.set(e.url, (outboundCounts.get(e.url) ?? 0) + 1);
      if (e.destination === "affiliate") {
        affiliateClickers.add(e.visitorId);
        affiliateCounts.set(e.softwareSlug, (affiliateCounts.get(e.softwareSlug) ?? 0) + 1);
      }
      // Phase 8 — "after Recommend": this visitor touched Recommend at
      // some earlier point (sortedEvents is chronological, so any touch
      // already recorded happened strictly before this click's timestamp).
      if (firstRecommendTouchByVisitor.has(e.visitorId)) {
        rfOutboundAfterP.add(e.visitorId); rfOutboundAfterS.add(e.sessionId); rfOutboundAfterE++;
        if (e.destination === "affiliate") {
          rfAffiliateAfterP.add(e.visitorId); rfAffiliateAfterS.add(e.sessionId); rfAffiliateAfterE++;
        }
      }
    }
  }

  // Calculate exit pages from last recorded page in each session
  const exitPageCounts = new Map<string, number>();
  for (const { path } of sessionLastPage.values()) {
    exitPageCounts.set(path, (exitPageCounts.get(path) ?? 0) + 1);
  }

  // Include legacy historical outbound events if present and not already in first-party
  if (legacyClicks.length > 0 && events.length === 0) {
    for (const lc of legacyClicks) {
      outboundCounts.set(lc.url, (outboundCounts.get(lc.url) ?? 0) + 1);
      if (lc.destination === "affiliate") {
        affiliateCounts.set(lc.softwareSlug, (affiliateCounts.get(lc.softwareSlug) ?? 0) + 1);
      }
    }
  }

  // Include multi-page visitors into engaged
  const multiPageVisitors = new Set<string>();
  for (const [vid, count] of pageViewsByVisitor.entries()) {
    if (count >= 2) {
      multiPageVisitors.add(vid);
      engagedVisitors.add(vid);
    }
  }

  // Classify new vs returning visitors
  let returningCount = 0;
  let newCount = 0;
  for (const vid of visitors) {
    const totalSessions = (globalSessionsByVisitor.get(vid)?.size ?? sessionsByVisitor.get(vid)?.size) ?? 1;
    if (totalSessions > 1) {
      returningCount++;
    } else {
      newCount++;
    }
  }

  const totalVisitorsCount = visitors.size;
  const engagedCount = engagedVisitors.size;
  const multiPageCount = multiPageVisitors.size;
  // 2026-08-22 fix: was seeded from recommendUsers, a set that only grew on the
  // narrow "recommend_use" event (fires solely when a visitor lands directly on
  // /recommend/results) — silently excluding anyone who started the wizard but
  // didn't reach results, undercounting real high-intent behavior. rfVisitorsP
  // already tracks every RECOMMEND_TOUCH_TYPES event (recommend_started included),
  // computed unconditionally above regardless of period, so it's a strict superset.
  const highIntentCount = new Set([...rfVisitorsP, ...comparisonVisitors, ...softwareVisitors]).size;
  const meaningfulCount = meaningfulClickers.size;
  const outboundCount = outboundClickers.size;
  const affiliateCount = affiliateClickers.size;

  const funnel = [
    {
      stage: "1. REAL VISITORS",
      uniquePeople: totalVisitorsCount,
      pctOfTotalVisitors: "100.0%",
      conversionFromPrev: "100.0%"
    },
    {
      stage: "2. ENGAGED VISITORS (>10s / Multi-Page)",
      uniquePeople: engagedCount,
      pctOfTotalVisitors: totalVisitorsCount > 0 ? `${((engagedCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%",
      conversionFromPrev: totalVisitorsCount > 0 ? `${((engagedCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%"
    },
    {
      stage: "3. VIEWED 2+ PAGES",
      uniquePeople: multiPageCount,
      pctOfTotalVisitors: totalVisitorsCount > 0 ? `${((multiPageCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%",
      conversionFromPrev: engagedCount > 0 ? `${((multiPageCount / engagedCount) * 100).toFixed(1)}%` : "0.0%"
    },
    {
      stage: "4. HIGH-INTENT EVALUATION (Software/Compare/Recommend)",
      uniquePeople: highIntentCount,
      pctOfTotalVisitors: totalVisitorsCount > 0 ? `${((highIntentCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%",
      conversionFromPrev: multiPageCount > 0 ? `${((highIntentCount / multiPageCount) * 100).toFixed(1)}%` : "0.0%"
    },
    {
      stage: "5. MEANINGFUL CTA CLICK",
      uniquePeople: meaningfulCount,
      pctOfTotalVisitors: totalVisitorsCount > 0 ? `${((meaningfulCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%",
      conversionFromPrev: highIntentCount > 0 ? `${((meaningfulCount / highIntentCount) * 100).toFixed(1)}%` : "0.0%"
    },
    {
      stage: "6. CLICKED OUT TO VENDOR",
      uniquePeople: outboundCount,
      pctOfTotalVisitors: totalVisitorsCount > 0 ? `${((outboundCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%",
      conversionFromPrev: meaningfulCount > 0 ? `${((outboundCount / meaningfulCount) * 100).toFixed(1)}%` : "0.0%"
    },
    {
      stage: "7. CLICKED AFFILIATE LINK",
      uniquePeople: affiliateCount,
      pctOfTotalVisitors: totalVisitorsCount > 0 ? `${((affiliateCount / totalVisitorsCount) * 100).toFixed(1)}%` : "0.0%",
      conversionFromPrev: outboundCount > 0 ? `${((affiliateCount / outboundCount) * 100).toFixed(1)}%` : "0.0%"
    }
  ];

  const topLandingPages = [...landingPageCounts.entries()].map(([path, visits]) => ({ path, visits })).sort((a, b) => b.visits - a.visits).slice(0, 10);
  const topExitPages = [...exitPageCounts.entries()].map(([path, exits]) => ({ path, exits })).sort((a, b) => b.exits - a.exits).slice(0, 10);
  const topPages = [...pageCounts.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  const topSoftware = [...softwareCounts.entries()].map(([slug, views]) => ({ slug, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  const topComparisons = [...comparisonCounts.entries()].map(([slug, views]) => ({ slug, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  const topCategories = [...categoryCounts.entries()].map(([slug, views]) => ({ slug, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  const topGuides = [...guideCounts.entries()].map(([slug, views]) => ({ slug, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  const topOutboundDestinations = [...outboundCounts.entries()].map(([url, clicks]) => ({ url, clicks })).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  const topAffiliateProducts = [...affiliateCounts.entries()].map(([slug, clicks]) => ({ slug, clicks })).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

  return {
    periodName,
    uniqueVisitors: totalVisitorsCount,
    newVisitors: newCount,
    returningVisitors: returningCount,
    sessions: sessions.size,
    engagedVisitors: engagedCount,
    multiPageVisitors: multiPageCount,
    totalPageViews,
    softwareVisitors: softwareVisitors.size,
    comparisonVisitors: comparisonVisitors.size,
    categoryVisitors: categoryVisitors.size,
    guideVisitors: guideVisitors.size,
    recommendUsers: rfVisitorsP.size,
    meaningfulClickers: meaningfulCount,
    outboundClickers: outboundCount,
    affiliateClickers: affiliateCount,
    funnel,
    topLandingPages,
    topExitPages,
    topPages,
    topSoftware,
    topComparisons,
    topCategories,
    topGuides,
    topOutboundDestinations,
    topAffiliateProducts,
    recommendFunnel: {
      visitors: { people: rfVisitorsP.size, sessions: rfVisitorsS.size, events: rfVisitorsE },
      starters: { people: rfStartersP.size, sessions: rfStartersS.size, events: rfStartersE },
      completers: { people: rfCompletersP.size, sessions: rfCompletersS.size, events: rfCompletersE },
      completionRate: rfStartersP.size > 0 ? `${((rfCompletersP.size / rfStartersP.size) * 100).toFixed(1)}%` : "0.0%",
      resultViewers: { people: rfResultViewersP.size, sessions: rfResultViewersS.size, events: rfResultViewersE },
      productOpeners: { people: rfProductOpenersP.size, sessions: rfProductOpenersS.size, events: rfProductOpenersE },
      comparisonOpeners: { people: rfComparisonOpenersP.size, sessions: rfComparisonOpenersS.size, events: rfComparisonOpenersE },
      outboundClickersAfter: { people: rfOutboundAfterP.size, sessions: rfOutboundAfterS.size, events: rfOutboundAfterE },
      affiliateClickersAfter: { people: rfAffiliateAfterP.size, sessions: rfAffiliateAfterS.size, events: rfAffiliateAfterE },
    },
  };
}

export async function generateAnalyticsReport() {
  const includeSynthetic = process.argv.includes("--include-synthetic");
  const events = await getAllFirstPartyEvents();
  const legacyClicks = await getOutboundEvents();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const todayEvents = filterEventsByDate(events, todayStr + "T00:00:00.000Z", undefined, includeSynthetic);
  const yesterdayEvents = filterEventsByDate(events, yesterdayStr + "T00:00:00.000Z", todayStr + "T00:00:00.000Z", includeSynthetic);
  const last7dEvents = filterEventsByDate(events, last7d, undefined, includeSynthetic);
  const last30dEvents = filterEventsByDate(events, last30d, undefined, includeSynthetic);

  const periods = [
    computePeriodMetrics("TODAY", todayEvents, events, [], includeSynthetic),
    computePeriodMetrics("YESTERDAY", yesterdayEvents, events, [], includeSynthetic),
    computePeriodMetrics("LAST 7 DAYS", last7dEvents, events, [], includeSynthetic),
    computePeriodMetrics("LAST 30 DAYS", last30dEvents, events, [], includeSynthetic),
    computePeriodMetrics("ALL TIME (First-Party Live)", events, events, legacyClicks, includeSynthetic)
  ];

  if (includeSynthetic) {
    console.log("========================================================================================");
    console.log(" WARNING --include-synthetic ACTIVE: synthetic/QA/legacy-contaminated sessions are INCLUDED below.");
    console.log("   This mode is for debugging only — never treat these numbers as real human usage.");
    console.log("========================================================================================\n");
  }

  console.log("========================================================================================");
  console.log("                      MILOOSH REAL HUMAN USAGE & FUNNEL REPORT                          ");
  console.log("========================================================================================\n");

  for (const p of periods) {
    console.log(`----------------------------------------------------------------------------------------`);
    console.log(` PERIOD: ${p.periodName}`);
    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`  - Unique Visitors:         ${p.uniqueVisitors.toString().padEnd(6)} |  - New vs Returning:     ${p.newVisitors} new / ${p.returningVisitors} ret`);
    console.log(`  - Sessions:                ${p.sessions.toString().padEnd(6)} |  - Total Page Views:     ${p.totalPageViews}`);
    console.log(`  - Engaged Visitors (>10s): ${p.engagedVisitors.toString().padEnd(6)} |  - Multi-Page Visitors:  ${p.multiPageVisitors}`);
    console.log(`  - Software Page Visitors:  ${p.softwareVisitors.toString().padEnd(6)} |  - Comparison Visitors:   ${p.comparisonVisitors}`);
    console.log(`  - Category Page Visitors:  ${p.categoryVisitors.toString().padEnd(6)} |  - Guide Page Visitors:    ${p.guideVisitors}`);
    console.log(`  - Recommend Tool Users:    ${p.recommendUsers.toString().padEnd(6)} |  - Meaningful Clickers:  ${p.meaningfulClickers}`); // any Recommend touch (started/results/completed/etc) — see RECOMMEND FUNNEL below for the full breakdown
    console.log(`  - Outbound Clickers:       ${p.outboundClickers.toString().padEnd(6)} |  - Affiliate Clickers:    ${p.affiliateClickers}\n`);

    console.log(`  CANONICAL HUMAN FUNNEL:`);
    p.funnel.forEach(f => {
      console.log(`    ${f.stage.padEnd(54)}: ${f.uniquePeople.toString().padStart(4)} people | ${f.pctOfTotalVisitors.padStart(6)} of visitors | ${f.conversionFromPrev.padStart(6)} step conversion`);
    });

    if (p.topLandingPages.length > 0) {
      console.log(`\n  Top Landing Pages:`);
      p.topLandingPages.forEach((item, i) => console.log(`    ${i + 1}. ${item.path} (${item.visits} visits)`));
    }
    if (p.topExitPages.length > 0) {
      console.log(`\n  Top Exit Pages:`);
      p.topExitPages.forEach((item, i) => console.log(`    ${i + 1}. ${item.path} (${item.exits} exits)`));
    }
    if (p.topPages.length > 0) {
      console.log(`\n  Top Pages:`);
      p.topPages.forEach((item, i) => console.log(`    ${i + 1}. ${item.path} (${item.views} views)`));
    }
    if (p.topSoftware.length > 0) {
      console.log(`\n  Top Software Pages:`);
      p.topSoftware.forEach((item, i) => console.log(`    ${i + 1}. ${item.slug} (${item.views} views)`));
    }
    if (p.topComparisons.length > 0) {
      console.log(`\n  Top Comparisons:`);
      p.topComparisons.forEach((item, i) => console.log(`    ${i + 1}. ${item.slug} (${item.views} views)`));
    }
    if (p.topCategories.length > 0) {
      console.log(`\n  Top Categories:`);
      p.topCategories.forEach((item, i) => console.log(`    ${i + 1}. ${item.slug} (${item.views} views)`));
    }
    if (p.topGuides.length > 0) {
      console.log(`\n  Top Guides:`);
      p.topGuides.forEach((item, i) => console.log(`    ${i + 1}. ${item.slug} (${item.views} views)`));
    }
    if (p.topOutboundDestinations.length > 0) {
      console.log(`\n  Top Outbound Destinations:`);
      p.topOutboundDestinations.forEach((item, i) => console.log(`    ${i + 1}. ${item.url} (${item.clicks} clicks)`));
    }
    if (p.topAffiliateProducts.length > 0) {
      console.log(`\n  Top Affiliate Products Clicked:`);
      p.topAffiliateProducts.forEach((item, i) => console.log(`    ${i + 1}. ${item.slug} (${item.clicks} clicks)`));
    }

    const rf = p.recommendFunnel;
    console.log(`\n  RECOMMEND FUNNEL (synthetic/legacy-contaminated excluded${includeSynthetic ? " -- DISABLED, --include-synthetic active" : ""}):`);
    console.log(`    ${"".padEnd(32)}   PEOPLE   SESSIONS   EVENTS`);
    const rfRow = (label: string, m: RecommendFunnelMetric) =>
      console.log(`    ${label.padEnd(32)} ${m.people.toString().padStart(8)} ${m.sessions.toString().padStart(10)} ${m.events.toString().padStart(8)}`);
    rfRow("Real Recommend Visitors", rf.visitors);
    rfRow("Recommend Starters", rf.starters);
    rfRow("Recommend Completers", rf.completers);
    console.log(`    ${"Completion Rate".padEnd(32)} ${rf.completionRate.padStart(8)}`);
    rfRow("Result Viewers", rf.resultViewers);
    rfRow("Product Openers", rf.productOpeners);
    rfRow("Comparison Openers", rf.comparisonOpeners);
    rfRow("Outbound Vendor Clicks After", rf.outboundClickersAfter);
    rfRow("Affiliate Clicks After", rf.affiliateClickersAfter);

    console.log("\n");
  }

  console.log("========================================================================================");
  console.log(" HISTORICAL DATA PROVENANCE:");
  console.log(" - First-Party Analytics Layer: Deployed live with zero PII, anonymous visitor/session IDs.");
  console.log(` - Legacy Outbound Click Log: ${legacyClicks.length} total events in Blob store.`);
  if (legacyClicks.some(c => c.softwareSlug === "pipedrive")) {
    console.log("   * Note: 2026-08-19 Pipedrive click recorded during controlled production verification test.");
  }
  console.log("========================================================================================\n");

  const legacyExcludedCount = events.filter(e => isLegacyContaminatedSession(e.sessionId)).length;
  const syntheticExcludedCount = events.filter(e => !isLegacyContaminatedSession(e.sessionId) && isSyntheticOrTestEvent(e)).length;
  console.log("========================================================================================");
  console.log(" DATA INTEGRITY (Recommend Engine Integrity Patch, 2026-08-21):");
  console.log(`   Total stored first-party events (all time, unfiltered):    ${events.length}`);
  console.log(`   Excluded — isTest marker (?qa=1 synthetic sessions):       ${syntheticExcludedCount}`);
  console.log(`   Excluded — legacy-contaminated (pre-marker, unproven):     ${legacyExcludedCount}`);
  if (LEGACY_CONTAMINATED_SESSIONS.length > 0) {
    console.log("\n   Legacy-contaminated sessions (never deleted, only excluded from REAL metrics above):");
    for (const s of LEGACY_CONTAMINATED_SESSIONS) {
      const sessionEvents = events.filter(e => e.sessionId === s.sessionId);
      console.log(`     - session ${s.sessionId}: ${sessionEvents.length} events, classification ${s.classification}`);
      console.log(`       investigated ${s.investigatedAt}: ${s.reason}`);
    }
  }
  console.log("   Run with --include-synthetic to see these counted back into the numbers above (debug only).");
  console.log("========================================================================================\n");

  // Phase 9 — DATA QUALITY section: makes silent instrumentation gaps
  // visible. Bot-filtered requests, validation rejects, and storage
  // failures are NOT stored (by design — a rejected/failed write leaves
  // no record here), so they cannot be counted from stored data; the
  // honest way to see those is `vercel logs`, where every BOT,
  // INTERNAL_INFRA, REJECTED_VALIDATION, and FAILED_STORAGE outcome is
  // logged (see app/api/analytics/event/route.ts and lib/analytics/
  // events.ts). This section says so explicitly rather than reporting a
  // fabricated zero.
  const realOrUnknownEvents = events.filter(e => !isSyntheticOrTestEvent(e));
  const syntheticQaEvents = events.filter(e => e.isTest && !isLegacyContaminatedSession(e.sessionId));
  const legacyContaminatedEvents = events.filter(e => isLegacyContaminatedSession(e.sessionId));

  const coverageByType = new Map<string, number>();
  for (const e of events) coverageByType.set(e.type, (coverageByType.get(e.type) ?? 0) + 1);

  const trafficSourceCounts = new Map<string, number>();
  for (const e of realOrUnknownEvents) {
    if (e.type === "page_view" && e.trafficSource) {
      trafficSourceCounts.set(e.trafficSource, (trafficSourceCounts.get(e.trafficSource) ?? 0) + 1);
    }
  }

  console.log("========================================================================================");
  console.log(" DATA QUALITY (Analytics Zero-Drop Production Proof Mega Mission, 2026-08-21):");
  console.log(`   Accepted REAL_OR_UNKNOWN_HUMAN events:  ${realOrUnknownEvents.length}`);
  console.log(`   SYNTHETIC_QA events (stored, excluded):  ${syntheticQaEvents.length}`);
  console.log(`   LEGACY_CONTAMINATED events (stored, excluded): ${legacyContaminatedEvents.length}`);
  console.log(`   BOT_REJECTED / REJECTED_VALIDATION / FAILED_STORAGE: not measurable from stored data by design (never stored) — see \`vercel logs\` for these outcomes, logged at the point of rejection.`);
  console.log(`\n   Event coverage by type (all time, unfiltered by classification):`);
  for (const [type, count] of [...coverageByType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${type.padEnd(28)} ${count}`);
  }
  console.log(`\n   Traffic source distribution (REAL_OR_UNKNOWN_HUMAN landing page_views only):`);
  if (trafficSourceCounts.size === 0) {
    console.log(`     (none recorded yet)`);
  } else {
    for (const [source, count] of [...trafficSourceCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${source.padEnd(18)} ${count}`);
    }
  }
  console.log("========================================================================================\n");

  // Phase 26 — Recommend usage by PRIMARY DOMAIN, all-time. Aggregate enum
  // values only, never free text; small-n percentages deliberately omitted
  // per Phase 26's "do not display statistically silly percentages when n
  // is tiny" instruction — raw counts only.
  const domainBreakdown = computeRecommendDomainBreakdown(events, includeSynthetic);
  console.log("========================================================================================");
  console.log(" RECOMMEND FUNNEL BY DOMAIN (all time, aggregate enum values only, no personal text):");
  if (domainBreakdown.length === 0) {
    console.log("   (no domain-attributed Recommend activity recorded yet)");
  } else {
    console.log(`   ${"DOMAIN".padEnd(24)} COMPLETERS  RESULT-VIEWERS  PRODUCT-OPENS  COMPARISON-OPENS  OUTBOUND-AFTER`);
    for (const row of domainBreakdown) {
      console.log(`   ${row.domain.padEnd(24)} ${row.completers.toString().padStart(10)} ${row.resultViewers.toString().padStart(16)} ${row.productOpeners.toString().padStart(14)} ${row.comparisonOpeners.toString().padStart(18)} ${row.outboundClickersAfter.toString().padStart(15)}`);
    }
  }
  console.log("========================================================================================\n");

  // Phase 21 — CTA exposure vs. click, per (softwareSlug, ctaLocation).
  // Raw counts only (no percentages) below a reasonable n, per the same
  // "don't display statistically silly percentages when n is tiny"
  // discipline as the domain breakdown above.
  const ctaExposure = computeCtaExposure(events, includeSynthetic);
  console.log("========================================================================================");
  console.log(" CTA EXPOSURE VS. CLICK, all time (impressions = distinct visitors who saw the CTA on screen):");
  if (ctaExposure.length === 0) {
    console.log("   (no cta_impression events recorded yet — this telemetry shipped 2026-08-22, so early periods will show none)");
  } else {
    console.log(`   ${"SOFTWARE".padEnd(20)} ${"CTA LOCATION".padEnd(28)} IMPRESSIONS  CLICKS  CTR`);
    for (const row of ctaExposure) {
      const ctr = row.impressions >= 5 ? `${((row.clicks / row.impressions) * 100).toFixed(1)}%` : "n too small";
      console.log(`   ${row.softwareSlug.padEnd(20)} ${row.ctaLocation.padEnd(28)} ${row.impressions.toString().padStart(11)} ${row.clicks.toString().padStart(7)}  ${ctr}`);
    }
  }
  console.log("========================================================================================\n");

  // ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Phase 0 — the
  // durable milestone scoreboard, printed first among the growth sections
  // since it's now the mission's own stated single most important number.
  //
  // MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23) Phase 10:
  // the raw REAL_OR_UNKNOWN_HUMAN count is printed ONLY as a clearly-
  // labeled denominator now, never as "verified real humans" -- that claim
  // requires the classification layer below. A jump in the raw number
  // alone must never be read as human growth.
  const { cumulativeRealVisitors, cumulativeConfirmedOrStrongVisitors, milestonesConfirmedOrStrong } = computeAcquisitionMilestones(events);
  // Full, unfiltered event set -- classifySessions is self-sufficient (it
  // recognizes isTest/synthetic-ID-prefix/legacy-contaminated sessions on
  // its own), so passing everything here is what makes the KNOWN_QA_TEST/
  // KNOWN_AUTOMATION rows below meaningful instead of structurally always 0.
  const sessionClassifications = classifySessions(events);
  const bucketSummary = summarizeBuckets(sessionClassifications);
  const visitorBuckets = classifyVisitors(sessionClassifications);
  const visitorBucketCounts = new Map<TrafficBucket, number>();
  for (const v of visitorBuckets) visitorBucketCounts.set(v.bucket, (visitorBucketCounts.get(v.bucket) ?? 0) + 1);

  console.log("========================================================================================");
  console.log(" ACQUISITION SCOREBOARD — ROAD TO 1,000 REAL HUMANS");
  console.log(`   CONFIRMED + STRONG-EVIDENCE human visitors (all time): ${cumulativeConfirmedOrStrongVisitors}`);
  console.log(`   Raw REAL_OR_UNKNOWN_HUMAN visitors (unclassified denominator, NOT a human-growth claim): ${cumulativeRealVisitors}`);
  for (const m of milestonesConfirmedOrStrong) {
    const status = m.reached ? `REACHED at ${m.reachedAt}` : `not yet reached — ${m.visitorsRemaining} more confirmed/strong-evidence visitor(s) needed`;
    console.log(`   Milestone ${m.name} (${m.threshold}): ${status}`);
  }
  console.log("");
  console.log("   Session-level classification (evidence standard per bucket in lib/analytics/human-classification.ts):");
  console.log(`   ${"BUCKET".padEnd(24)} SESSIONS  VISITORS`);
  for (const b of bucketSummary) {
    console.log(`   ${b.bucket.padEnd(24)} ${b.sessions.toString().padStart(8)}  ${(visitorBucketCounts.get(b.bucket) ?? 0).toString().padStart(8)}`);
  }
  console.log("========================================================================================\n");

  // TRAFFIC ACQUISITION WAR MODE mission (2026-08-22) Phase 2 — per-source
  // funnel. Raw counts only; a "TINY SAMPLE" flag replaces any rate/CTR
  // math below n=5 visitors so nobody mistakes 1-of-1 for a trend.
  const acquisitionBreakdown = computeAcquisitionSourceBreakdown(events, includeSynthetic);
  console.log("========================================================================================");
  console.log(" ACQUISITION SOURCE FUNNEL, all time (source = TrafficSource on each visitor's earliest page_view):");
  if (acquisitionBreakdown.length === 0) {
    console.log("   (no real page_view events recorded yet)");
  } else {
    console.log(`   ${"SOURCE".padEnd(16)} VISITORS  ENGAGED  MULTI-PG  COMMERCIAL  CTA-SEEN  CTA-CLICK  OUTBOUND  AFFILIATE`);
    for (const row of acquisitionBreakdown) {
      const tiny = row.visitors < 5 ? "  (TINY SAMPLE)" : "";
      console.log(
        `   ${row.source.padEnd(16)} ${row.visitors.toString().padStart(8)} ${row.engaged.toString().padStart(8)} ${row.multiPage.toString().padStart(9)} ${row.commercialPageVisitors.toString().padStart(11)} ${row.ctaImpressions.toString().padStart(9)} ${row.ctaClickers.toString().padStart(10)} ${row.outboundClickers.toString().padStart(9)} ${row.affiliateClickers.toString().padStart(10)}${tiny}`
      );
    }
  }
  console.log("========================================================================================\n");

  // MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23) Phase 8 —
  // the cleanest measurable funnel from real instrumentation, with the
  // numerator/denominator behind every rate shown explicitly so nobody
  // mistakes an impression or pageview for a visitor or a conversion.
  const totalCtaImpressions = acquisitionBreakdown.reduce((sum, r) => sum + r.ctaImpressions, 0);
  const totalCtaClickers = acquisitionBreakdown.reduce((sum, r) => sum + r.ctaClickers, 0);
  const totalOutboundClickers = acquisitionBreakdown.reduce((sum, r) => sum + r.outboundClickers, 0);
  const totalAffiliateClickers = acquisitionBreakdown.reduce((sum, r) => sum + r.affiliateClickers, 0);
  const totalVisitors = acquisitionBreakdown.reduce((sum, r) => sum + r.visitors, 0);
  const pct = (numerator: number, denominator: number): string => (denominator > 0 ? `${((numerator / denominator) * 100).toFixed(1)}% (${numerator}/${denominator})` : `n/a (0/${denominator})`);

  console.log("========================================================================================");
  console.log(" ACQUISITION FUNNEL (unique visitors at each stage; CTA impressions are an EVENT count, not a visitor count)");
  console.log(`   Real/unknown visitors (landing page_view): ${totalVisitors}`);
  console.log(`   -> CTA impression events fired:             ${totalCtaImpressions} (event count -- one visitor can trigger multiple)`);
  console.log(`   -> Visitors who clicked a CTA:               ${totalCtaClickers}  [${pct(totalCtaClickers, totalVisitors)} of visitors]`);
  console.log(`   -> Visitors who clicked outbound (any):      ${totalOutboundClickers}  [${pct(totalOutboundClickers, totalVisitors)} of visitors]`);
  console.log(`   -> Visitors who clicked an affiliate link:   ${totalAffiliateClickers}  [${pct(totalAffiliateClickers, totalVisitors)} of visitors]`);
  console.log("========================================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateAnalyticsReport();
}
