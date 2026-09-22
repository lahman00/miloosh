import { describe, expect, it } from "vitest";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { computePeriodMetrics, computeRecommendDomainBreakdown } from "@/scripts/analytics/report";

const base = { visitorId: "v_merchant", sessionId: "s_recommend", isTest: false };
const completed: FirstPartyEvent = {
  ...base, type: "recommend_completed", path: "/recommend", domain: "ecommerce_platform",
  timestamp: "2026-09-21T08:00:00.000Z",
};
function outbound(sessionId: string, timestamp = "2026-09-21T08:01:00.000Z"): FirstPartyEvent {
  return {
    ...base, sessionId, timestamp, type: "outbound_click", path: "/software/wix",
    softwareSlug: "wix", destination: "affiliate", url: "https://example.com/vendor",
  };
}

describe("Recommend outbound attribution stays within the visitor/session pair", () => {
  it("does not credit a later unrelated session to an ecommerce completion", () => {
    const events = [completed, outbound("s_unrelated")];
    expect(computeRecommendDomainBreakdown(events)[0].outboundClickersAfter).toBe(0);
    const metrics = computePeriodMetrics("fixture", events);
    expect(metrics.outboundClickers).toBe(1);
    expect(metrics.recommendFunnel.outboundClickersAfter).toEqual({ people: 0, sessions: 0, events: 0 });
    expect(metrics.recommendFunnel.affiliateClickersAfter.events).toBe(0);
  });

  it("retains same-session attribution even when another tab completes a different domain", () => {
    const events: FirstPartyEvent[] = [
      outbound("s_recommend"), completed,
      { ...completed, sessionId: "s_other_tab", domain: "crm", timestamp: "2026-09-21T08:00:30.000Z" },
    ];
    const rows = computeRecommendDomainBreakdown(events);
    expect(rows.find(row => row.domain === "ecommerce_platform")?.outboundClickersAfter).toBe(1);
    expect(rows.find(row => row.domain === "crm")?.outboundClickersAfter).toBe(0);
    expect(computePeriodMetrics("fixture", events).recommendFunnel.affiliateClickersAfter.events).toBe(1);
  });

  it("requires a prior touch and does not join different visitors sharing a session ID", () => {
    const events = [completed, outbound("s_recommend", "2026-09-21T07:59:00.000Z"), { ...outbound("s_recommend"), visitorId: "v_other" }];
    expect(computeRecommendDomainBreakdown(events)[0].outboundClickersAfter).toBe(0);
    expect(computePeriodMetrics("fixture", events).recommendFunnel.outboundClickersAfter.events).toBe(0);
  });

  it("counts a situation selection as a Recommend touch without assuming a domain completion", () => {
    const events: FirstPartyEvent[] = [
      { ...base, type: "recommend_ecommerce_situation_selected", path: "/recommend", situation: "repair", timestamp: completed.timestamp },
      outbound("s_recommend"),
    ];
    expect(computeRecommendDomainBreakdown(events)).toEqual([]);
    expect(computePeriodMetrics("fixture", events).recommendFunnel.outboundClickersAfter.events).toBe(1);
  });
});
