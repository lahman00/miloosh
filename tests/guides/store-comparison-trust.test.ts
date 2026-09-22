import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { TREATMENT_COHORT } from "@/data/experiments/comparison-quality-cohort";

describe("store comparison trust guard", () => {
  it("suppresses string-derived capability differences for ecommerce comparisons", () => {
    const page = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(page).toContain('const isStoreComparison = softwareA.category === "ecommerce" || softwareB.category === "ecommerce"');
    expect(page).toContain("unmatched wording is not proof that the other platform lacks a capability");
    expect(page.indexOf("isStoreComparison ? (")).toBeLessThan(page.indexOf("data.keyDifferences.length > 0"));
  });

  it("does not alter the pair-aware experiment because its treatment cohort contains no ecommerce product", () => {
    for (const slug of TREATMENT_COHORT) {
      const [a, b] = slug.split("-vs-");
      expect(getSoftware(a)?.category).not.toBe("ecommerce");
      expect(getSoftware(b)?.category).not.toBe("ecommerce");
    }
  }, 15_000);
});
