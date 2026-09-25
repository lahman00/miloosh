import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { NextRequest } from "next/server";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import { POST } from "@/app/api/outbound-click/route";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { getOutboundEvents } from "@/lib/revenue/events";
import { summarizeFirstRevenuePage } from "@/lib/revenue/first-revenue-funnel";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";

beforeEach(() => {
  process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
  for (const name of ["first-party-analytics.json", "outbound-clicks.json"] as const) fs.rmSync(analyticsLocalPath(name), { force: true });
});
describe("one recorded handoff can be reconstructed without the landing beacon", () => {
  it.each(FIRST_REVENUE_PAGES.map(p => p.slug))("%s: product/source/session/page/upstream/placement/time survive both real local sinks", async slug => {
    const started = new Date(Date.now() - 60_000).toISOString();
    const acquisition = { sessionId: "s_forensic", landingPath: "/recommend", capturedAt: started, trafficSource: "email", utmSource: "newsletter", utmMedium: "email", utmCampaign: "decision", utmContent: "first-revenue" };
    const response = await POST(new NextRequest("https://miloosh.com/api/outbound-click", {
      method: "POST", headers: { "user-agent": "Mozilla/5.0 Chrome/128 Safari/537.36", referer: `https://miloosh.com/software/${slug}` },
      body: JSON.stringify({ slug, kind: "cta", ctaLocation: "money-page-decision-card", visitorId: "v_forensic", sessionId: "s_forensic", eventId: `forensic-handoff-${slug}`, acquisition, previousPath: "/compare/airtable-vs-notion?private=discard", isTest: false, url: "https://attacker.invalid", email: "not-stored" }),
    }));
    expect(await response.json()).toMatchObject({ recorded: true, sinks: { firstParty: "RECORDED", legacy: "RECORDED" } });
    const first = await getAllFirstPartyEvents(), legacy = await getOutboundEvents();
    expect(first).toHaveLength(1); expect(legacy).toHaveLength(1);
    for (const record of [first[0], legacy[0]]) {
      expect(record).toMatchObject({ acquisition, previousPath: "/compare/airtable-vs-notion", visitorId: "v_forensic", sessionId: "s_forensic", eventId: `forensic-handoff-${slug}`, softwareSlug: slug, ctaLocation: "money-page-decision-card", destination: "affiliate" });
      expect(Number.isFinite(Date.parse(record.timestamp))).toBe(true);
      expect(JSON.stringify(record)).not.toMatch(/attacker|private|not-stored/);
    }
    const report = summarizeFirstRevenuePage(slug, first, { status: "COMPLETE", backend: "local", recordsListed: 1, failedReads: 0, listingComplete: true, events: legacy }, new Date().toISOString(), started);
    expect(report.pageViews).toBe(0); expect(report.ctaClicks).toBe(0); // No invented earlier stage.
    expect(report.sourceRows).toEqual([{ source: "newsletter", medium: "email", campaign: "decision", content: "first-revenue", visits: 0, ctaClicks: 0, recordedHandoffs: 1 }]);
    expect(report.merchantHandoffs).toBe(1); // Separate overlapping ledger, not summed.
  });
});
