import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { isPublishedComparison } from "@/data/comparisons";

describe("Semrush alternatives coverage", () => {
  it("surfaces the social-management route already defined by the decision guide", () => {
    const semrush = getSoftware("semrush")!;
    const slugs = semrush.alternatives?.map((alternative) => alternative.slug) ?? [];

    expect(slugs).toContain("sprout-social");
    expect(ALTERNATIVE_GUIDES.semrush.decisions.some((decision) => decision.alternativeSlug === "sprout-social")).toBe(true);
    expect(isPublishedComparison("semrush", "sprout-social")).toBe(true);
    expect(semrush.sources).toContain("https://sproutsocial.com");
  });
});
