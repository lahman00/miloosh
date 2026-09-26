import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";

/**
 * MILOOSH INDEXATION RECOVERY ATTACK (2026-09-26) -- real finding: 176 of
 * 354 catalog products have sourced cons[] data that never rendered
 * anywhere on their own /software/[slug] page (only on a comparison page
 * that includes them, and only if one exists). The five first-revenue
 * cohort pages already show their own cons via FirstRevenueSoftwarePanel's
 * "Watch before buying" block, so the general page template must render
 * this section for everyone else without duplicating it for the cohort.
 */
describe("software page renders sourced cons for non-cohort products", () => {
  const source = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");

  it("gates the Watch before buying block on real cons and excludes the first-revenue cohort", () => {
    expect(source).toContain("software.cons?.length && !getFirstRevenuePage(software.slug)");
    expect(source).toContain("Watch before buying");
  });

  it("has real cons data on at least one product outside the first-revenue cohort", () => {
    const withCons = getAllSoftware().filter((s) => s.cons?.length && !getFirstRevenuePage(s.slug));
    expect(withCons.length).toBeGreaterThan(100);
  });

  it("every first-revenue cohort product with cons would otherwise duplicate FirstRevenueSoftwarePanel's own Watch-before-buying block", () => {
    // Documents exactly why the guard exists -- these products DO have real
    // cons, so without the !getFirstRevenuePage guard they'd render twice.
    const cohortWithCons = ["airtable", "todoist", "close", "setmore", "elevenlabs"].filter(
      (slug) => getFirstRevenuePage(slug) && (getSoftware(slug)?.cons?.length ?? 0) > 0
    );
    expect(cohortWithCons.length).toBeGreaterThan(0);
  });
});
