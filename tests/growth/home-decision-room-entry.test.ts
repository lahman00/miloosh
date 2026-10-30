import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homepage = readFileSync("app/page.tsx", "utf8");
const tracker = readFileSync("components/TrackedInternalCtaLink.tsx", "utf8");

describe("homepage discovery of the Decision Room", () => {
  it("keeps BuyerDesk and the existing matcher CTA available", () => {
    expect(homepage).toContain("<BuyerDesk products={getBuyerDeskProducts()}");
    expect(homepage).toContain('<Link href="/recommend" className="design-button">Find my software');
  });
  it("adds one contextual, tracked entry to the existing decision step", () => {
    const match = homepage.match(/href="\/decision-room"/g) ?? [];
    expect(match).toHaveLength(1);
    expect(homepage).toContain('sourcePath="/"');
    expect(homepage).toContain('targetPath="/decision-room"');
    expect(homepage).toContain('ctaName="homepage-decision-room"');
    expect(homepage).toContain('Already comparing? Open Decision Room');
    expect(tracker).toContain('type: "internal_cta_click"');
  });
  it("reuses the existing accessible home design and leaves index control on the room", () => {
    expect(homepage).toContain('className="text-action focus-visible:outline-2 focus-visible:outline-offset-4"');
    expect(readFileSync("app/globals.css", "utf8")).toMatch(/\.text-action\s*\{[^}]*min-height:44px/);
    expect(readFileSync("app/decision-room/page.tsx", "utf8")).toContain("index: false");
    expect(readFileSync("app/decision-room/switching-lab/page.tsx", "utf8")).toContain("index: false");
  });
});
