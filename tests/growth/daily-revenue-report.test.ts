import { describe, expect, it, vi } from "vitest";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

// Session ids encode their bucket so the report logic is tested without the real classifier's thresholds.
vi.mock("@/lib/analytics/human-classification", () => ({
  classifySessions: (events: Array<{ sessionId: string }>) =>
    [...new Set(events.map((e) => e.sessionId))].map((sessionId) => ({
      sessionId,
      visitorId: `v-${sessionId}`,
      bucket: sessionId.startsWith("q") ? "CONFIRMED_CLEAN" : sessionId.startsWith("p") ? "PROBABLE_HUMAN" : sessionId.startsWith("t") ? "KNOWN_QA_TEST" : "SUSPICIOUS",
    })),
}));

import { buildDailyRevenueReport, type SourceRead } from "@/lib/growth/daily-revenue-report";

const NOW = new Date("2026-10-21T12:00:00.000Z");
const day = (n: number, minutes = 0) => new Date(NOW.getTime() - n * 86400000 + minutes * 60000).toISOString();
const base = (sessionId: string, ts: string, path = "/compare/a-vs-b") => ({ visitorId: `v-${sessionId}`, sessionId, timestamp: ts, path });
const pv = (s: string, ts: string, source: "social" | "direct" = "social"): FirstPartyEvent => ({ ...base(s, ts), type: "page_view", trafficSource: source }) as FirstPartyEvent;
const cmp = (s: string, ts: string): FirstPartyEvent => ({ ...base(s, ts), type: "comparison_view", comparisonSlug: "a-vs-b" }) as FirstPartyEvent;
const imp = (s: string, ts: string): FirstPartyEvent => ({ ...base(s, ts), type: "cta_impression", softwareSlug: "close" }) as FirstPartyEvent;
const clk = (s: string, ts: string): FirstPartyEvent => ({ ...base(s, ts), type: "cta_click", softwareSlug: "close" }) as FirstPartyEvent;
const out = (s: string, ts: string, destination: "affiliate" | "official" = "affiliate", isTest = false): FirstPartyEvent => ({ ...base(s, ts), type: "outbound_click", softwareSlug: "close", destination, url: "https://v.example", isTest }) as FirstPartyEvent;
const led = (ts: string, isTest?: boolean, destination: "affiliate" | "official" = "affiliate"): StoredOutboundEvent => ({ type: "affiliate_link_click", softwareSlug: "close", destination, url: "https://v.example", sourcePage: "/software/close", timestamp: ts, ...(isTest === undefined ? {} : { isTest }) }) as StoredOutboundEvent;

const COMPLETE: SourceRead = { status: "COMPLETE", listed: 10, read: 10, failed: 0 };
const partners = [{ slug: "close", payoutReadiness: "VERIFIED" as const, revenueReady: true }, { slug: "wix", payoutReadiness: "OWNER_ACTION_REQUIRED" as const, revenueReady: false }];
const win = (w: unknown) => w as import("@/lib/growth/daily-revenue-report").WindowSummary;
const run = (over: Partial<Parameters<typeof buildDailyRevenueReport>[0]> = {}) =>
  buildDailyRevenueReport({ now: NOW, events: [], ledger: [], reads: { firstParty: COMPLETE, ledger: COMPLETE }, partners, ...over });

describe("buildDailyRevenueReport", () => {
  it("separates strict, probable and excluded sessions and compares equal windows", () => {
    const events = [
      pv("q1", day(1)), cmp("q1", day(1, 1)), imp("q1", day(1, 2)), clk("q1", day(1, 3)), out("q1", day(1, 4)),
      pv("p1", day(2)), cmp("p1", day(2, 1)),
      pv("x1", day(2)), out("x1", day(2, 1)),
      pv("t1", day(1)), out("t1", day(1, 1)),
      pv("q0", day(9)), cmp("q0", day(9, 1)),
    ];
    const r = run({ events });
    expect(win(r.current).sessions).toMatchObject({ qualified: 1, probableHuman: 1, excluded: 2, total: 4 });
    expect(win(r.previous).sessions).toMatchObject({ qualified: 1, probableHuman: 0, excluded: 0 });
    expect(win(r.current).commercialPageSessions).toEqual({ qualified: 1, probableHuman: 1 });
    expect(win(r.current).ctaImpressionEvents).toBe(1);
    expect(win(r.current).ctaClickEvents).toBe(1);
    expect(win(r.current).firstPartyOutbound).toEqual({ affiliate: 1, official: 0, testMarked: 0 });
    expect(r.delta).toEqual({ qualifiedSessions: 0, probableSessions: 1, ctaClickEvents: 1, firstPartyAffiliateHandoffs: 1 });
    expect(win(r.current).byChannel.social).toEqual({ qualified: 1, probableHuman: 1, excluded: 2 });
  });

  it("splits strict and probable sessions by device bucket and never calls an unrecorded session desktop", () => {
    const withViewport = (e: FirstPartyEvent, viewport: "mobile" | "desktop") => ({ ...e, viewport }) as FirstPartyEvent;
    const events = [withViewport(pv("q1", day(1)), "mobile"), pv("q1", day(1, 1)), withViewport(pv("p1", day(1)), "desktop"), pv("p2", day(1))];
    const r = run({ events });
    expect(win(r.current).byViewport).toEqual({ mobile: { qualified: 1, probableHuman: 0 }, tablet: { qualified: 0, probableHuman: 0 }, desktop: { qualified: 0, probableHuman: 1 }, NOT_RECORDED: { qualified: 0, probableHuman: 1 } });
  });

  it("reports the premium gate against its own page views and ignores test and excluded sessions", () => {
    const gatePath = "/compare/krispcall-vs-dialpad";
    const view = (sid: string, ts: string): FirstPartyEvent => ({ ...base(sid, ts, gatePath), type: "comparison_view", comparisonSlug: "krispcall-vs-dialpad" }) as FirstPartyEvent;
    const intent = (sid: string, ts: string, isTest = false): FirstPartyEvent => ({ ...base(sid, ts, gatePath), type: "premium_intent_clicked", comparisonSlug: "krispcall-vs-dialpad", isTest }) as FirstPartyEvent;
    const events = [view("q1", day(1)), intent("q1", day(1, 1)), view("q2", day(1)), view("p1", day(1)), intent("p1", day(1, 1)), view("x1", day(1)), intent("x1", day(1, 1)), view("q3", day(1)), intent("q3", day(1, 1), true), { ...view("q4", day(1)), path: "/compare/other-vs-thing" } as FirstPartyEvent];
    const gate = win(run({ events }).current).premiumGate;
    expect(gate).toEqual({ pageSessions: { qualified: 3, probableHuman: 1 }, intentSessions: { qualified: 1, probableHuman: 1 }, intentEvents: 2 });
  });

  it("counts test-marked outbound clicks on their own line and never as handoffs", () => {
    const r = run({ events: [pv("q1", day(1)), out("q1", day(1, 1), "affiliate", true), out("q1", day(1, 2), "official")] });
    expect(win(r.current).firstPartyOutbound).toEqual({ affiliate: 0, official: 1, testMarked: 1 });
  });

  it("keeps the legacy ledger separate and never adds it to first-party counts", () => {
    const r = run({ events: [pv("q1", day(1)), out("q1", day(1, 1))], ledger: [led(day(1), false), led(day(1, 5), true), led(day(2), undefined), led(day(20), false)] });
    expect(win(r.current).firstPartyOutbound.affiliate).toBe(1);
    expect(win(r.current).ledger).toEqual({ stored: 3, test: 1, explicitNonTest: 1, unmarked: 1, affiliateNonTest: 1, officialNonTest: 0 });
    const close = r.partners.find((p) => p.slug === "close")!;
    expect(close.siteHandoffs).toEqual({ firstPartyAffiliate: 1, ledgerAffiliateNonTest: 1, ledgerTest: 1 });
  });

  it("reports an unavailable ledger as NOT_MEASURED, not zero", () => {
    const r = run({ ledger: null, reads: { firstParty: COMPLETE, ledger: { status: "UNAVAILABLE", listed: null, read: null, failed: null } } });
    expect(win(r.current).ledger).toBe("NOT_MEASURED");
  });

  it("states no change when the first-party read was not complete", () => {
    const r = run({ events: [pv("q1", day(1))], reads: { firstParty: { status: "PARTIAL", listed: 10, read: 8, failed: 2 }, ledger: COMPLETE } });
    expect(r.delta).toEqual({ qualifiedSessions: null, probableSessions: null, ctaClickEvents: null, firstPartyAffiliateHandoffs: null });
    expect(r.statements.join(" ")).toContain("not COMPLETE");
  });

  it("reports partner-network figures only when observed, separately, never summing currencies", () => {
    const none = run();
    expect(none.partners.every((p) => p.network.clicks === "NOT_MEASURED" && p.network.approvedCommission === "NOT_MEASURED")).toBe(true);
    expect(none.statements.join(" ")).toContain("NOT_MEASURED");
    const seen = run({ network: [{ partner: "close", network: "PartnerStack", source: "dashboard export", asOf: "2026-10-21", windowStart: null, windowEnd: null, clicks: 4, leads: 0, conversions: 0, approvedCommission: { USD: 0 }, paidCommission: { USD: 0, EUR: 0 } }] });
    const close = seen.partners.find((p) => p.slug === "close")!;
    expect(close.network).toMatchObject({ observed: true, clicks: 4, leads: 0, conversions: 0, approvedCommission: { USD: 0 }, paidCommission: { USD: 0, EUR: 0 } });
    expect(seen.partners.find((p) => p.slug === "wix")!.network.clicks).toBe("NOT_MEASURED");
  });

  it("treats an unavailable first-party read as no data, never an empty funnel", () => {
    const r = run({ events: null, reads: { firstParty: { status: "UNAVAILABLE", listed: null, read: null, failed: null }, ledger: COMPLETE } });
    expect(r.current).toBe("NOT_MEASURED");
    expect(r.previous).toBe("NOT_MEASURED");
    expect(r.topLandings).toEqual([]);
    expect(r.delta.qualifiedSessions).toBeNull();
    expect(r.captureIntegrity).toBe("NOT_VERIFIED");
  });
});
