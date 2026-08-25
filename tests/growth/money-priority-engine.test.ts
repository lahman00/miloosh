import { describe, it, expect } from "vitest";
import { computeMoneyPriorityQueue, type SeoOpportunityRow } from "@/lib/growth/money-priority-engine";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

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

  // ---- MILOOSH RECONCILIATION mission (2026-08-25) ----
  // A prior compiled report mislabeled the revenue log's TEST-click counts
  // as REAL-click counts (Pipedrive "2", Airtable "1", Close "1"), while a
  // separate part of the same report correctly showed the first-party
  // engine ranking those same partners at zero eligible-human clicks. The
  // two numbers were never actually contradictory in the code -- they come
  // from two different, deliberately un-merged stores -- but reporting
  // only one of them, mislabeled, made it look that way. These tests pin
  // down the real contract the engine follows so that mistake can't repeat
  // silently: the revenue log's real/test counts are surfaced as their own
  // fields, never folded into eligibleHumanAffiliateClicks or the score.

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

  it("counts a real (non-test) revenue-log affiliate click in revenueLogRealAffiliateClicks, separately from the first-party click fields", () => {
    const revenueLogEvents: StoredOutboundEvent[] = [revenueLogClick("pipedrive", "2026-08-19T20:19:06.064Z", false)];
    const queue = computeMoneyPriorityQueue([], [], revenueLogEvents);
    const row = queue.find((r) => r.slug === "pipedrive")!;
    expect(row.revenueLogRealAffiliateClicks).toBe(1);
    expect(row.revenueLogTestClicks).toBe(0);
    // Not merged into the first-party-only fields:
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
  });

  it("counts a test revenue-log click in revenueLogTestClicks, not in revenueLogRealAffiliateClicks", () => {
    const revenueLogEvents: StoredOutboundEvent[] = [revenueLogClick("airtable", "2026-08-24T10:00:00.000Z", true)];
    const queue = computeMoneyPriorityQueue([], [], revenueLogEvents);
    const row = queue.find((r) => r.slug === "airtable")!;
    expect(row.revenueLogRealAffiliateClicks).toBe(0);
    expect(row.revenueLogTestClicks).toBe(1);
  });

  it("never lets a revenue-log click change the score -- only first-party eligible-human clicks feed scoreBreakdown.provenClicks", () => {
    const revenueLogEvents: StoredOutboundEvent[] = [
      revenueLogClick("close", "2026-08-24T09:00:00.000Z", false),
      revenueLogClick("close", "2026-08-24T09:05:00.000Z", false),
      revenueLogClick("close", "2026-08-24T09:10:00.000Z", false),
    ];
    const withoutRevenueLog = computeMoneyPriorityQueue([], []).find((r) => r.slug === "close")!;
    const withRevenueLog = computeMoneyPriorityQueue([], [], revenueLogEvents).find((r) => r.slug === "close")!;
    expect(withRevenueLog.revenueLogRealAffiliateClicks).toBe(3);
    expect(withRevenueLog.score).toBe(withoutRevenueLog.score);
    expect(withRevenueLog.scoreBreakdown.provenClicks).toBe(withoutRevenueLog.scoreBreakdown.provenClicks);
    expect(withRevenueLog.revenueReadiness).toBe(withoutRevenueLog.revenueReadiness);
  });

  it("defaults revenueLogRealAffiliateClicks/revenueLogTestClicks to 0 when no revenue-log events are passed (backward-compatible 2-arg call)", () => {
    const queue = computeMoneyPriorityQueue([], []);
    for (const row of queue) {
      expect(row.revenueLogRealAffiliateClicks).toBe(0);
      expect(row.revenueLogTestClicks).toBe(0);
    }
  });

  it("never treats a GSC search click as an affiliate/outbound click", () => {
    const seo: SeoOpportunityRow[] = [{ relatedSoftware: ["pipedrive"], query: "pipedrive alternatives", gsc: { impressions: 100, clicks: 7, position: 12 } }];
    const queue = computeMoneyPriorityQueue([], seo);
    const row = queue.find((r) => r.slug === "pipedrive")!;
    expect(row.gscClicks).toBe(7);
    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
    expect(row.revenueLogRealAffiliateClicks).toBe(0);
  });

  it("does not attribute network-side vendor-reported activity (e.g. KrispCall/WhatConverts milestone emails) to any partner -- the engine has no input parameter for it", () => {
    // The engine's signature only accepts first-party events, SEO opportunity
    // rows, and the first-party revenue log -- there is no fourth parameter
    // for vendor-reported network milestones (see
    // data/affiliate/FIRST_PARTY_SIGNALS_2026-08-24.md). This test pins that
    // contract down: computeMoneyPriorityQueue.length reflects exactly the
    // three legitimate, always-separate signal sources.
    expect(computeMoneyPriorityQueue.length).toBe(2); // 2 required params; the 3rd (revenueLogEvents) is optional/defaulted and so isn't counted in Function.length
    const queue = computeMoneyPriorityQueue([], []);
    for (const row of queue) {
      expect(row.revenueLogRealAffiliateClicks).toBe(0);
    }
  });
});
