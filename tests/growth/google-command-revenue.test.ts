import { describe, expect, it } from "vitest";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { organicMoneyFunnel } from "@/lib/google-war/money-funnel";
import { auditRenderedCtas } from "@/lib/google-war/cta-audit";
import { ingestOffsite, outreachUrl, reconcileReportedOffsite } from "@/lib/google-war/offsite";
const url = "https://vendor.example/?partner=verified";
const merchants = [{ slug: "example", active: true, homepage: "https://vendor.example/", ctaUrls: [url] }];
const anchor = (extra = "", href = url) => `<p>We may earn an affiliate commission.</p><a href="${href}" data-miloosh-link="commercial" data-software-slug="example" data-cta-location="software-page-cta" rel="sponsored noopener noreferrer" ${extra}>Try Example</a>`;
describe("Rendered CTA contract, no merchant requests", () => {
  it("valid commercial link", () => expect(auditRenderedCtas(anchor(), merchants)).toMatchObject({ checked: 1, findings: [], requestsToMerchants: 0 }));
  it("detects wrong merchant", () => expect(auditRenderedCtas(anchor("", "https://wrong.example/"), merchants).findings[0].code).toBe("WRONG_COMMERCIAL_DESTINATION"));
  it("detects missing sponsored", () => expect(auditRenderedCtas(anchor().replace("sponsored ", ""), merchants).findings.some(f => f.code === "MISSING_SPONSORED")).toBe(true));
  it("detects no disclosure", () => expect(auditRenderedCtas(anchor().replace(/<p>.*?<\/p>/, ""), merchants).findings.some(f => f.code === "MISSING_DISCLOSURE")).toBe(true));
  it("detects untracked affiliate", () => expect(auditRenderedCtas(anchor().replace('data-miloosh-link="commercial"', ""), merchants).findings.some(f => f.code === "AFFILIATE_BYPASSES_CANONICAL_TRACKER")).toBe(true));
  it("editorial source links are not required to be affiliate", () => expect(auditRenderedCtas('<a href="https://vendor.example/docs">Read documentation</a>', merchants).findings).toEqual([]));
  it("a raw source URL containing buy or try is not a commercial CTA", () => expect(auditRenderedCtas('<a href="https://vendor.example/buy-online/">https://vendor.example/buy-online/</a>', merchants).findings).toEqual([]));
  it("nonactive sponsored is blocked", () => expect(auditRenderedCtas(anchor(), [{ ...merchants[0], active: false }]).findings.some(f => f.code === "NONACTIVE_SPONSORED")).toBe(true));
});
const first = "2026-09-26T10:00:00Z", last = "2026-09-27T00:00:00Z", page = "/software/example";
const base = { visitorId: "visitor_command_fixture_1", sessionId: "session_command_fixture_1", path: page, timestamp: first, isTest: false };
const events: FirstPartyEvent[] = [
  { ...base, type: "page_view", trafficSource: "organic_search", referrerHost: "www.google.com" },
  { ...base, timestamp: "2026-09-26T10:00:15Z", type: "engaged_view", durationSeconds: 15 },
  { ...base, timestamp: "2026-09-26T10:00:16Z", type: "cta_impression", softwareSlug: "example", ctaLocation: "software-page-cta" },
  { ...base, timestamp: "2026-09-26T10:00:18Z", type: "cta_click", softwareSlug: "example", ctaLocation: "software-page-cta" },
  { ...base, timestamp: "2026-09-26T10:00:19Z", type: "outbound_click", softwareSlug: "example", ctaLocation: "software-page-cta", destination: "affiliate", url },
];
describe("Organic money funnel (recorded attempts only)", () => {
  it("same session, path, merchant and CTA progresses", () => expect(organicMoneyFunnel(events, first, last)).toMatchObject({ eligibleOrganicSessions: 1, rows: [{ classifiedOrganicVisits: 1, decisionEngagement: 1, ctaExposureAfterEngagement: 1, exposedCtaClicks: 1, recordedMerchantHandoffs: 1 }], merchantArrivals: null, affiliateConversions: null }));
  it("QA in later history invalidates earlier organic events", () => expect(organicMoneyFunnel([...events, { ...base, timestamp: last, type: "page_view", isTest: true }], first, last).eligibleOrganicSessions).toBe(0));
  it("no exposure cannot be imputed from a click", () => expect(organicMoneyFunnel(events.filter(e => e.type !== "cta_impression"), first, last).rows[0].recordedMerchantHandoffs).toBe(0));
  it("an actual handoff remains visible even if exposure telemetry is missing", () => expect(organicMoneyFunnel(events.filter(e => e.type !== "cta_impression"), first, last).rows[0]).toMatchObject({ recordedMerchantHandoffs: 0, observedMerchantHandoffSessions: 1, handoffsWithoutCompleteSequence: 1 }));
  it("another CTA placement cannot complete the funnel", () => expect(organicMoneyFunnel(events.map(e => e.type === "outbound_click" ? { ...e, ctaLocation: "pricing-section-cta" } : e), first, last).rows[0].recordedMerchantHandoffs).toBe(0));
  it("separate sessions cannot stitch an exposed click to handoff", () => expect(organicMoneyFunnel(events.map(e => e.type === "outbound_click" ? { ...e, sessionId: "another_session" } : e), first, last).rows[0].recordedMerchantHandoffs).toBe(0));
  it("duplicate attempts do not inflate unique session counts", () => expect(organicMoneyFunnel([...events, events[4]], first, last).rows[0].recordedMerchantHandoffs).toBe(1));
  it("referrals remain separate from organic and Google causality", () => {
    const r = organicMoneyFunnel(events.map(e => e.type === "page_view" ? { ...e, trafficSource: "referral", utmSource: "publisher", utmMedium: "referral", utmCampaign: "evidence" } : e), first, last);
    expect(r.eligibleOrganicSessions).toBe(0); expect(r.referralCampaigns[0].classifiedSessions).toBe(1);
  });
});
describe("Off-site evidence ingestion", () => {
  const signal = { id: "fixture", sourceUrl: "https://publisher.example/article", targetUrl: "https://miloosh.com/", kind: "DIRECTORY", status: "VERIFIED_LIVE", verifiedOn: "2026-09-26", evidence: "Public page fetched with link", publicLinkObserved: true, rel: "nofollow", campaign: null };
  it("accepts verified public evidence", () => expect(ingestOffsite([signal])).toHaveLength(1));
  it("email receipt cannot count as public placement", () => expect(() => ingestOffsite([{ ...signal, kind: "OUTREACH" }])).toThrow());
  it("removed Reddit cannot count as live", () => expect(() => ingestOffsite([{ ...signal, removed: true }])).toThrow());
  it("unverified link cannot count as live", () => expect(() => ingestOffsite([{ ...signal, publicLinkObserved: false }])).toThrow());
  it("rejects duplicated identifiers", () => expect(() => ingestOffsite([signal, signal])).toThrow());
  it("UTMs apply only to our own canonical landing", () => {
    expect(outreachUrl("https://miloosh.com/software/example", "publisher", "wave_2")).toContain("utm_medium=referral");
    expect(() => outreachUrl(url, "publisher", "wave_2")).toThrow();
  });
  it("an action ledger cannot promote its own EXECUTED_LIVE claim", () => {
    const r = reconcileReportedOffsite([{ target: "Reddit", type: "reply", status: "EXECUTED_LIVE", verified_live_url: "https://www.reddit.com/r/a/comments/example/", evidence: "thread is OPENED" }], []);
    expect(r[0]).toMatchObject({ effectiveStatus: "REPORTED_UNVERIFIED", conflict: true });
  });
  it("independent removal evidence survives a later reported live claim", () => {
    const known = ingestOffsite([{ ...signal, status: "REPORTED_UNVERIFIED", removed: true, publicLinkObserved: false }]);
    expect(reconcileReportedOffsite([{ target: "claim", type: "reply", status: "EXECUTED_LIVE", verified_live_url: signal.sourceUrl, evidence: "opened" }], known)[0].effectiveStatus).toBe("REPORTED_UNVERIFIED");
  });
});
