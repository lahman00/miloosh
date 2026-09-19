import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { readRecommendationEventsDetailed } from "@/lib/recommend/events";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("legacy data is never a fabricated production zero", () => {
  it("declares the file-only log unavailable on Vercel without attempting a read", () => {
    vi.stubEnv("VERCEL", "1");
    const read = vi.spyOn(fs, "readFileSync");
    expect(readRecommendationEventsDetailed().status).toBe("unavailable");
    expect(read).not.toHaveBeenCalled();
  });
  it("missing and malformed local data stay unknown; a readable empty array is zero", () => {
    vi.stubEnv("VERCEL", "");
    const read = vi.spyOn(fs, "readFileSync").mockImplementation(() => { throw Error("missing"); });
    expect(readRecommendationEventsDetailed().status).toBe("unavailable");
    read.mockReturnValue("{}");
    expect(readRecommendationEventsDetailed().status).toBe("unavailable");
    read.mockReturnValue("[]");
    expect(readRecommendationEventsDetailed()).toMatchObject({ status: "available", events: [] });
  });
  it.each([
    ["verified-active-cta-coverage", "CTA COVERAGE"],
    ["money-priority-report", "MONEY PRIORITY"],
    ["post-acquisition-report", "POST ACQUISITION"],
  ])("%s exits unknown without production authorization", (script, label) => {
    const env = { ...process.env }; delete env.BLOB_READ_WRITE_TOKEN;
    try {
      execFileSync(process.execPath, ["--import", "tsx", `scripts/growth/${script}.ts`], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      throw Error("must reject unavailable evidence");
    } catch (error) {
      expect(String((error as { stderr?: string }).stderr)).toContain(`${label} = UNKNOWN`);
    }
  });
});
