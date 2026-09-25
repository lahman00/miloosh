import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const sink = vi.hoisted(() => ({ first: vi.fn(), legacy: vi.fn() }));
vi.mock("@/lib/analytics/events", () => ({ recordFirstPartyEvent: sink.first }));
vi.mock("@/lib/revenue/click-tracker", () => ({ trackSoftwareCtaClick: sink.legacy, trackVendorLinkClick: sink.legacy }));
import { POST as analytics } from "@/app/api/analytics/event/route";
import { POST as outbound } from "@/app/api/outbound-click/route";
import { readEventBody } from "@/lib/analytics/ingest";
const base = { type: "cta_click", path: "/software/todoist", softwareSlug: "todoist", slug: "todoist", kind: "cta", visitorId: "v_boundary", sessionId: "s_boundary", isTest: false };
const request = (body: unknown = base, headers: Record<string, string> = {}, origin = "https://miloosh.com") => new NextRequest(`${origin}/api/test`, { method: "POST", headers: { "user-agent": "Mozilla/5.0 Chrome/128 Safari/537.36", ...headers }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); sink.first.mockResolvedValue(true); sink.legacy.mockResolvedValue(true); vi.stubEnv("VERCEL_ENV", "production"); });
afterEach(() => vi.unstubAllEnvs());

describe.each([analytics, outbound])("event ingestion boundary: %s", route => {
  it.each<Record<string, string>>([{ origin: "https://evil.invalid" }, { "sec-fetch-site": "cross-site" }])("rejects explicit cross-site evidence before storage", async headers => {
    expect((await route(request(base, headers))).status).toBe(403);
    expect(sink.first).not.toHaveBeenCalled(); expect(sink.legacy).not.toHaveBeenCalled();
  });
  it("permits same-origin and privacy-stripped origin without claiming human authentication", async () => {
    expect((await route(request(base, { origin: "https://miloosh.com" }))).status).toBeLessThan(300);
    expect((await route(request())).status).toBeLessThan(300);
    expect(sink.first).toHaveBeenCalledTimes(2);
  });
  it.each(["localhost", "127.0.0.1"])("forces %s into explicit QA even if the browser claimed false", async host => {
    await route(request(base, {}, `http://${host}:3000`));
    expect(sink.first).toHaveBeenCalledWith(expect.objectContaining({ isTest: true }));
  });
  it("preview environment cannot contaminate production even on a custom hostname", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await route(request());
    expect(sink.first).toHaveBeenCalledWith(expect.objectContaining({ isTest: true }));
  });
  it("rejects unknown product and oversized/malformed payloads without a write", async () => {
    expect((await route(request({ ...base, slug: "invented", softwareSlug: "invented" }))).status).toBeGreaterThanOrEqual(400);
    expect((await route(request({ ...base, junk: "x".repeat(9000) }))).status).toBe(413);
    expect(sink.first).not.toHaveBeenCalled(); expect(sink.legacy).not.toHaveBeenCalled();
  });
  it("normalizes arbitrary CTA locations to the same bounded sentinel", async () => {
    await route(request({ ...base, ctaLocation: "free-text-unbounded" }));
    expect(sink.first).toHaveBeenCalledWith(expect.objectContaining({ ctaLocation: "unknown-cta-location" }));
  });
});

describe("bounded stream reader", () => {
  it("stops a chunked oversized body before buffering the rest", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8193)); }, cancel });
    const req = new Request("https://miloosh.com/api/test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readEventBody(req)).toEqual({ ok: false, status: 413, reason: "payload_too_large" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed JSON and invalid UTF-8 safely", async () => {
    for (const body of ["{", new Uint8Array([0xff])]) {
      expect((await readEventBody(new Request("https://miloosh.com", { method: "POST", body }))).ok).toBe(false);
    }
  });
});
