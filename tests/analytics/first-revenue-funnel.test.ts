import { describe, expect, it } from "vitest";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { OutboundReadResult } from "@/lib/revenue/outbound-read";
import { summarizeFirstRevenuePage } from "@/lib/revenue/first-revenue-funnel";

const when = "2026-09-25T09:00:00Z";
const until = "2026-09-25T10:00:00Z";
function event(type: string, extra: Record<string, unknown> = {}): FirstPartyEvent {
  return { type, path: "/software/airtable", softwareSlug: "airtable", ctaLocation: "money-page-decision-card", timestamp: when, isTest: false, visitorId: "v_customer", sessionId: "s_customer", ...extra } as FirstPartyEvent;
}
function ledger(extra: Record<string, unknown> = {}): OutboundReadResult {
  return { status: "COMPLETE", backend: "blob", recordsListed: 1, failedReads: 0, listingComplete: true, events: [{ type: "affiliate_link_click", sourcePage: "/software/airtable", softwareSlug: "airtable", destination: "affiliate", url: "https://airtable.partnerlinks.io/b0dz88v48tek", ctaLocation: "money-page-decision-card", isTest: false, timestamp: when, ...extra }] } as OutboundReadResult;
}

describe("canonical first-revenue funnel", () => {
  it("counts all commercial CTAs on the exact primary page, not support/comparison pages", () => {
    const events = [event("page_view"), event("cta_impression"), event("cta_click"), event("cta_click", { path: "/compare/monday-vs-airtable" }), event("cta_click", { ctaLocation: "pricing-section-cta" })];
    const r = summarizeFirstRevenuePage("airtable", events, ledger(), until);
    expect([r.pageViews,r.ctaImpressions,r.ctaClicks,r.merchantHandoffs]).toEqual([1,1,2,1]);
    expect(r.primaryCtaClicks).toBe(1);
    expect(summarizeFirstRevenuePage("airtable", events, ledger({sourcePage:"/compare/monday-vs-airtable"}),until).merchantHandoffs).toBe(0);
  });
  it("excludes test, unknown classification, malformed and future timestamps", () => {
    const r = summarizeFirstRevenuePage("airtable", [event("page_view",{isTest:true}),event("page_view",{isTest:undefined}),event("cta_click",{timestamp:"bad"}),event("cta_click",{timestamp:"2027-01-01T00:00:00Z"})], ledger({isTest:undefined}), until);
    expect([r.pageViews,r.ctaClicks,r.merchantHandoffs,r.unclassifiedHandoffs,r.unclassifiedAnalytics]).toEqual([0,0,0,1,1]);
  });
  it("keeps missing and partial evidence unavailable rather than zero", () => {
    expect(summarizeFirstRevenuePage("airtable",null,null,until).pageViews).toBeNull();
    expect(summarizeFirstRevenuePage("airtable",[],{...ledger(),status:"PARTIAL"},until).merchantHandoffs).toBeNull();
  });
  it("attributes only to an earlier same-page visitor/session touch", () => {
    const r=summarizeFirstRevenuePage("airtable",[event("page_view",{utmSource:"x",utmMedium:"organic_social",utmCampaign:"first-revenue",utmContent:"airtable-seat-cost"}),event("cta_click"),event("outbound_click",{destination:"affiliate"}),event("cta_click",{sessionId:"s_other"})],ledger(),until);
    expect(r.sourceRows?.find((x)=>x.source==="x")).toMatchObject({visits:1,ctaClicks:1,recordedHandoffs:1,content:"airtable-seat-cost"});
    expect(r.sourceRows?.find((x)=>x.source==="unknown")?.ctaClicks).toBe(1);
  });
  it("rejects invalid reporting windows",()=>expect(()=>summarizeFirstRevenuePage("airtable",[],ledger(),"bad")).toThrow());
});
