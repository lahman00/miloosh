import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { getAllFirstPartyEvents, recordFirstPartyEvent } from "@/lib/analytics/events";
import { recordOutboundEvent } from "@/lib/revenue/events";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("local analytics evidence integrity", () => {
  it.each(["{invalid", "{}"])("never replaces corrupt evidence (%s) with a new event", async stored => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockReturnValue(stored);
    const write = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(getAllFirstPartyEvents()).rejects.toThrow("unavailable");
    expect(await recordFirstPartyEvent({ type: "page_view", visitorId: "v_safe", sessionId: "s_safe", path: "/", timestamp: new Date().toISOString() })).toBe(false);
    expect(write).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_REVENUE_TRACKING_ENABLED", "true");
    expect(await recordOutboundEvent({ type: "affiliate_link_click", softwareSlug: "airtable", destination: "affiliate", url: "https://example.invalid" }, "/software/airtable")).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
  it("does not describe a retention-capped local array as complete history", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(Array(10000).fill({})));
    await expect(getAllFirstPartyEvents()).rejects.toThrow("retention ceiling");
  });
  it("distinguishes absent first-use storage from an unreadable store", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const read = vi.spyOn(fs, "readFileSync");
    read.mockImplementation(() => { throw Object.assign(new Error(), { code: "ENOENT" }); });
    expect(await getAllFirstPartyEvents()).toEqual([]);
    read.mockImplementation(() => { throw Object.assign(new Error(), { code: "EACCES" }); });
    await expect(getAllFirstPartyEvents()).rejects.toThrow("unavailable");
  });
});
