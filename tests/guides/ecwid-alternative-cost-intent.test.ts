import { describe, expect, it } from "vitest";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";

const guide = ALTERNATIVE_GUIDES.ecwid;

describe("Ecwid alternative cost intent", () => {
  it("answers free-alternative intent without calling self-hosting free to operate", () => {
    expect(guide).toBeDefined();
    const text = [guide!.heading, guide!.introduction, ...guide!.whySeekAlternative, ...guide!.decisions.flatMap((d) => [d.heading, d.fit])].join(" ");
    expect(text).toContain("no monthly platform subscription");
    expect(text).toContain("hosting");
    expect(text).toContain("maintenance");
    expect(text).not.toContain("zero-cost store");
  });

  it("keeps distinct managed and open-source routes on existing comparisons", () => {
    expect(guide!.decisions.map((d) => d.alternativeSlug)).toEqual(["shopify", "prestashop", "woocommerce"]);
    expect(guide!.decisions.map((d) => d.comparisonSlug)).toEqual(["ecwid-vs-shopify", "ecwid-vs-prestashop", "ecwid-vs-woocommerce"]);
  });
});
