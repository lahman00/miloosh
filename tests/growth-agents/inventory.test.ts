import { describe, expect, it } from "vitest";
import { buildSiteInventory, derivedUrls, isPublishedUrl, sitemapPathsFromEntries } from "@/lib/growth-agents/inventory";
import { loadSiteInventory } from "@/lib/growth-agents/inventory-loader";
import { NOW, SHA, U, makeInventory, makeSoftware } from "./fixtures";

describe("site inventory", () => {
  it("lists the home page, product pages, comparisons, categories, guides and legal pages the code publishes", () => {
    const inventory = buildSiteInventory({
      checkoutSha: SHA,
      now: NOW,
      software: [makeSoftware("alpha"), makeSoftware("beta")],
      comparisons: [["alpha", "beta"]],
      comparisonSlug: (a, b) => `${a}-vs-${b}`,
      categories: [{ slug: "crm", name: "CRM" }],
      guideSlugs: ["best-crm-for-startups"],
      legalPaths: ["/privacy"],
      sitemapPaths: ["/", "/software/alpha"],
    });
    expect([...inventory.pages.keys()].sort()).toEqual([
      U("/"),
      U("/best-crm-for-startups"),
      U("/category/crm"),
      U("/compare/alpha-vs-beta"),
      U("/privacy"),
      U("/software/alpha"),
      U("/software/beta"),
    ]);
    expect(inventory.pages.get(U("/software/alpha"))!.inSitemap).toBe(true);
    expect(inventory.pages.get(U("/software/beta"))!.inSitemap).toBe(false);
    expect(inventory.pages.get(U("/compare/alpha-vs-beta"))!.softwareSlugs).toEqual(["alpha", "beta"]);
    expect(isPublishedUrl(inventory, U("/software/gamma"))).toBe(false);
  });

  it("skips a comparison that names a product the code does not have", () => {
    const inventory = makeInventory({ comparisons: [["alpha", "beta"], ["alpha", "ghost"]] });
    expect(inventory.comparisons.size).toBe(1);
    expect(inventory.pages.has(U("/compare/alpha-vs-ghost"))).toBe(false);
  });

  it("applies the repository's own indexing-quality gate to each product and comparison", () => {
    const thin = makeSoftware("thin", { sources: [], features: [], cons: [] });
    const inventory = makeInventory({ software: [thin, makeSoftware("alpha")], comparisons: [["thin", "alpha"]] });
    const entry = inventory.pages.get(U("/software/thin"))!;
    expect(entry.qualityGate!.ready).toBe(false);
    expect(entry.qualityGate!.reasons.length).toBeGreaterThan(0);
    // A comparison inherits the reasons of both products.
    expect(inventory.pages.get(U("/compare/thin-vs-alpha"))!.qualityGate!.ready).toBe(false);
  });

  it("derives the pages a record edit would re-render: a product feeds its comparisons, a comparison its two products", () => {
    const inventory = makeInventory();
    expect(derivedUrls(inventory, U("/software/beta"))).toEqual([U("/compare/alpha-vs-beta"), U("/compare/beta-vs-gamma"), U("/software/beta")]);
    expect(derivedUrls(inventory, U("/compare/alpha-vs-beta"))).toEqual([U("/compare/alpha-vs-beta"), U("/software/alpha"), U("/software/beta")]);
    expect(derivedUrls(inventory, U("/software/delta"))).toEqual([U("/software/delta")]);
    expect(derivedUrls(inventory, U("/category/crm"))).toEqual([U("/category/crm")]);
    expect(derivedUrls(inventory, U("/unknown"))).toEqual([U("/unknown")]);
  });

  it("turns sitemap entries into paths without the origin or a trailing slash", () => {
    expect(sitemapPathsFromEntries([{ url: "https://miloosh.com/" }, { url: "https://miloosh.com/software/alpha/" }, { url: "https://miloosh.com/compare/a-vs-b" }])).toEqual(["/", "/software/alpha", "/compare/a-vs-b"]);
  });
});

describe("the real registries (the checked-out code, no network)", () => {
  const inventory = loadSiteInventory({ checkoutSha: SHA, now: NOW });
  const kinds = (kind: string) => [...inventory.pages.values()].filter((p) => p.identity.kind === kind);

  it("publishes the home page, many products and many comparisons", () => {
    expect(inventory.pages.has(U("/"))).toBe(true);
    expect(kinds("software").length).toBeGreaterThan(100);
    expect(kinds("compare").length).toBeGreaterThan(100);
    expect(kinds("category").length).toBeGreaterThan(5);
  });

  it("gives every comparison exactly two products that exist", () => {
    for (const page of kinds("compare")) {
      expect(page.softwareSlugs, page.url).toHaveLength(2);
      for (const slug of page.softwareSlugs) expect(inventory.softwareBySlug.has(slug), `${page.url} -> ${slug}`).toBe(true);
    }
  });

  it("feeds every product page through the quality gate and lists only real pages in the sitemap map", () => {
    for (const page of kinds("software")) expect(page.qualityGate, page.url).not.toBeNull();
    for (const sitemapPath of inventory.sitemapPaths) expect(sitemapPath.startsWith("/"), sitemapPath).toBe(true);
  });

  it("agrees with the production fact that the sitemap lists far fewer pages than exist", () => {
    const inSitemap = [...inventory.pages.values()].filter((p) => p.inSitemap).length;
    expect(inSitemap).toBeGreaterThan(0);
    expect(inSitemap).toBeLessThan(inventory.pages.size);
  });
});
