import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { CATALOG_EXPANSION_COMPARISONS_2026_09 } from "@/data/comparison-waves/catalog-expansion-2026-09";

const WAVE = CATALOG_EXPANSION_COMPARISONS_2026_09;
const CROSS_CATEGORY_ALLOWED = new Set([
  "paypal-payments:stripe",
  "fathom:otter-ai",
  "five9:ringcentral",
  "genesys-cloud-cx:ringcentral",
  "ringcentral:talkdesk",
  "cursor:github-copilot",
  "github-copilot:replit",
  "github-copilot:windsurf",
  "docusign:pandadoc",
]);

function key(a: string, b: string) {
  return `${a}:${b}`;
}

describe("2026-09 curated 100-company comparison wave", () => {
  it("stays inside the deliberate 90–130 page target rather than becoming a pairwise factory", () => {
    expect(WAVE.length).toBe(122);
    expect(WAVE.length).toBeGreaterThanOrEqual(90);
    expect(WAVE.length).toBeLessThanOrEqual(130);
  });
  it("contains only unique pairs with no reverse collisions and every product resolves", () => {
    const seen = new Set<string>();
    for (const [a, b] of WAVE) {
      const forward = key(a, b);
      const reverse = key(b, a);
      expect(seen.has(forward)).toBe(false);
      expect(seen.has(reverse)).toBe(false);
      seen.add(forward);
      expect(a).not.toBe(b);
      expect(getSoftware(a), a).toBeDefined();
      expect(getSoftware(b), b).toBeDefined();
    }
  });

  it("publishes every curated wave pair through the canonical comparison registry", () => {
    const published = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => key(a, b)));
    for (const [a, b] of WAVE) expect(published.has(key(a, b)), `${a} vs ${b}`).toBe(true);
  });

  it("requires every pair to be a real alternative edge from at least one sourced product profile", () => {
    for (const [a, b] of WAVE) {
      const left = getSoftware(a)!;
      const right = getSoftware(b)!;
      const declared = left.alternatives?.some((alt) => alt.slug === b) || right.alternatives?.some((alt) => alt.slug === a);
      expect(declared, `${a} vs ${b} lacks a profile-level alternative edge`).toBe(true);
      expect(left.sources.length).toBeGreaterThan(0);
      expect(right.sources.length).toBeGreaterThan(0);
      expect(left.features.length).toBeGreaterThanOrEqual(3);
      expect(right.features.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("limits cross-category pages to nine explicitly reviewed buyer-job overlaps", () => {
    const cross: string[] = [];
    for (const [a, b] of WAVE) {
      const left = getSoftware(a)!;
      const right = getSoftware(b)!;
      if (left.category !== right.category) cross.push(key(a, b));
    }
    expect(cross.sort()).toEqual([...CROSS_CATEGORY_ALLOWED].sort());
  });

  it("keeps comparison-wave data free of affiliate/commercial steering", () => {
    const source = readFileSync(
      join(process.cwd(), "data", "comparison-waves", "catalog-expansion-2026-09.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/affiliate|commission|payout|partner/i);
  });

  it("does not introduce duplicate or reverse collisions in the complete published registry", () => {
    const seen = new Set<string>();
    for (const [a, b] of PUBLISHED_COMPARISONS) {
      expect(seen.has(key(a, b))).toBe(false);
      expect(seen.has(key(b, a))).toBe(false);
      seen.add(key(a, b));
    }
  });
});
