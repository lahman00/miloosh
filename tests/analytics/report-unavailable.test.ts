import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("analytics report unavailable production store", () => {
  it("fails closed instead of printing zero live funnel metrics without Blob access", () => {
    const env = { ...process.env };
    delete env.BLOB_READ_WRITE_TOKEN;

    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/analytics/report.ts"],
      { cwd: process.cwd(), env, encoding: "utf8" },
    );

    expect(output).toContain("FIRST-PARTY LIVE DATA: UNAVAILABLE");
    expect(output).toContain("UNKNOWN — not zero");
    expect(output).not.toContain("Unique Visitors:");
    expect(output).not.toContain("CANONICAL HUMAN FUNNEL:");
  });
});
