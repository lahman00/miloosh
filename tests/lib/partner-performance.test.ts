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
  it("keeps GSC search clicks separate from first-party affiliate clicks", () => {
    const rows = buildPartnerPerformanceRows({
      outboundRows: [outbound("pipedrive", 2)],
      gscBySlug: {
        pipedrive: { impressions: 280, searchClicks: 7, source: "test-gsc-snapshot" },
      },
      networkSignals: [],
    });

    const pipedrive = rows.find((row) => row.slug === "pipedrive")!;
    expect(pipedrive.gscSearchClicks).toBe(7);
    expect(pipedrive.firstPartyAffiliateClicks).toBe(2);
    expect(pipedrive.firstPartyOutboundClicks).toBe(2);
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
    expect(krispcall.firstPartyAffiliateClicks).toBe(0);
    expect(krispcall.firstPartyOutboundClicks).toBe(0);
  });

  it("keeps test clicks out of real outbound totals", () => {
    const rows = buildPartnerPerformanceRows({
      outboundRows: [outbound("airtable", 1, 4)],
      networkSignals: [],
    });
    const airtable = rows.find((row) => row.slug === "airtable")!;

    expect(airtable.firstPartyAffiliateClicks).toBe(1);
    expect(airtable.firstPartyOutboundClicks).toBe(1);
    expect(airtable.firstPartyTestClicks).toBe(4);
  });

  it("preserves unknown downstream outcomes as unknown instead of fabricating zero", () => {
    const rows = buildPartnerPerformanceRows({ outboundRows: [], networkSignals: [] });
    const close = rows.find((row) => row.slug === "close")!;

    expect(close.conversions).toBeNull();
    expect(close.commissions).toBeNull();
    expect(close.revenue).toBeNull();
  });

  it("gives proven first-party affiliate movement more weight than impressions alone", () => {
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
  });

  it("covers every currently active partner exactly once", () => {
    const rows = buildPartnerPerformanceRows({ networkSignals: [] });
    expect(rows).toHaveLength(19);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(19);
  });
});
