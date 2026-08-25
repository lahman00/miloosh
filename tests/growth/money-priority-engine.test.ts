import { describe, it, expect } from "vitest";
import { computeMoneyPriorityQueue, type SeoOpportunityRow } from "@/lib/growth/money-priority-engine";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

function pageView(slug: string, sessionId: string, visitorId: string, timestamp: string): FirstPartyEvent {
  return { type: "page_view", path: `/software/${slug}`, visitorId, sessionId, timestamp } as FirstPartyEvent;
}

function engagedView(slug: string, sessionId: string, visitorId: string, timestamp: string): FirstPartyEvent {
  return { type: "engaged_view", path: `/software/${slug}`, visitorId, sessionId, timestamp } as FirstPartyEvent;
}

function affiliateClick(slug: string, sessionId: string, visitorId: string, timestamp: string, isTest = false): FirstPartyEvent {
  return { type: "outbound_click", path: `/software/${slug}`, softwareSlug: slug, destination: "affiliate", url: "https://example.com", visitorId, sessionId, timestamp, isTest } as FirstPartyEvent;
}

function revenueLogClick(slug: string, timestamp: string, isTest = false): StoredOutboundEvent {
  return {
    type: "affiliate_link_click",
    softwareSlug: slug,
    destination: "affiliate",
    url: "https://example.com",
    sourcePage: `/software/${slug}`,
    timestamp,
    isTest,
  };
}

describe("computeMoneyPriorityQueue", () => {
  it("returns one row per active partner", () => {
    const queue = computeMoneyPriorityQueue([], []);
    expect(queue).toHaveLength(ACTIVE_PARTNERS.length);
    expect(new Set(queue.map((r) => r.slug))).toEqual(new Set(ACTIVE_PARTNERS.map((p) => p.slug)));
  });

  it("uses NOT_MEASURED rather than fabricated zero for absent GSC data", () => {
    for (const row of computeMoneyPriorityQueue([], [])) {
      expect(row.gscImpressions).toBe("NOT_MEASURED");
      expect(row.gscClicks).toBe("NOT_MEASURED");
      expect(row.gscAvgPosition).toBe("NOT_MEASURED");
    }
  });

  it("sums real GSC rows independently from affiliate clicks", () => {
    const seo: SeoOpportunityRow[] = [
      { relatedSoftware: ["pipedrive"], query: "pipedrive alternatives", gsc: { impressions: 100, clicks: 2, position: 50 } },
      { relatedSoftware: ["pipedrive"], query: "pipedrive pricing", gsc: { impressions: 50, clicks: 1, position: 30 } },
    ];
    const row = computeMoneyPriorityQueue([], seo).find((r) => r.slug === "pipedrive")!;
    expect(row.gscImpressions).toBe(150);
    expect(row.gscClicks).toBe(3);
    expect(row.gscAvgPosition).toBe(40);
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
  });

  it("excludes test clicks", () => {
    const row = computeMoneyPriorityQueue([
      affiliateClick("pipedrive", "s_test", "v_test", new Date().toISOString(), true),
    ], []).find((r) => r.slug === "pipedrive")!;
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
  });

  it("does not allow a direct outbound event alone to prove a human click", () => {
    const row = computeMoneyPriorityQueue([
      affiliateClick("pipedrive", "s_direct", "v_direct", new Date().toISOString(), false),
    ], []).find((r) => r.slug === "pipedrive")!;
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
  });

  it("counts a classifier-qualified affiliate click only when prior funnel evidence exists", () => {
    const t0 = Date.now();
    const events: FirstPartyEvent[] = [
      pageView("pipedrive", "s_real", "v_real", new Date(t0).toISOString()),
      engagedView("pipedrive", "s_real", "v_real", new Date(t0 + 10_000).toISOString()),
      affiliateClick("pipedrive", "s_real", "v_real", new Date(t0 + 12_000).toISOString(), false),
    ];
    const row = computeMoneyPriorityQueue(events, []).find((r) => r.slug === "pipedrive")!;
    expect(row.eligibleHumanAffiliateClicks).toBe(1);
    expect(row.uniqueEligibleHumanClickers).toBe(1);
    expect(row.revenueReadiness).toBe("READY");
  });

  it("marks no-demand rows NOT_READY with a blocker", () => {
    const row = computeMoneyPriorityQueue([], [])[0]!;
    expect(row.revenueReadiness).toBe("NOT_READY");
    expect(row.currentBlocker).toMatch(/no observed eligible-human demand/i);
  });

  it("reflects real comparison, guide, pricing and commission coverage", () => {
    const queue = computeMoneyPriorityQueue([], []);
    const pipedrive = queue.find((r) => r.slug === "pipedrive")!;
    const airtable = queue.find((r) => r.slug === "airtable")!;
    expect(pipedrive.comparisonCoverage).toBeGreaterThan(0);
    expect(pipedrive.hasDecisionGuideCoverage).toBe(true);
    expect(airtable.commissionModel).not.toBe("UNKNOWN");
  });

  it("sorts by score and score breakdown sums exactly", () => {
    const queue = computeMoneyPriorityQueue([], []);
    for (let i = 1; i < queue.length; i++) expect(queue[i - 1]!.score).toBeGreaterThanOrEqual(queue[i]!.score);
    for (const row of queue) expect(Object.values(row.scoreBreakdown).reduce((a, b) => a + b, 0)).toBe(row.score);
  });

  it("keeps non-test revenue-log clicks separate from human-qualified first-party clicks", () => {
    const row = computeMoneyPriorityQueue([], [], [revenueLogClick("pipedrive", "2026-08-19T20:19:06.064Z", false)])
      .find((r) => r.slug === "pipedrive")!;
    expect(row.revenueLogRealAffiliateClicks).toBe(1);
    expect(row.revenueLogTestClicks).toBe(0);
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
  });

  it("keeps test revenue-log clicks out of real counts", () => {
    const row = computeMoneyPriorityQueue([], [], [revenueLogClick("airtable", "2026-08-24T10:00:00.000Z", true)])
      .find((r) => r.slug === "airtable")!;
    expect(row.revenueLogRealAffiliateClicks).toBe(0);
    expect(row.revenueLogTestClicks).toBe(1);
  });

  it("never lets revenue-log clicks change first-party score", () => {
    const base = computeMoneyPriorityQueue([], []).find((r) => r.slug === "close")!;
    const withLog = computeMoneyPriorityQueue([], [], [
      revenueLogClick("close", "2026-08-24T09:00:00.000Z"),
      revenueLogClick("close", "2026-08-24T09:05:00.000Z"),
    ]).find((r) => r.slug === "close")!;
    expect(withLog.revenueLogRealAffiliateClicks).toBe(2);
    expect(withLog.score).toBe(base.score);
    expect(withLog.scoreBreakdown.provenClicks).toBe(base.scoreBreakdown.provenClicks);
  });

  it("has no input channel that silently merges vendor-network milestone clicks", () => {
    expect(computeMoneyPriorityQueue.length).toBe(2);
  });
});
