import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { CATEGORY_BUYING_GUIDES } from "@/data/seo/category-buying-guides";

describe("category buying guides", () => {
  const allSoftware = getAllSoftware();

  it("covers exactly the analytics and security categories", () => {
    expect(Object.keys(CATEGORY_BUYING_GUIDES).sort()).toEqual(["analytics", "security"]);
  });

  for (const [categorySlug, guide] of Object.entries(CATEGORY_BUYING_GUIDES)) {
    it(`${categorySlug}: every real category member is covered exactly once, with no slugs from other categories`, () => {
      const realMembers = allSoftware.filter((s) => s.category === categorySlug).map((s) => s.slug).sort();
      const coveredSlugs = guide.dimensions.flatMap((d) => d.memberSlugs);

      // No duplicates across dimensions.
      expect(new Set(coveredSlugs).size).toBe(coveredSlugs.length);

      // Exact coverage: every real member appears, and nothing else does.
      expect([...coveredSlugs].sort()).toEqual(realMembers);
    });

    it(`${categorySlug}: every dimension has a label, a real description, and at least one member`, () => {
      for (const dimension of guide.dimensions) {
        expect(dimension.label.length).toBeGreaterThan(0);
        expect(dimension.description.length).toBeGreaterThan(20);
        expect(dimension.memberSlugs.length).toBeGreaterThan(0);
      }
    });
  }
});
