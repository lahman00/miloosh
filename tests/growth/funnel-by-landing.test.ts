import { describe, expect, it } from "vitest";
import { buildFunnelByLanding } from "@/lib/growth/funnel-by-landing";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { SessionClassification, TrafficBucket } from "@/lib/analytics/human-classification";

let tick = 0;
const at = () => new Date(Date.UTC(2026, 9, 19, 8, 0, tick++)).toISOString();
const base = (sessionId: string, path: string) => ({ visitorId: `v-${sessionId}`, sessionId, timestamp: at(), path });
const pageView = (s: string, path: string, source: "social" | "organic_search" | "direct" | undefined): FirstPartyEvent => ({ ...base(s, path), type: "page_view", trafficSource: source }) as FirstPartyEvent;
const comparison = (s: string, path: string): FirstPartyEvent => ({ ...base(s, path), type: "comparison_view", comparisonSlug: "a-vs-b" }) as FirstPartyEvent;
const impression = (s: string, path: string): FirstPartyEvent => ({ ...base(s, path), type: "cta_impression", softwareSlug: "a" }) as FirstPartyEvent;
const click = (s: string, path: string): FirstPartyEvent => ({ ...base(s, path), type: "cta_click", softwareSlug: "a" }) as FirstPartyEvent;
const outbound = (s: string, path: string, destination: "affiliate" | "official", isTest = false): FirstPartyEvent => ({ ...base(s, path), type: "outbound_click", softwareSlug: "a", destination, url: "https://v.example", isTest }) as FirstPartyEvent;
const cls = (sessionId: string, bucket: TrafficBucket): SessionClassification => ({ sessionId, visitorId: `v-${sessionId}`, bucket, reasonCode: "UNKNOWN", evidence: "", eventCount: 1, distinctPaths: 1, distinctEventTypes: 1, firstTimestamp: "", lastTimestamp: "", dwellMs: 0, hasUtmContent: false, isPartOfBurst: false });

const P = "/compare/a-vs-b";

describe("buildFunnelByLanding", () => {
  it("counts qualified sessions by landing page and channel with their funnel steps and rates", () => {
    const events = [
      pageView("s1", P, "social"), comparison("s1", P), impression("s1", P), click("s1", P), outbound("s1", P, "affiliate"),
      pageView("s2", P, "social"), comparison("s2", P), impression("s2", P),
      pageView("s3", P, "organic_search"), comparison("s3", P),
    ];
    const report = buildFunnelByLanding({ events, classifications: [cls("s1", "CONFIRMED_CLEAN"), cls("s2", "STRONG_HUMAN_EVIDENCE"), cls("s3", "STRONG_HUMAN_EVIDENCE")] });
    const social = report.rows.find((r) => r.channel === "social")!;
    expect(social).toMatchObject({ landingPath: P, sessions: { qualified: 2, probableHuman: 0, excluded: 0 }, commercialPageVisitSessions: 2, ctaImpressionSessions: 2, ctaClickSessions: 1, outboundClicks: { official: 0, affiliate: 1 } });
    expect(social.rates).toEqual({ commercialVisitRate: 1, ctaClickRate: 0.5, outboundRate: 0.5 });
    const organic = report.rows.find((r) => r.channel === "organic_search")!;
    expect(organic.rates).toEqual({ commercialVisitRate: 1, ctaClickRate: null, outboundRate: 0 });
  });

  it("reports a rate with no denominator as null, never as zero", () => {
    const report = buildFunnelByLanding({ events: [pageView("s1", "/", "direct")], classifications: [cls("s1", "PROBABLE_HUMAN")] });
    expect(report.rows[0]!.sessions).toEqual({ qualified: 0, probableHuman: 1, excluded: 0 });
    expect(report.rows[0]!.rates).toEqual({ commercialVisitRate: null, ctaClickRate: null, outboundRate: null });
  });

  it("keeps probable-human sessions out of the qualified count and out of the rates, and QA, automation and suspicious sessions out of everything", () => {
    const events = [
      pageView("q", P, "social"), comparison("q", P),
      pageView("p", P, "social"), comparison("p", P), impression("p", P), click("p", P),
      pageView("t", P, "social"), comparison("t", P), impression("t", P), click("t", P), outbound("t", P, "affiliate"),
      pageView("b", P, "social"), outbound("b", P, "affiliate"),
    ];
    const report = buildFunnelByLanding({ events, classifications: [cls("q", "CONFIRMED_CLEAN"), cls("p", "PROBABLE_HUMAN"), cls("t", "KNOWN_QA_TEST"), cls("b", "SUSPICIOUS")] });
    const row = report.rows[0]!;
    expect(row.sessions).toEqual({ qualified: 1, probableHuman: 1, excluded: 2 });
    expect(row.ctaClickSessions).toBe(0);
    expect(row.outboundClicks).toEqual({ official: 0, affiliate: 0 });
    expect(report.totals).toMatchObject({ qualifiedSessions: 1, probableHumanSessions: 1, excludedSessions: 2 });
  });

  it("ignores test-marked outbound clicks even inside a qualified session", () => {
    const events = [pageView("s", P, "direct"), outbound("s", P, "affiliate", true), outbound("s", P, "official")];
    const report = buildFunnelByLanding({ events, classifications: [cls("s", "CONFIRMED_CLEAN")] });
    expect(report.rows[0]!.outboundClicks).toEqual({ official: 1, affiliate: 0 });
  });

  it("attributes a session with no page view to its first event and to the unknown channel", () => {
    const report = buildFunnelByLanding({ events: [comparison("s", P)], classifications: [cls("s", "STRONG_HUMAN_EVIDENCE")] });
    expect(report.rows[0]).toMatchObject({ landingPath: P, channel: "unknown" });
  });

  it("counts events of sessions the classifier did not see, and reports partner conversions as not measured unless supplied", () => {
    const report = buildFunnelByLanding({ events: [pageView("x", "/", "direct")], classifications: [] });
    expect(report.totals.unclassifiedEvents).toBe(1);
    expect(report.rows).toEqual([]);
    expect(report.partnerConversions).toBe("NOT_MEASURED");
    expect(report.captureIntegrity).toBe("NOT_VERIFIED");
    const supplied = buildFunnelByLanding({ events: [], classifications: [], partnerConversions: { source: "PartnerStack dashboard", asOf: "2026-10-19", conversions: 0, approvedCommissions: 0 } });
    expect(supplied.partnerConversions).toMatchObject({ conversions: 0 });
  });

  it("orders rows by qualified sessions, then probable, then landing page", () => {
    const events = [pageView("a", "/b", "direct"), pageView("c", "/a", "direct"), pageView("d", "/a", "direct")];
    const report = buildFunnelByLanding({ events, classifications: [cls("a", "CONFIRMED_CLEAN"), cls("c", "CONFIRMED_CLEAN"), cls("d", "CONFIRMED_CLEAN")] });
    expect(report.rows.map((r) => r.landingPath)).toEqual(["/a", "/b"]);
  });
});
