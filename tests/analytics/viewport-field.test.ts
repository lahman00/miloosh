import fs from "node:fs";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import { POST } from "@/app/api/analytics/event/route";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { isViewportBucket, viewportBucket } from "@/lib/analytics/viewport";

const HUMAN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const post = (body: unknown) =>
  POST(new Request("https://miloosh.com/api/analytics/event", { method: "POST", headers: { "content-type": "application/json", "user-agent": HUMAN_UA }, body: JSON.stringify(body) }) as never);

describe("viewportBucket", () => {
  it("maps widths to the three site breakpoints", () => {
    expect(viewportBucket(320)).toBe("mobile");
    expect(viewportBucket(767)).toBe("mobile");
    expect(viewportBucket(768)).toBe("tablet");
    expect(viewportBucket(1023)).toBe("tablet");
    expect(viewportBucket(1024)).toBe("desktop");
    expect(viewportBucket(2560)).toBe("desktop");
  });
  it("returns nothing for values that are not a usable width, never a guess", () => {
    for (const bad of [0, -5, NaN, Infinity, "800", null, undefined]) expect(viewportBucket(bad)).toBeUndefined();
  });
  it("accepts only the three bucket names", () => {
    expect(isViewportBucket("mobile") && isViewportBucket("tablet") && isViewportBucket("desktop")).toBe(true);
    for (const bad of ["Mobile", "phone", "1024", "", null, 3]) expect(isViewportBucket(bad)).toBe(false);
  });
});

describe("POST /api/analytics/event viewport field", () => {
  const store = analyticsLocalPath("first-party-analytics.json");
  const clean = () => { try { if (fs.existsSync(store)) fs.unlinkSync(store); } catch { /* ignore */ } };
  beforeEach(clean);
  afterEach(clean);

  it("stores a valid bucket and drops anything else, without failing the event", async () => {
    expect((await post({ type: "page_view", path: "/", visitorId: "v_1", sessionId: "s_1", viewport: "mobile" })).status).toBe(200);
    expect((await post({ type: "page_view", path: "/", visitorId: "v_2", sessionId: "s_2", viewport: "1366x768; Mac" })).status).toBe(200);
    expect((await post({ type: "page_view", path: "/", visitorId: "v_3", sessionId: "s_3" })).status).toBe(200);
    const events = await getAllFirstPartyEvents();
    const by = (id: string) => events.find((e) => e.sessionId === id) as unknown as { viewport?: string };
    expect(by("s_1").viewport).toBe("mobile");
    expect(by("s_2").viewport).toBeUndefined();
    expect(by("s_3").viewport).toBeUndefined();
  });
});
