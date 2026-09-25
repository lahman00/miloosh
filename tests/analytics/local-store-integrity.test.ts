import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { getAllFirstPartyEvents, recordFirstPartyEvent } from "@/lib/analytics/events";

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
