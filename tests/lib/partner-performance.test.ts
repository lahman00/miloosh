import { describe, expect, it } from "vitest";
import { buildPartnerPerformanceRows } from "@/lib/revenue/partner-performance";
import type { OutboundClickSummaryRow } from "@/lib/revenue/events";
import type { NetworkPerformanceSignal } from "@/data/affiliate/network-performance-signals";

function outbound(
  softwareSlug: string,
  affiliateClicks: number,
  testClicks = 0,
  officialClicks = 0,
  vendorLinkClicks = 0
): OutboundClickSummaryRow {
  return {
    softwareSlug,
    officialClicks,
    affiliateClicks,
    vendorLinkClicks,
    totalClicks: affiliateClicks + officialClicks + vendorLinkClicks,
    testClicks,
  };
}

describe("canonical partner performance", () => {
  it("keeps GSC search clicks separate from non-test first-party affiliate events", () => {
    const rows = buildPartnerPerformanceRows({
      outboundRows: [outbound("pipedrive", 2)],
      gscBySlug: {
        pipedrive: { impressions: 280, searchClicks: 7, source: "test-gsc-snapshot" },
      },
      networkSignals: [],
    });

    const pipedrive = rows.find((row) => row.slug === "pipedrive")!;
    expect(pipedrive.gscSearchClicks).toBe(7);
    expect(pipedrive.nonTestFirstPartyAffiliateEvents).toBe(2);
    expect(pipedrive.nonTestFirstPartyOutboundEvents).toBe(2);
    expect(pipedrive.eligibleHumanAffiliateClicks).toBeNull();
  });

  it("never merges network-side click evidence into first-party telemetry", () => {
    const networkSignals: NetworkPerformanceSignal[] = [
      {
        partnerSlug: "krispcall",
        observedAt: "2026-08-24",
        source: "first-party-email",
        network: "PartnerStack / KrispCall",
        signal: "CLICK_MILESTONE",
        clickFloor: 10,
        summary: "Network says 10+ clicks.",
        provesConversion: false,
        provesRevenue: false,
      },
    ];

    const rows = buildPartnerPerformanceRows({ outboundRows: [], networkSignals });
    const krispcall = rows.find((row) => row.slug === "krispcall")!;

    expect(krispcall.networkClickActivity).toBe(true);
    expect(krispcall.networkClickFloor).toBe(10);
    expect(krispcall.nonTestFirstPartyAffiliateEvents).toBe(0);
    expect(krispcall.nonTestFirstPartyOutboundEvents).toBe(0);
    expect(krispcall.eligibleHumanAffiliateClicks).toBeNull();
  });

  it("keeps test events out of non-test outbound totals without calling the remainder human", () => {
    const rows = buildPartnerPerformanceRows({
      outboundRows: [outbound("airtable", 1, 4)],
      networkSignals: [],
    });
    const airtable = rows.find((row) => row.slug === "airtable")!;

    expect(airtable.nonTestFirstPartyAffiliateEvents).toBe(1);
    expect(airtable.nonTestFirstPartyOutboundEvents).toBe(1);
    expect(airtable.firstPartyTestEvents).toBe(4);
    expect(airtable.eligibleHumanAffiliateClicks).toBeNull();
  });

  it("uses classifier-qualified human clicks only when explicitly supplied", () => {
    const rows = buildPartnerPerformanceRows({
      outboundRows: [outbound("close", 3)],
      eligibleHumanAffiliateClicksBySlug: { close: 1 },
      networkSignals: [],
    });
    const close = rows.find((row) => row.slug === "close")!;

    expect(close.nonTestFirstPartyAffiliateEvents).toBe(3);
    expect(close.eligibleHumanAffiliateClicks).toBe(1);
    expect(close.scoreBreakdown.eligibleHumanAffiliateClicks).toBeGreaterThan(0);
  });

  it("preserves unknown downstream outcomes as unknown instead of fabricating zero", () => {
    const rows = buildPartnerPerformanceRows({ outboundRows: [], networkSignals: [] });
    const close = rows.find((row) => row.slug === "close")!;

    expect(close.conversions).toBeNull();
    expect(close.commissions).toBeNull();
    expect(close.revenue).toBeNull();
  });

  it("lets a first-party non-test affiliate signal outrank impressions alone while weighting it below classified-human evidence", () => {
    const rows = buildPartnerPerformanceRows({
      outboundRows: [outbound("pipedrive", 2), outbound("todoist", 0)],
      gscBySlug: {
        pipedrive: { impressions: 24, searchClicks: 0, source: "fixture" },
        todoist: { impressions: 1000, searchClicks: 0, source: "fixture" },
      },
      comparisonCountBySlug: { pipedrive: 12, todoist: 17 },
      networkSignals: [],
    });

    const pipedrive = rows.find((row) => row.slug === "pipedrive")!;
    const todoist = rows.find((row) => row.slug === "todoist")!;
    expect(pipedrive.revenueProximityScore).toBeGreaterThan(todoist.revenueProximityScore);
    expect(pipedrive.scoreBreakdown.eligibleHumanAffiliateClicks).toBe(0);
    expect(pipedrive.scoreBreakdown.nonTestFirstPartyAffiliateEvents).toBeGreaterThan(0);
  });

  it("covers every currently active partner exactly once", () => {
    const rows = buildPartnerPerformanceRows({ networkSignals: [] });
    expect(rows).toHaveLength(19);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(19);
  });
});
