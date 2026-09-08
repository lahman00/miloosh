import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Smart SME independent coverage reference", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/research/saas-pricing-pressure-index-2026/page.tsx"),
    "utf8"
  );

  it("links the verified Smart SME coverage from the research page", () => {
    expect(source).toContain(
      "https://smartsme.co.uk/what-business-software-really-costs-in-2026-188-vendor-price-lists-checked/"
    );
    expect(source).toContain("Independent coverage");
  });

  it("does not label the editorial coverage link as sponsored or nofollow", () => {
    expect(source).toContain('rel="noopener noreferrer"');
    expect(source).not.toContain('rel="nofollow sponsored"');
  });
});
