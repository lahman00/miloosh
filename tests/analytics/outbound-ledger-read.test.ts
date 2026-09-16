import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { readOutboundEventsDetailed, countOutboundLedger, formatOutboundLedger, type OutboundReadResult } from "@/lib/revenue/outbound-read";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

const mocks = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock("@vercel/blob", () => mocks);
const event = (overrides: Partial<StoredOutboundEvent> = {}): StoredOutboundEvent => ({
  type: "affiliate_link_click", softwareSlug: "wix", destination: "affiliate", url: "https://example.com/",
  sourcePage: "/software/wix", timestamp: "2026-09-16T10:00:00.000Z", isTest: false, ...overrides,
});
const blob = (value: unknown) => ({ statusCode: 200, stream: new Response(JSON.stringify(value)).body });

beforeEach(() => { vi.stubEnv("BLOB_READ_WRITE_TOKEN", "unit-test-only"); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("complete outbound store reads", () => {
  it("paginates and deduplicates object IDs, not identical independent events", async () => {
    mocks.list.mockResolvedValueOnce({ blobs: [{ pathname: "a" }], hasMore: true, cursor: "next" })
      .mockResolvedValueOnce({ blobs: [{ pathname: "a" }, { pathname: "b" }], hasMore: false });
    mocks.get.mockImplementation(async () => blob(event()));
    const result = await readOutboundEventsDetailed();
    expect(result.status).toBe("COMPLETE"); expect(result.events).toHaveLength(2);
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.list.mock.calls[1][0].cursor).toBe("next");
  });
  it("reports an empty successfully listed store as complete", async () => {
    mocks.list.mockResolvedValue({ blobs: [], hasMore: false });
    const r = await readOutboundEventsDetailed();
    expect(r.status).toBe("COMPLETE"); expect(r.events).toEqual([]);
  });
  it("does not turn denied access into an empty complete result", async () => {
    mocks.list.mockRejectedValue(new Error("test failure"));
    const r = await readOutboundEventsDetailed();
    expect(r.status).toBe("UNAVAILABLE"); expect(r.listingComplete).toBe(false);
    expect(formatOutboundLedger(r)).toContain("UNAVAILABLE, not zero");
  });
  it("marks a later pagination failure incomplete", async () => {
    mocks.list.mockResolvedValueOnce({ blobs: [{ pathname: "a" }], hasMore: true, cursor: "next" }).mockRejectedValueOnce(new Error("test"));
    expect((await readOutboundEventsDetailed()).status).toBe("PARTIAL");
  });
  it("preserves readable records when an object fails", async () => {
    mocks.list.mockResolvedValue({ blobs: [{ pathname: "a" }, { pathname: "b" }], hasMore: false });
    mocks.get.mockResolvedValueOnce(blob(event())).mockRejectedValueOnce(new Error("test"));
    const r = await readOutboundEventsDetailed();
    expect(r.status).toBe("PARTIAL"); expect(r.failedReads).toBe(1); expect(r.events).toHaveLength(1);
  });
  it("rejects invalid stored shapes", async () => {
    mocks.list.mockResolvedValue({ blobs: [{ pathname: "bad" }], hasMore: false });
    mocks.get.mockResolvedValue(blob({ ...event(), timestamp: "invalid" }));
    const r = await readOutboundEventsDetailed(); expect(r.failedReads).toBe(1); expect(r.status).toBe("PARTIAL");
  });
  it("rejects non-200 object reads", async () => {
    mocks.list.mockResolvedValue({ blobs: [{ pathname: "a" }], hasMore: false });
    mocks.get.mockResolvedValue({ statusCode: 304 });
    expect((await readOutboundEventsDetailed()).status).toBe("PARTIAL");
  });
  it("stops repeated cursors and labels the result partial", async () => {
    mocks.list.mockResolvedValue({ blobs: [{ pathname: "a" }], hasMore: true, cursor: "same" });
    mocks.get.mockImplementation(async () => blob(event()));
    const r = await readOutboundEventsDetailed(); expect(r.status).toBe("PARTIAL"); expect(mocks.list).toHaveBeenCalledTimes(2);
  });
  it("does not describe a missing local log as measured zero", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockImplementation(() => { throw new Error("missing"); });
    expect((await readOutboundEventsDetailed()).status).toBe("UNAVAILABLE");
  });
  it("reads a valid local log without a remote write", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify([event()]));
    const r = await readOutboundEventsDetailed(); expect(r.status).toBe("COMPLETE"); expect(r.backend).toBe("local");
  });
});

describe("outbound accounting, not human conversion claims", () => {
  it("separates explicit QA, explicit non-test and absent markers", () => {
    const c = countOutboundLedger([event(), event({ isTest: true }), event({ isTest: undefined })]);
    expect(c).toMatchObject({ stored: 3, test: 1, explicitNonTest: 1, unclassified: 1, affiliateNonTest: 1 });
    expect(c.stored).toBe(c.test + c.explicitNonTest + c.unclassified);
  });
  it("separates official and vendor types", () => {
    expect(countOutboundLedger([event({ type: "official_site_click" }), event({ type: "vendor_link_click" })]))
      .toMatchObject({ officialNonTest: 1, vendorNonTest: 1, affiliateNonTest: 0 });
  });
  it("uses non-overlapping start-inclusive end-exclusive date windows", () => {
    expect(countOutboundLedger([event()], "2026-09-16T00:00:00Z", "2026-09-16T10:00:00Z").stored).toBe(0);
    expect(countOutboundLedger([event()], "2026-09-16T10:00:00Z", "2026-09-17T00:00:00Z").stored).toBe(1);
  });
  it("rejects malformed reporting windows", () => {
    expect(() => countOutboundLedger([], "bad")).toThrow();
    expect(() => countOutboundLedger([], "2026-09-17", "2026-09-16")).toThrow();
  });
  it("explains that independent stores cannot be summed", () => {
    const read: OutboundReadResult = { status: "COMPLETE", backend: "blob", events: [event()], recordsListed: 1, failedReads: 0, listingComplete: true };
    const report = formatOutboundLedger(read, new Date("2026-09-16T12:00:00Z"));
    expect(report).toContain("overlap is unknown"); expect(report).toContain("TODAY UTC: stored=1");
    expect(report).toContain("YESTERDAY UTC: stored=0"); expect(report).toContain("not unique people, conversions, or revenue");
  });
});
