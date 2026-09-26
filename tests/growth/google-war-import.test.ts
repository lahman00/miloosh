import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("imports a dated evidence directory without replacing the seed or previous imports", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "miloosh-gsc-import-test-"),
  );
  try {
    const page = path.join(root, "pages.json"),
      inspection = path.join(root, "inspections.json"),
      out = path.join(root, "normalized");
    fs.writeFileSync(
      page,
      JSON.stringify({
        capturedAt: "2026-09-26T00:00:00Z",
        rows: [["https://miloosh.com/software/example", "0", "3", "0%", "25"]],
      }),
    );
    fs.writeFileSync(inspection, "[]");
    const args = [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/growth/import-google-war-evidence.ts",
      page,
      inspection,
      "2026-09-01",
      "2026-09-20",
      out,
    ];
    execFileSync(process.execPath, args, { stdio: "pipe" });
    const original = fs.readFileSync(
      path.join(out, "search-snapshot.json"),
      "utf8",
    );
    expect(JSON.parse(original).rows[0]).toMatchObject({
      impressions: 3,
      clicks: 0,
    });
    expect(() =>
      execFileSync(process.execPath, args, { stdio: "pipe" }),
    ).toThrow();
    expect(
      fs.readFileSync(path.join(out, "search-snapshot.json"), "utf8"),
    ).toBe(original);
    expect(
      JSON.parse(
        fs.readFileSync("data/growth/google-war/search-snapshot.json", "utf8"),
      ).rows,
    ).toHaveLength(537);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
