import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("software page source links", () => {
  it("allows long official source URLs to wrap inside narrow mobile viewports", () => {
    const page = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");

    expect(page).toContain('className="inline-flex max-w-full items-start gap-2');
    expect(page).toContain('<span className="min-w-0 break-all">{source}</span>');
  });
});
