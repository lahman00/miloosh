import { describe, expect, it } from "vitest";
import { computeMoneyPriorityQueue } from "@/lib/growth/money-priority-engine";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

function pageView(slug: string, sessionId: string, visitorId: string, isTest = false): FirstPartyEvent {
  return {
    type: "page_view",
    path: `/software/${slug}`,
    visitorId,
    sessionId,
    timestamp: "2026-08-25T03:59:59.000Z",
    isTest,
  };
}

function affiliateClick(slug: string, sessionId: string, visitorId: string, isTest = false): FirstPartyEvent {
  return {
    type: "outbound_click",
    softwareSlug: slug,
    destination: "affiliate",
    url: `https://example.test/${slug}`,
    path: `/software/${slug}`,
    visitorId,
    sessionId,
    timestamp: "2026-08-25T04:00:00.000Z",
    isTest,
  };
}

function revenueLogClick(slug: string, isTest = false): StoredOutboundEvent {
  return {
    type: "affiliate_link_click",
    softwareSlug: slug,
    destination: "affiliate",
    url: `https://example.test/${slug}`,
    sourcePage: `/software/${slug}`,
    timestamp: "2026-08-25T04:00:01.000Z",
    isTest,
  };
}

describe("Money Priority Engine click truth", () => {
  it("keeps classifier-qualified first-party clicks separate from revenue-log clicks and GSC clicks", () => {
    const events: FirstPartyEvent[] = [
      pageView("pipedrive", "s_real_1", "v_real_1"),
      affiliateClick("pipedrive", "s_real_1", "v_real_1"),
    ];
    const seo = [
      {
        relatedSoftware: ["pipedrive"],
        query: "pipedrive alternative",
        gsc: { impressions: 280, clicks: 7, position: 8.2 },
      },
    ];
    const revenueLog: StoredOutboundEvent[] = [revenueLogClick("pipedrive")];

    const row = computeMoneyPriorityQueue(events, seo, revenueLog).find((item) => item.slug === "pipedrive")!;

    expect(row.eligibleHumanAffiliateClicks).toBe(1);
    expect(row.uniqueEligibleHumanClickers).toBe(1);
    expect(row.revenueLogRealAffiliateClicks).toBe(1);
    expect(row.gscClicks).toBe(7);
    expect(row.gscClicks).not.toBe(row.eligibleHumanAffiliateClicks);
  });

  it("does not promote a direct outbound POST with no preceding funnel event to human-qualified revenue evidence", () => {
    const events: FirstPartyEvent[] = [affiliateClick("close", "s_direct_post", "v_direct_post")];
    const row = computeMoneyPriorityQueue(events, [], []).find((item) => item.slug === "close")!;

    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
    expect(row.scoreBreakdown.provenClicks).toBe(0);
  });

  it("excludes QA first-party clicks from human-qualified scoring while exposing revenue-log tests separately", () => {
    const events: FirstPartyEvent[] = [
      pageView("airtable", "s_test_1", "v_test_1", true),
      affiliateClick("airtable", "s_test_1", "v_test_1", true),
    ];
    const revenueLog: StoredOutboundEvent[] = [revenueLogClick("airtable", true)];

    const row = computeMoneyPriorityQueue(events, [], revenueLog).find((item) => item.slug === "airtable")!;

    expect(row.eligibleHumanAffiliateClicks).toBe(0);
    expect(row.uniqueEligibleHumanClickers).toBe(0);
    expect(row.revenueLogRealAffiliateClicks).toBe(0);
    expect(row.revenueLogTestClicks).toBe(1);
  });

  it("does not fabricate GSC measurements when a partner has no SEO Factory row", () => {
    const row = computeMoneyPriorityQueue([], [], []).find((item) => item.slug === "close")!;
    expect(row.gscImpressions).toBe("NOT_MEASURED");
    expect(row.gscClicks).toBe("NOT_MEASURED");
    expect(row.gscAvgPosition).toBe("NOT_MEASURED");
  });
});
