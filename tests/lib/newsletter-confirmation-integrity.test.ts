import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
const mocks = vi.hoisted(() => ({ record: vi.fn(), track: vi.fn(), classify: vi.fn() }));
vi.mock("@/lib/newsletter/leads", () => ({ recordNewsletterLead: mocks.record }));
vi.mock("@/lib/analytics/events", () => ({ recordFirstPartyEvent: mocks.track }));
vi.mock("@/lib/analytics/bot-filter", () => ({ classifyRequest: mocks.classify }));
import { POST } from "@/app/api/newsletter/subscribe/route";
function request(body: unknown) { return new NextRequest("http://localhost/api/newsletter/subscribe", { method: "POST", body: JSON.stringify(body) }); }
const valid = { email: "qa@example.com", consent: true, source: "unit-test", isTest: true };
beforeEach(() => { vi.clearAllMocks(); mocks.classify.mockReturnValue({ kind: "PASS" }); mocks.record.mockResolvedValue({}); });
afterEach(() => vi.restoreAllMocks());

describe("newsletter acknowledgement integrity", () => {
  it("returns success only after persistence", async () => {
    const r = await POST(request(valid)); expect(r.status).toBe(201); expect(await r.json()).toEqual({ subscribed: true });
    expect(mocks.record).toHaveBeenCalledOnce(); expect(mocks.track).toHaveBeenCalledOnce();
  });
  it("does not manufacture a subscription or conversion on write failure", async () => {
    mocks.record.mockRejectedValue(new Error("private provider detail"));
    const r = await POST(request(valid)); expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("private provider detail"); expect(mocks.track).not.toHaveBeenCalled();
  });
  it("continues requiring explicit opt-in", async () => {
    expect((await POST(request({ ...valid, consent: false }))).status).toBe(400); expect(mocks.record).not.toHaveBeenCalled();
  });
  it("does not store a rejected bot request", async () => {
    mocks.classify.mockReturnValue({ kind: "BOT" });
    const r = await POST(request(valid)); expect((await r.json()).subscribed).toBe(false); expect(mocks.record).not.toHaveBeenCalled();
  });
  it("rejects null and array JSON without throwing", async () => {
    expect((await POST(request(null))).status).toBe(400); expect((await POST(request([]))).status).toBe(400);
  });
  it("requires both HTTP and explicit saved status in the form", () => {
    const source = fs.readFileSync("components/newsletter/NewsletterSignupForm.tsx", "utf8");
    expect(source).toContain('result.subscribed === true'); expect(source).toContain('res.ok && subscribed');
    expect(source).toContain('Email delivery is not active yet'); expect(source).toContain('useState(false)');
  });
});
