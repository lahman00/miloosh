import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/analytics/events", () => ({ getAllFirstPartyEvents: vi.fn() }));
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { captureOperationsEvents } from "@/scripts/growth/capture-operations-events";

const originalArgv = process.argv;
afterEach(() => { process.argv = originalArgv; vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
describe("read-only operations capture", () => {
  it("refuses missing/redacted credentials and missing explicit read-only flag", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "REDACTED");
    process.argv = [...originalArgv, "--read-only"];
    await expect(captureOperationsEvents()).rejects.toThrow("Explicit read-only");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "fixture-not-a-credential");
    process.argv = originalArgv.filter(a => a !== "--read-only");
    await expect(captureOperationsEvents()).rejects.toThrow("Explicit read-only");
    expect(getAllFirstPartyEvents).not.toHaveBeenCalled();
  });
  it("retains prior evidence on an incomplete read, never substitutes zero", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "fixture-not-a-credential");
    process.argv = [...originalArgv, "--read-only"];
    vi.mocked(getAllFirstPartyEvents).mockRejectedValue(new Error("Incomplete"));
    const write = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    await expect(captureOperationsEvents()).rejects.toThrow("Incomplete");
    expect(write).not.toHaveBeenCalled();
  });
  it("writes only ignored local 0600 evidence and returns no raw events or credentials", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "fixture-not-a-credential");
    process.argv = [...originalArgv, "--read-only"];
    vi.mocked(getAllFirstPartyEvents).mockResolvedValue([]);
    vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
    const write = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    const rename = vi.spyOn(fs, "renameSync").mockImplementation(() => {});
    const result = await captureOperationsEvents();
    expect(result).toMatchObject({ coverage: "COMPLETE", records: 0, externalWrites: 0 });
    expect(write).toHaveBeenCalledTimes(2);
    for (const [file, , options] of write.mock.calls) {
      expect(String(file)).toMatch(/^var\/growth\/operations\/events/);
      expect(options).toEqual({ flag: "wx", mode: 0o600 });
    }
    expect(rename.mock.calls[0][1]).toBe("var/growth/operations/events.json");
    expect(JSON.stringify(result)).not.toMatch(/fixture-not-a-credential|visitorId|sessionId/);
  });
});
