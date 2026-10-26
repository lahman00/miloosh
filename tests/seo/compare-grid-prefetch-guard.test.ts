import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";

const source = readFileSync(path.join(process.cwd(), "components", "CompareGrid.tsx"), "utf8");

describe("comparison directory speculative-prefetch control", () => {
  it("keeps ordinary crawlable comparison card links", () => {
    expect(source).toContain('href={');
    expect(source).toContain('getComparisonSlug(item.slugA, item.slugB)');
    expect(source).toContain('<Link');
  });
  it("disables prefetch for comparison directory cards without reducing visible card count", () => {
    const region = source.slice(source.indexOf("filtered.slice(0, visibleCount).map"));
    expect(region).toContain("prefetch={false}");
    expect(region.indexOf("prefetch={false}")).toBeLessThan(region.indexOf("<Card"));
    expect(source).toContain("const INITIAL_VISIBLE = 72");
    expect(source).toContain("const LOAD_MORE_STEP = 72");
  });
  it("does not change published destinations or deliberately hide them from search", () => {
    expect(PUBLISHED_COMPARISONS.length).toBeGreaterThan(1000);
    const slugs = PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(source).not.toContain('rel="nofollow"');
    expect(source).not.toContain("noindex");
  });
});
