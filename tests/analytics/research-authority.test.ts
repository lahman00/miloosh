import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { researchLinkEvent, validResearchEvent } from "@/lib/analytics/research";
import { authorityReferrals } from "@/lib/authority/referrals";
import type { FirstPartyEvent } from "@/lib/analytics/events";
const persist = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/lib/analytics/events", () => ({ recordFirstPartyEvent: persist }));
import { POST } from "@/app/api/analytics/event/route";

const research = "/research/saas-pricing-pressure-index-2026";
const base = { visitorId: "v_research", sessionId: "s_research", path: research, isTest: false };
const event = (type: string, seconds: number, extra = {}) => ({ ...base, type, timestamp: new Date(Date.parse("2026-09-26T10:00:00Z") + seconds * 1000).toISOString(), ...extra }) as FirstPartyEvent;
const history = () => [
  event("page_view", 0, { trafficSource: "referral", referrerHost: "smartsme.co.uk" }),
  event("research_page_view", 1), event("engaged_view", 15, { durationSeconds: 15 }),
  event("research_to_decision_click", 20, { targetPath: "/software/pipedrive" }),
  event("page_view", 21, { path: "/software/pipedrive" }),
  event("cta_impression", 22, { path: "/software/pipedrive", softwareSlug: "pipedrive", ctaLocation: "software-page-cta" }),
  event("cta_click", 30, { path: "/software/pipedrive", softwareSlug: "pipedrive", ctaLocation: "software-page-cta" }),
  event("outbound_click", 31, { path: "/software/pipedrive", softwareSlug: "pipedrive", ctaLocation: "software-page-cta", destination: "affiliate", url: "https://example.test" }),
];
const start = "2026-09-26T00:00:00Z", end = "2026-09-27T00:00:00Z";
describe("research event contract and privacy", () => {
  beforeEach(() => persist.mockClear());
  it("distinguishes source/comparison/decision actions without transmitting queries", () => {
    expect(researchLinkEvent(research, "https://vendor.test/pricing?token=secret")).toEqual({ type: "research_source_click", path: research, sourceHost: "vendor.test" });
    expect(researchLinkEvent(research, "/software/pipedrive?email=x")).toEqual({ type: "research_to_decision_click", path: research, targetPath: "/software/pipedrive" });
    expect(researchLinkEvent(research, "/compare/pipedrive-vs-close")?.type).toBe("research_to_comparison_click");
  });
  it.each(["javascript:alert(1)", "mailto:owner@example.test", "https://secret@vendor.test", "#methodology", "/about"])("ignores unsupported destinations %s", href => expect(researchLinkEvent(research, href)).toBeNull());
  it("does not capture unrelated pages", () => expect(researchLinkEvent("/software/pipedrive", "/compare/pipedrive-vs-close")).toBeNull());
  it.each([
    { type: "research_source_click", path: research, sourceHost: "https://vendor.test/?token=secret" },
    { type: "research_source_click", path: research, sourceHost: "miloosh.com" },
    { type: "research_to_decision_click", path: research, targetPath: "//evil.test" },
    { type: "research_to_decision_click", path: research, targetPath: "/about" },
    { type: "research_to_comparison_click", path: research, targetPath: "/software/pipedrive" },
  ])("server validation refuses unsafe/mislabeled events", data => expect(validResearchEvent(data)).toBe(false));
  it.each(["research_page_view", "research_source_click", "research_to_decision_click", "research_to_comparison_click"])("stores %s through existing ingress with bounded fields", async type => {
    const response = await POST(new NextRequest("https://miloosh.com/api/analytics/event", { method: "POST", headers: { origin: "https://miloosh.com", "user-agent": "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36", "content-type": "application/json" }, body: JSON.stringify({ ...base, type, sourceHost: "vendor.test", targetPath: type === "research_to_comparison_click" ? "/compare/pipedrive-vs-close" : "/software/pipedrive", email: "do-not-store", authorization: "do-not-store" }) }));
    expect(response.status).toBe(200); expect((await response.json()).recorded).toBe(true);
    expect(persist).toHaveBeenCalledOnce(); expect(persist.mock.calls[0][0]).not.toHaveProperty("email"); expect(persist.mock.calls[0][0]).not.toHaveProperty("authorization");
  });
  it("rejects a forged research-page view on unrelated path", async () => {
    const response = await POST(new NextRequest("https://miloosh.com/api/analytics/event", { method: "POST", headers: { "user-agent": "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36" }, body: JSON.stringify({ ...base, type: "research_page_view", path: "/about" }) }));
    expect(response.status).toBe(400); expect(persist).not.toHaveBeenCalled();
  });
});
describe("read-only authority/research funnel", () => {
  it("joins only observed research → decision → matching CTA → handoff", () => {
    const r = authorityReferrals(history(), start, end);
    expect(r.rows[0]).toMatchObject({ source: "smartsme.co.uk", sessions: 1, researchVisits: 1, researchToDecision: 1, completeResearchHandoffs: 1, handoff: 1 });
    expect(r.conversions).toBeNull();
  });
  it("keeps observed raw handoff when click/navigation evidence is absent", () => {
    const r = authorityReferrals(history().filter(e => e.type !== "research_to_decision_click"), start, end);
    expect(r.rows[0]).toMatchObject({ handoff: 1, completeResearchHandoffs: 0 });
  });
  it("does not join different CTA locations", () => {
    const h = history(); h[h.length - 1] = { ...h.at(-1)!, ctaLocation: "pricing-section-cta" } as FirstPartyEvent;
    expect(authorityReferrals(h, start, end).rows[0].completeResearchHandoffs).toBe(0);
  });
  it("never joins across sessions", () => {
    const h = history(); h[h.length - 1] = { ...h.at(-1)!, sessionId: "s_other" };
    expect(authorityReferrals(h, start, end).rows[0].completeResearchHandoffs).toBe(0);
  });
  it("applies QA classification before period filtering", () => {
    const h = [...history(), { ...event("page_view", 60), timestamp: "2026-09-28T10:00:00Z", isTest: true }];
    expect(authorityReferrals(h, start, end).rows).toEqual([]);
  });
  it("records all research acquisition modes separately from referrals", () => {
    const h = history(); h[0] = { ...h[0], trafficSource: "organic_search", referrerHost: "google.com" } as FirstPartyEvent;
    expect(authorityReferrals(h, start, end).rows).toEqual([]);
    expect(authorityReferrals(h, start, end, "research").rows[0].completeResearchHandoffs).toBe(1);
  });
  it("counts sessions rather than repeated event payloads", () => {
    const h = history(); expect(authorityReferrals([...h, ...h], start, end).rows[0].sessions).toBe(1);
  });
  it("has exclusive end and rejects invalid windows", () => {
    expect(authorityReferrals(history(), "2026-09-25T00:00:00Z", start).rows).toEqual([]);
    expect(() => authorityReferrals([], end, start)).toThrow();
  });
});
