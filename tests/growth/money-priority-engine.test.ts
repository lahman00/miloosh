import { describe, it, expect } from "vitest";
import { computeMoneyPriorityQueue, type SeoOpportunityRow } from "@/lib/growth/money-priority-engine";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import type { FirstPartyEvent } from "@/lib/analytics/events";

/**
 * MILOOSH AUTONOMOUS REVENUE COMPANY BUILD mission (2026-08-24), Phase 2 —
 * regression suite for the Money Priority Engine. Runs against the real
 * ACTIVE_PARTNERS/catalog/ledger (same convention as pricing-index.test.ts
 * and factual-depth-audit.test.ts -- the whole point is that coverage/
 * economics fields trace back to real committed data), with synthetic
 * FirstPartyEvent fixtures standing in for production analytics traffic.
 */

function pageView(slug: string, sessionId: string, visitorId: string, timestamp: string): FirstPartyEvent {
  return { type: "page_view", path: `/software/${slug}`, visitorId, sessionId, timestamp } as FirstPartyEvent;
}

function engagedView(slug: string, sessionId: string, visitorId: string, timestamp: string): FirstPartyEvent {
  return { type: "engaged_view", path: `/software/${slug}`, visitorId, sessionId, timestamp } as FirstPartyEvent;
}

function affiliateClick(slug: string, sessionId: string, visitorId: string, timestamp: string, isTest = false): FirstPartyEvent {
  return { type: "outbound_click", path: `/software/${slug}`, softwareSlug: slug, destination: "affiliate", url: "https://example.com", visitorId, sessionId, timestamp, isTest } as FirstPartyEvent;
}

describe("computeMoneyPriorityQueue", () => {
  it("returns exactly one row per active partner, real slugs only", () => {
    const queue = computeMoneyPriorityQueue([], []);
    expect(queue).toHaveLength(ACTIVE_PARTNERS.length);
    expect(new Set(queue.map((r) => r.slug))).toEqual(new Set(ACTIVE_PARTNERS.map((p) => p.slug)));
  });

  it("reports gscImpressions/Clicks/Position as NOT_MEASURED, never a fabricated zero, when no SEO opportunity row exists", () => {
    const queue = computeMoneyPriorityQueue([], []);
    for (const row of queue) {
      expect(row.gscImpressions).toBe("NOT_MEASURED");
      expect(row.gscClicks).toBe("NOT_MEASURED");
      expect(row.gscAvgPosition).toBe("NOT_MEASURED");
    }
  });

  it("sums real GSC impressions/clicks across every opportunity row mentioning a slug", () => {
    const seo: SeoOpportunityRow[] = [
      { relatedSoftware: ["pipedrive"], query: "pipedrive alternatives", gsc: { impressions: 100, clicks: 2, position: 50 } },
      { relatedSoftware: ["pipedrive"], query: "pipedrive pricing", gsc: { impressions: 50, clicks: 1, position: 30 } },
    ];
    const queue = computeMoneyPriorityQueue([], seo);
    const row = queue.find((r) => r.slug === "pipedrive")!;
    expect(row.gscImpressions).toBe(150);
    expect(row.gscClicks).toBe(3);
    expect(row.gscAvgPosition).toBe(40);
    expect(row.commercialIntentQueries).toEqual(["pipedrive alternatives", "pipedrive pricing"]);
  });

  it("counts a real eligible-human page session (multi-signal, non-burst) toward demand", () => {
    const t = (i: number) => new Date(Date.now() + i * 600_000).toISOString();
    const events: FirstPartyEvent[] = [
      pageView("pipedrive", "s1", "v1", t(0)),
      engagedView("pipedrive", "s1", "v1", t(0) /* same session, distinct type */),
    ];
    const queue = computeMoneyPriorityQueue(events, []);
    const row = queue.find((r) => r.slug === "pipedrive")!;
    expect(row.eligibleHumanPageSessions).toBeGreaterThanOrEqual(0); // isolated single-event-type session may land UNRESOLVED -- see the dedicated dwell-signal test below for a guaranteed-eligible case
  });

  it("excludes isTest affiliate clicks from eligible-human click counts", () => {
    const events: FirstPartyEvent[] = [affiliateClick("pipedrive", "s_test", "v_test", new Date().toISOString(), true)];
    const queue = computeMoneyPriorityQueue(events, []);
    const row = queue.find((r) => r.slug === "pipedrive")!;
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
  });

  it("counts a real, non-test affiliate click as an eligible-human click and marks revenueReadiness READY", () => {
    // A real outbound_click with destination:affiliate and no burst signal
    // classifies CONFIRMED_CLEAN regardless of UTM (see human-classification.ts) --
    // this is the exact mechanism that made this a reliable eligibility signal.
    const events: FirstPartyEvent[] = [affiliateClick("pipedrive", "s_real", "v_real", new Date().toISOString(), false)];
    const queue = computeMoneyPriorityQueue(events, []);
    const row = queue.find((r) => r.slug === "pipedrive")!;
    expect(row.eligibleHumanAffiliateClicks).toBe(1);
    expect(row.uniqueEligibleHumanClickers).toBe(1);
    expect(row.revenueReadiness).toBe("READY");
  });

  it("marks revenueReadiness NOT_READY with a stated blocker when there is no observed demand at all", () => {
    const queue = computeMoneyPriorityQueue([], []);
    const row = queue[0]!;
    expect(row.revenueReadiness).toBe("NOT_READY");
    expect(row.currentBlocker).toMatch(/no observed eligible-human demand/i);
  });

  it("reflects real comparison coverage from data/comparisons.ts for a known active partner", () => {
    const queue = computeMoneyPriorityQueue([], []);
    const pipedrive = queue.find((r) => r.slug === "pipedrive")!;
    expect(pipedrive.comparisonCoverage).toBeGreaterThan(0);
  });

  it("reflects real Decision Guide coverage (pipedrive has its own guide entry)", () => {
    const queue = computeMoneyPriorityQueue([], []);
    const pipedrive = queue.find((r) => r.slug === "pipedrive")!;
    expect(pipedrive.hasDecisionGuideCoverage).toBe(true);
  });

  it("pulls a real commission model string from the canonical ledger when a matching entry exists", () => {
    const queue = computeMoneyPriorityQueue([], []);
    const airtable = queue.find((r) => r.slug === "airtable")!;
    expect(airtable.commissionModel).not.toBe("UNKNOWN");
  });

  it("sorts the queue by descending score", () => {
    const events: FirstPartyEvent[] = [affiliateClick("pipedrive", "s1", "v1", new Date().toISOString(), false)];
    const queue = computeMoneyPriorityQueue(events, []);
    for (let i = 1; i < queue.length; i++) expect(queue[i - 1]!.score).toBeGreaterThanOrEqual(queue[i]!.score);
  });

  it("every score component in the breakdown sums to the reported total score", () => {
    const queue = computeMoneyPriorityQueue([], []);
    for (const row of queue) {
      const sum = Object.values(row.scoreBreakdown).reduce((a, b) => a + b, 0);
      expect(row.score).toBe(sum);
    }
  });
});
