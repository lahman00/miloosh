import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { getAllRoleGuides, getRoleGuidesForSoftware } from "@/data/guides/registry";

describe("decision-guide crawl discovery", () => {
  it("every published guide is reachable through at least one related software page", () => {
    const reachable = new Set<string>();
    for (const software of getAllSoftware()) {
      for (const guide of getRoleGuidesForSoftware(software.slug)) {
        reachable.add(guide.slug);
      }
    }

    const guides = getAllRoleGuides();
    expect(reachable.size).toBe(guides.length);
    for (const guide of guides) expect(reachable.has(guide.slug), guide.slug).toBe(true);
  });

  it("keeps contextual guide blocks compact enough for software pages", () => {
    const counts = getAllSoftware().map((software) => getRoleGuidesForSoftware(software.slug).length);
    expect(Math.max(...counts)).toBeLessThanOrEqual(6);
  });
});
