import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonsInvolving } from "@/data/comparisons";
import { getSoftwareByCategory } from "@/lib/related";

describe("internal discovery paths after hub progressive rendering", () => {
  it("keeps every software page discoverable from its category page", () => {
    for (const software of getAllSoftware()) {
      const categorySlugs = new Set(getSoftwareByCategory(software.category).map((item) => item.slug));
      expect(categorySlugs.has(software.slug), software.slug).toBe(true);
    }
  });

  it("keeps every published comparison discoverable from both software pages", () => {
    for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
      const aPairs = getComparisonsInvolving(slugA);
      const bPairs = getComparisonsInvolving(slugB);
      const samePair = ([a, b]: readonly [string, string]) =>
        (a === slugA && b === slugB) || (a === slugB && b === slugA);
      expect(aPairs.some(samePair), `${slugA} -> ${slugB}`).toBe(true);
      expect(bPairs.some(samePair), `${slugB} -> ${slugA}`).toBe(true);
    }
  });
});
