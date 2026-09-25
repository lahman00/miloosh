import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn() }));
vi.mock("@vercel/blob", () => blob);
import { eventFingerprint, putAnalyticsEvent } from "@/lib/analytics/event-persistence";
import { recordFirstPartyEvent, type FirstPartyEvent } from "@/lib/analytics/events";
import { recordOutboundEvent } from "@/lib/revenue/events";
const event: FirstPartyEvent = { type: "cta_click", softwareSlug: "todoist", path: "/software/todoist", visitorId: "v_1", sessionId: "s_1", timestamp: "2026-09-25T23:59:59Z", eventId: "one-activation-id-1234", isTest: true };
beforeEach(() => { vi.stubEnv("BLOB_READ_WRITE_TOKEN", "unit-test-not-a-token"); vi.stubEnv("NEXT_PUBLIC_REVENUE_TRACKING_ENABLED", "true"); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());
describe("immutable replay-safe event persistence", () => {
  it("fingerprints exact identified payloads without server timestamp or key ordering", () => {
    expect(eventFingerprint(event)).toBe(eventFingerprint({ ...event, timestamp: "2026-09-26T00:00:01Z" }));
    expect(eventFingerprint({ ...event, eventId: undefined })).toBeUndefined();
    for (const delta of [{ eventId: "another-click-id-5678" }, { sessionId: "s_2" }, { softwareSlug: "airtable" }, { type: "outbound_click" }, { ctaLocation: "software-page-cta" }]) {
      expect(eventFingerprint({ ...event, ...delta })).not.toBe(eventFingerprint(event));
    }
  });
  it("concurrent writes and cross-midnight replay leave exactly one immutable object", async () => {
    const objects = new Map<string, string>();
    blob.put.mockImplementation(async (pathname, payload, options) => {
      expect(options).toMatchObject({ allowOverwrite: false, addRandomSuffix: false, access: "private" });
      if (objects.has(pathname)) throw Error("exists");
      objects.set(pathname, payload);
    });
    blob.get.mockImplementation(async pathname => ({ statusCode: 200, stream: new Response(objects.get(pathname)).body }));
    const results = await Promise.all([recordFirstPartyEvent(event), recordFirstPartyEvent({ ...event, timestamp: "2026-09-26T00:00:01Z" })]);
    expect(blob.get).toHaveBeenCalledTimes(1);
    expect(objects.size).toBe(1);
    const saved = JSON.parse([...objects.values()][0]);
    expect(eventFingerprint(saved)).toBe(eventFingerprint(event));
    expect(results).toEqual([true, true]);
    expect(objects.size).toBe(1);
    await recordFirstPartyEvent({ ...event, eventId: "a-new-activation-5678" });
    expect(objects.size).toBe(2);
  });
  it("an ambiguous put confirms only a matching object, never an arbitrary exception", async () => {
    blob.put.mockRejectedValue(Error("connection lost after send"));
    blob.get.mockResolvedValueOnce({ statusCode: 200, stream: new Response(JSON.stringify(event)).body });
    expect(await putAnalyticsEvent("unit/path", event)).toBe(true);
    blob.get.mockResolvedValueOnce({ statusCode: 200, stream: new Response(JSON.stringify({ ...event, softwareSlug: "airtable" })).body });
    expect(await putAnalyticsEvent("unit/path", event)).toBe(false);
    blob.get.mockResolvedValueOnce(null);
    expect(await putAnalyticsEvent("unit/path", event)).toBe(false);
    blob.get.mockRejectedValue(Error("offline"));
    expect(await putAnalyticsEvent("unit/path", event)).toBe(false);
  });
  it("legacy records without event identity remain independent, never payload-deduped", async () => {
    blob.put.mockResolvedValue({});
    const legacy = { ...event, eventId: undefined };
    await recordFirstPartyEvent(legacy); await recordFirstPartyEvent(legacy);
    expect(blob.put.mock.calls[0][0]).not.toBe(blob.put.mock.calls[1][0]);
  });
  it("both sinks report failure and never leak provider errors into logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    blob.put.mockRejectedValue(Error("sensitive-provider-details"));
    blob.get.mockRejectedValue(Error("sensitive-provider-details"));
    expect(await recordFirstPartyEvent(event)).toBe(false);
    expect(await recordOutboundEvent({ type: "affiliate_link_click", softwareSlug: "todoist", destination: "affiliate", url: "https://example.invalid", eventId: event.eventId }, event.path)).toBe(false);
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive-provider-details");
    log.mockRestore();
  });
});
