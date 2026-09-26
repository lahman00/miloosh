import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";

/**
 * MILOOSH INDEXATION FACTORY WAVE 2 (2026-09-26) -- sitewide bug hunt,
 * same shape as Wave 1's cons[] discovery: 152 of 354 catalog products
 * have sourced pros[] data that never rendered anywhere on their own
 * /software/[slug] page. Unlike cons, no first-revenue-cohort panel
 * touches pros at all, so no cohort-exclusion guard is needed here.
 */
describe("software page renders sourced pros", () => {
  const source = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");

  it("gates the Why buyers choose it block on real pros data", () => {
    expect(source).toContain("software.pros?.length");
    expect(source).toContain("Why buyers choose it");
  });

  it("has real pros data on more than 100 products", () => {
    const withPros = getAllSoftware().filter((s) => s.pros?.length);
    expect(withPros.length).toBeGreaterThan(100);
  });
});
