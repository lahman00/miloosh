import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const sinks = vi.hoisted(() => ({ first: vi.fn(), cta: vi.fn(), vendor: vi.fn() }));
vi.mock("@/lib/analytics/events", () => ({ recordFirstPartyEvent: sinks.first }));
vi.mock("@/lib/revenue/click-tracker", () => ({ trackSoftwareCtaClick: sinks.cta, trackVendorLinkClick: sinks.vendor }));
import { POST, __test__ } from "@/app/api/outbound-click/route";
import { POST as analyticsPost } from "@/app/api/analytics/event/route";
const human = "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36";
function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://miloosh.com/api/outbound-click", { method: "POST", headers: { "content-type": "application/json", "user-agent": human, ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); sinks.first.mockResolvedValue(true); });
describe("canonical outbound boundary", () => {
  it.each<Record<string, string>>([{ "user-agent": "Googlebot/2.1" }, { "x-vercel-cron": "1" }, { purpose: "prefetch" }])("does not store bot/infra traffic: %j", async headers => {
    expect((await POST(req({ slug: "jotform" }, headers))).status).toBe(202);
    expect(sinks.first).not.toHaveBeenCalled(); expect(sinks.cta).not.toHaveBeenCalled(); expect(sinks.vendor).not.toHaveBeenCalled();
  });
  it("pricing CTA records the displayed vendor-issued pricing asset in both sinks", async () => {
    expect((await POST(req({ slug: "jotform", ctaLocation: "pricing-section-cta", url: "https://evil.invalid" }))).status).toBe(202);
    expect(sinks.first).toHaveBeenCalledWith(expect.objectContaining({ url: "https://www.jotform.com/pricing/?partner=miloosh", destination: "affiliate", isTest: undefined }));
    expect(sinks.cta.mock.calls[0][1]).toBe("https://www.jotform.com/pricing/?partner=miloosh");
    expect(sinks.cta.mock.calls[0][4]).toBeUndefined();
  });
  it("buyer-checklist is a bounded recognized placement", () => {
    expect(__test__.normalizeCtaLocation("buyer-checklist-cta")).toBe("buyer-checklist-cta");
    expect(__test__.normalizeCtaLocation("free-text-secret")).toBe("unknown-cta-location");
  });
  it.each([null, [], "bad"])("invalid shape is 400 rather than a server exception", async body => {
    expect((await POST(req(body))).status).toBe(400);
  });
});
describe("analytics privacy boundary", () => {
  it("drops arbitrary fields and query strings without rewriting unknown to false", async () => {
    const result = await analyticsPost(req({ type: "page_view", visitorId: "v_a", sessionId: "s_a", path: "/recommend?email=private@example.invalid#token", email: "private@example.invalid", authorization: "do-not-store" }));
    expect(result.status).toBe(200);
    const event = sinks.first.mock.calls[0][0];
    expect(event.path).toBe("/recommend"); expect(event.isTest).toBeUndefined();
    expect(event).not.toHaveProperty("email"); expect(event).not.toHaveProperty("authorization");
  });
  it("cannot forge an affiliate outbound by bypassing the commercial resolver", async () => {
    expect((await analyticsPost(req({ type: "outbound_click", visitorId: "v_a", sessionId: "s_a", path: "/", destination: "affiliate", url: "https://evil.invalid" }))).status).toBe(400);
    expect(sinks.first).not.toHaveBeenCalled();
  });
  it.each([null, [], "bad"])("invalid JSON shape is rejected safely", async body => {
    expect((await analyticsPost(req(body))).status).toBe(400);
  });
});
