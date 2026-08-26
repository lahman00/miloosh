import { describe, expect, it } from "vitest";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { computeCtaPlacementPerformance } from "@/lib/analytics/cta-performance";
import { diagnoseCtaPlacement } from "@/lib/analytics/cta-placement-diagnosis";

function pageView(sessionId: string, visitorId: string, timestamp: string, isTest = false): FirstPartyEvent {
  return {
    type: "page_view",
    path: "/software/pipedrive",
    visitorId,
    sessionId,
    timestamp,
    isTest,
  };
}

function impression(sessionId: string, visitorId: string, timestamp: string, isTest = false): FirstPartyEvent {
  return {
    type: "cta_impression",
    softwareSlug: "pipedrive",
    ctaLocation: "compare-summary-direct-vendor",
    path: "/compare/hubspot-vs-pipedrive",
    visitorId,
    sessionId,
    timestamp,
    isTest,
  };
}

function click(sessionId: string, visitorId: string, timestamp: string, isTest = false): FirstPartyEvent {
  return {
    type: "outbound_click",
    softwareSlug: "pipedrive",
    destination: "affiliate",
    url: "https://aff.trypipedrive.com/example",
    ctaLocation: "compare-summary-direct-vendor",
    path: "/compare/hubspot-vs-pipedrive",
    visitorId,
    sessionId,
    timestamp,
    isTest,
  };
}

describe("CTA placement performance", () => {
  it("computes seen-to-click only from eligible-human sessions with a prior matching impression", () => {
    const events: FirstPartyEvent[] = [
      pageView("s_seen", "v_seen", "2026-08-26T01:00:00.000Z"),
      impression("s_seen", "v_seen", "2026-08-26T01:00:06.000Z"),

      pageView("s_clicked", "v_clicked", "2026-08-26T01:10:00.000Z"),
      impression("s_clicked", "v_clicked", "2026-08-26T01:10:06.000Z"),
      click("s_clicked", "v_clicked", "2026-08-26T01:10:07.000Z"),

      // A direct endpoint-shaped click has no matching prior impression and must not inflate CTR.
      click("s_direct", "v_direct", "2026-08-26T01:20:00.000Z"),

      // QA exposure is stored but excluded from the human-qualified funnel.
      pageView("s_test_case", "v_test_case", "2026-08-26T01:30:00.000Z", true),
      impression("s_test_case", "v_test_case", "2026-08-26T01:30:06.000Z", true),
    ];

    const rows = computeCtaPlacementPerformance(events);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      softwareSlug: "pipedrive",
      ctaLocation: "compare-summary-direct-vendor",
      humanImpressionSessions: 2,
      humanImpressionVisitors: 2,
      humanClickSessionsWithPriorImpression: 1,
      humanClickVisitorsWithPriorImpression: 1,
      affiliateClickSessionsWithPriorImpression: 1,
      officialClickSessionsWithPriorImpression: 0,
      seenToClickRatePercent: 50,
    });
  });

  it("refuses to label tiny exposure as a conversion leak", () => {
    const base = {
      softwareSlug: "pipedrive",
      ctaLocation: "compare-summary-direct-vendor",
      humanImpressionVisitors: 4,
      humanClickSessionsWithPriorImpression: 0,
      humanClickVisitorsWithPriorImpression: 0,
      affiliateClickSessionsWithPriorImpression: 0,
      officialClickSessionsWithPriorImpression: 0,
      seenToClickRatePercent: 0,
    } as const;

    expect(diagnoseCtaPlacement({ ...base, humanImpressionSessions: 4 }).status).toBe("WAIT");
    expect(diagnoseCtaPlacement({ ...base, humanImpressionSessions: 10 }).status).toBe("WATCH");
    expect(diagnoseCtaPlacement({ ...base, humanImpressionSessions: 20 }).status).toBe("LEAK");
  });

  it("protects the controlled software CTA experiment from ad-hoc copy changes", () => {
    const diagnosis = diagnoseCtaPlacement({
      softwareSlug: "pipedrive",
      ctaLocation: "software-page-cta",
      humanImpressionSessions: 25,
      humanImpressionVisitors: 25,
      humanClickSessionsWithPriorImpression: 0,
      humanClickVisitorsWithPriorImpression: 0,
      affiliateClickSessionsWithPriorImpression: 0,
      officialClickSessionsWithPriorImpression: 0,
      seenToClickRatePercent: 0,
    });

    expect(diagnosis.status).toBe("LEAK");
    expect(diagnosis.action).toContain("controlled software CTA experiment");
  });
});
