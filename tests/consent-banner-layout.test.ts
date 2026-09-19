import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const banner = readFileSync("components/ConsentBanner.tsx", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");

describe("cookie consent banner layout", () => {
  it("keeps consent in normal document flow below the navbar", () => {
    expect(banner).not.toContain("fixed inset-x-0 bottom-0");
    expect(banner).toContain('className="border-b border-white/10 bg-zinc-950"');
    expect(layout.indexOf("<Navbar />")).toBeLessThan(layout.indexOf("<Analytics />"));
    expect(layout.indexOf("<Analytics />")).toBeLessThan(layout.indexOf("{children}"));
  });
});
