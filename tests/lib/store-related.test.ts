import { describe, expect, it } from "vitest";
import { getAllSoftware, getSoftware, type Software } from "@/data/software";
import { getRelatedSoftware } from "@/lib/related";
import { getComparisonRelatedSoftware, getStoreRelatedSoftware, selectStoreRelatedSoftware } from "@/lib/store-related";
import { parseComparisonSlug } from "@/lib/comparison";
import { CONTROL_COHORT, TREATMENT_COHORT } from "@/data/experiments/comparison-quality-cohort";
const make = (slug: string, category = "ecommerce", alternatives: string[] = []) => ({
  slug, category, alternatives: alternatives.map(slug => ({ slug })),
}) as Software;
const slugs = (items: Software[]) => items.map(item => item.slug);

describe("קשורים בחנות: רלוונטיות ללא העדפת שותפים", () => {
  it("does not pad store links with project and chat tools", () => {
    const source = make("shopify");
    const catalog = [make("notion", "productivity"), make("slack", "communication"), source, make("ecwid"), make("wix", "cms")];
    expect(slugs(selectStoreRelatedSoftware([source], catalog))).toEqual(["ecwid", "wix"]);
  });
  it("excludes both compared products and keeps relevant direct alternatives", () => {
    const a = make("shopify", "ecommerce", ["ecwid"]), b = make("woocommerce");
    expect(slugs(selectStoreRelatedSoftware([a, b], [a, b, make("aaa"), make("ecwid")], 1))).toEqual(["ecwid"]);
  });
  it("can avoid duplicating alternatives already shown on a product page", () => {
    const a = make("shopify", "ecommerce", ["ecwid"]);
    expect(slugs(selectStoreRelatedSoftware([a], [a, make("ecwid"), make("wix", "cms")], 3, true))).toEqual(["wix"]);
  });
  it("keeps order stable across source and catalog order", () => {
    const a = make("shopify", "ecommerce", ["ecwid"]), b = make("woocommerce"), c = make("ecwid");
    const catalog = [make("wix", "cms"), c, a, b, make("bigcommerce")];
    expect(slugs(selectStoreRelatedSoftware([a, b], catalog))).toEqual(slugs(selectStoreRelatedSoftware([b, a], [...catalog].reverse())));
  });
  it("ignores monetization fields", () => {
    const a = make("shopify"), catalog = [make("ecwid"), make("wix", "cms")];
    const promoted = catalog.map(item => ({ ...item, affiliateUrl: "https://example.invalid/", affiliateStatus: "active" }));
    expect(slugs(selectStoreRelatedSoftware([a], catalog))).toEqual(slugs(selectStoreRelatedSoftware([a], promoted)));
  });
  it("never substitutes unrelated items for an empty shortlist", () => {
    expect(selectStoreRelatedSoftware([make("shopify")], [make("notion", "productivity")])).toEqual([]);
  });
  it("deduplicates and honors a bounded count", () => {
    const a = make("shopify"), c = make("ecwid"), catalog = [c, c, make("wix", "cms")];
    expect(selectStoreRelatedSoftware([a], catalog, 3)).toHaveLength(2);
    for (const limit of [0, -1, NaN, Infinity]) expect(selectStoreRelatedSoftware([a], catalog, limit)).toEqual([]);
    expect(selectStoreRelatedSoftware([a], catalog, 1)).toHaveLength(1);
  });
  it("keeps generic Wix CMS comparisons on the original path", () => {
    const a = getSoftware("wix")!, b = getSoftware("wordpress")!;
    const legacy = [...getRelatedSoftware(a), ...getRelatedSoftware(b)].filter(item => ![a.slug, b.slug].includes(item.slug))
      .filter((item, index, all) => all.findIndex(other => other.slug === item.slug) === index).slice(0, 3);
    expect(slugs(getComparisonRelatedSoftware(a, b))).toEqual(slugs(legacy));
  });
  it("keeps every treatment and control comparison unchanged outside store scope", () => {
    for (const slug of [...CONTROL_COHORT, ...TREATMENT_COHORT]) {
      const pair = parseComparisonSlug(slug)!;
      const a = getSoftware(pair.slugA)!, b = getSoftware(pair.slugB)!;
      const legacy = [...getRelatedSoftware(a), ...getRelatedSoftware(b)].filter(item => ![a.slug, b.slug].includes(item.slug))
        .filter((item, index, all) => all.findIndex(other => other.slug === item.slug) === index).slice(0, 3);
      expect(slugs(getComparisonRelatedSoftware(a, b)), slug).toEqual(slugs(legacy));
    }
  });
  it("uses genuine store candidates on current merchant pages", () => {
    const a = getSoftware("shopify")!, b = getSoftware("woocommerce")!;
    const result = getComparisonRelatedSoftware(a, b);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(item => item.category === "ecommerce" || item.slug === "wix")).toBe(true);
    expect(slugs(result)).not.toEqual(expect.arrayContaining(["notion", "slack", "clickup"]));
    expect(slugs(getStoreRelatedSoftware([a], 3, true))).not.toContain("shopify");
  });
  it("does not mutate the input catalog or its objects", () => {
    const catalog = getAllSoftware(); const before = JSON.stringify(catalog);
    selectStoreRelatedSoftware([getSoftware("shopify")!], catalog);
    expect(JSON.stringify(catalog)).toBe(before);
  });
});
