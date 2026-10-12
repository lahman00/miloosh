import { describe, expect, it } from "vitest";
import {
  checkAffiliateDisclosure,
  checkFooterConsistency,
  checkHeadings,
  checkInternalLinks,
  checkLinksThroughRedirects,
  checkMetadataUniqueness,
  checkSitemapCoverage,
  checkSocialMetadata,
  checkStructuredData,
  internalPath,
  reportGenericText,
  runAllChecks,
  type GenericPattern,
  type SiteModel,
} from "@/lib/site-audit/checks";
import type { Anchor, PageFacts } from "@/lib/site-audit/page-facts";

const SITE = "https://miloosh.com";
const FOOTER = "v0.12.0 · 354 tools across 27 categories · sources last verified October 8, 2026";

const link = (href: string, overrides: Partial<Anchor> = {}): Anchor => ({ href, rel: "", text: "link", disclosureNearby: true, ...overrides });

function page(path: string, overrides: Partial<PageFacts> = {}): PageFacts {
  return {
    path,
    title: `Title of ${path}`,
    description: `Description of ${path}`,
    canonical: `${SITE}${path}`,
    robots: "index, follow",
    og: { title: `Title of ${path}`, description: `Description of ${path}`, url: `${SITE}${path}` },
    twitter: { title: `Title of ${path}`, description: `Description of ${path}` },
    jsonLd: { types: [], invalid: 0 },
    h1Count: 1,
    footerLine: FOOTER,
    anchors: [],
    text: "",
    ...overrides,
  };
}

function model(pages: PageFacts[], overrides: Partial<SiteModel> = {}): SiteModel {
  return {
    siteUrl: SITE,
    pages: new Map(pages.map((p) => [p.path, p])),
    sitemapPaths: new Set(),
    redirects: new Map(),
    isStaticRoute: () => false,
    isPublicAsset: () => false,
    explainExclusion: () => null,
    ...overrides,
  };
}

describe("internalPath", () => {
  it.each([
    ["/software/pipedrive", "/software/pipedrive"],
    ["/software/pipedrive/", "/software/pipedrive"],
    ["/software/pipedrive?ref=x#top", "/software/pipedrive"],
    ["https://miloosh.com/compare/a-vs-b", "/compare/a-vs-b"],
    ["https://www.miloosh.com/compare/a-vs-b", "/compare/a-vs-b"],
    ["https://miloosh.com", "/"],
    ["https://miloosh.com/", "/"],
    ["/", "/"],
    ["/#section", "/"],
  ])("%s -> %s", (href, expected) => {
    expect(internalPath(href, SITE)).toBe(expected);
  });

  it.each(["https://vendor.example/pricing", "https://miloosh.com.evil.example/x", "//cdn.example/x.js", "mailto:hello@miloosh.com", "tel:+1", "javascript:void(0)", "relative/path"])("leaves the site: %s", (href) => {
    expect(internalPath(href, SITE)).toBeNull();
  });
});

describe("checkFooterConsistency", () => {
  it("passes when every page carries the same footer line", () => {
    expect(checkFooterConsistency(model([page("/"), page("/a")])).status).toBe("PASS");
  });

  it("fails when two builds' lines are mixed, naming each line and a page that carries it", () => {
    const result = checkFooterConsistency(model([page("/"), page("/old", { footerLine: "v0.11.0 · 254 tools across 21 categories · sources last verified August 28, 2026" })]));
    expect(result.status).toBe("FAIL");
    expect(result.count).toBe(2);
    expect(result.items.join("\n")).toContain("254 tools");
    expect(result.items.join("\n")).toContain("354 tools");
  });

  it("fails when a page has no footer line at all", () => {
    const result = checkFooterConsistency(model([page("/"), page("/bare", { footerLine: null })]));
    expect(result.status).toBe("FAIL");
    expect(result.items[0]).toContain("/bare");
  });
});

describe("checkInternalLinks", () => {
  const home = (anchors: Anchor[]) => page("/", { anchors });

  it("passes for links to pages, configured redirects, static routes and public files, and ignores external links", () => {
    const m = model([home([link("/a"), link("/old"), link("/recommend"), link("/logo.png"), link("https://vendor.example/x"), link("mailto:a@b.c")]), page("/a")], {
      redirects: new Map([["/old", "/a"]]),
      isStaticRoute: (path) => path === "/recommend",
      isPublicAsset: (path) => path === "/logo.png",
    });
    expect(checkInternalLinks(m).status).toBe("PASS");
  });

  it("fails on a link that resolves to nothing, counting each target once however many pages link to it", () => {
    const result = checkInternalLinks(model([home([link("/research")]), page("/a", { anchors: [link("/research/"), link("https://miloosh.com/research?x=1")] })]));
    expect(result.status).toBe("FAIL");
    expect(result.count).toBe(1);
    expect(result.items).toEqual(["/research (linked from 2 page(s), for example /)"]);
  });
});

describe("checkLinksThroughRedirects", () => {
  const redirects = new Map([["/research", "/research/report"]]);

  it("fails when a page links to the old address instead of the destination", () => {
    const result = checkLinksThroughRedirects(model([page("/", { anchors: [link("/research")] }), page("/research/report")], { redirects }));
    expect(result.status).toBe("FAIL");
    expect(result.items).toEqual(["/research -> /research/report (linked from 1 page(s), for example /)"]);
  });

  it("passes when links name the destination", () => {
    expect(checkLinksThroughRedirects(model([page("/", { anchors: [link("/research/report")] }), page("/research/report")], { redirects })).status).toBe("PASS");
  });

  it("does not flag a path that is both a page and a redirect source", () => {
    expect(checkLinksThroughRedirects(model([page("/", { anchors: [link("/research")] }), page("/research")], { redirects })).status).toBe("PASS");
  });
});

describe("checkSocialMetadata", () => {
  it("passes when the two cards agree and og:url is the canonical URL", () => {
    expect(checkSocialMetadata(model([page("/a")])).status).toBe("PASS");
  });

  it("fails when the Twitter title or description differs from the Open Graph one", () => {
    const m = model([page("/a", { twitter: { title: "Site default", description: "Description of /a" } }), page("/b", { twitter: { title: "Title of /b", description: "Site default" } })]);
    const result = checkSocialMetadata(m);
    expect(result.status).toBe("FAIL");
    expect(result.items).toEqual(["/a: twitter:title differs from og:title", "/b: twitter:description differs from og:description"]);
  });

  it("fails when og:url is not the canonical URL", () => {
    const result = checkSocialMetadata(model([page("/a", { og: { title: "Title of /a", description: "Description of /a", url: `${SITE}/other` } })]));
    expect(result.items).toEqual(["/a: og:url differs from the canonical URL"]);
  });
});

describe("checkMetadataUniqueness", () => {
  it("fails on a duplicated title or description between indexable pages", () => {
    const result = checkMetadataUniqueness(model([page("/a", { title: "Same", description: "One" }), page("/b", { title: "Same", description: "Two" }), page("/c", { title: "Other", description: "One" })]));
    expect(result.status).toBe("FAIL");
    expect(result.count).toBe(2);
    expect(result.items.join("\n")).toMatch(/title "Same" is shared by 2 pages/);
    expect(result.items.join("\n")).toMatch(/description "One" is shared by 2 pages/);
  });

  it("ignores noindex pages, which are not competing for the same result", () => {
    const result = checkMetadataUniqueness(model([page("/a", { title: "Same" }), page("/b", { title: "Same", description: "Other", robots: "noindex, follow" })]));
    expect(result.status).toBe("PASS");
  });
});

describe("checkSitemapCoverage", () => {
  const byId = (results: ReturnType<typeof checkSitemapCoverage>) => Object.fromEntries(results.map((r) => [r.id, r]));

  it("passes for a site whose indexable pages are listed or linked, with the exclusions explained", () => {
    const m = model([page("/", { anchors: [link("/a")] }), page("/a"), page("/b", { anchors: [link("/a")] })], {
      sitemapPaths: new Set(["/", "/a"]),
    });
    // /b is unlisted, unlinked and unexplained: only that is wrong here.
    const r = byId(checkSitemapCoverage(m));
    expect(r["sitemap-urls-exist"]!.status).toBe("PASS");
    expect(r["sitemap-excludes-noindex"]!.status).toBe("PASS");
    expect(r["sitemap-exclusions-explained"]!.items).toEqual(["/b"]);
    expect(r["no-orphan-pages"]!.items).toEqual(["/b"]);
  });

  it("fails when a sitemap URL matches no page, unless it is a known route", () => {
    const m = model([page("/")], { sitemapPaths: new Set(["/", "/gone", "/recommend"]), isStaticRoute: (path) => path === "/recommend" });
    expect(byId(checkSitemapCoverage(m))["sitemap-urls-exist"]!.items).toEqual(["/gone"]);
  });

  it("fails when a noindex page is in the sitemap", () => {
    const m = model([page("/", { robots: "noindex" })], { sitemapPaths: new Set(["/"]) });
    expect(byId(checkSitemapCoverage(m))["sitemap-excludes-noindex"]!.items).toEqual(["/"]);
  });

  it("accepts an unlisted page when the policy explains it and something links to it", () => {
    const m = model([page("/", { anchors: [link("/c")] }), page("/c")], { sitemapPaths: new Set(["/"]), explainExclusion: (path) => (path === "/c" ? "quality gate" : null) });
    const r = byId(checkSitemapCoverage(m));
    expect(r["sitemap-exclusions-explained"]!.status).toBe("PASS");
    expect(r["no-orphan-pages"]!.status).toBe("PASS");
  });

  it("reports an unlisted page that nothing links to as an orphan even when the policy explains why it is unlisted", () => {
    const m = model([page("/"), page("/c")], { sitemapPaths: new Set(["/"]), explainExclusion: () => "discovery suppression" });
    const r = byId(checkSitemapCoverage(m));
    expect(r["sitemap-exclusions-explained"]!.status).toBe("PASS");
    expect(r["no-orphan-pages"]!.items).toEqual(["/c"]);
  });

  it("does not count a page's link to itself, nor a noindex page, as an orphan", () => {
    const m = model([page("/", { anchors: [link("/")] }), page("/self", { anchors: [link("/self")] }), page("/hidden", { robots: "noindex, follow" })], { sitemapPaths: new Set(["/"]), explainExclusion: () => "reason" });
    expect(byId(checkSitemapCoverage(m))["no-orphan-pages"]!.items).toEqual(["/self"]);
  });
});

describe("checkStructuredData", () => {
  const full = { types: ["BreadcrumbList", "ItemList", "Organization"], invalid: 0 };

  it("passes when each page type has the entities it needs", () => {
    expect(checkStructuredData(model([page("/software/a", { jsonLd: full }), page("/compare/a-vs-b", { jsonLd: full }), page("/category/crm", { jsonLd: { types: ["BreadcrumbList", "CollectionPage", "Organization"], invalid: 0 } }), page("/about")])).status).toBe("PASS");
  });

  it("fails when a profile lacks an expected entity or a block does not parse", () => {
    const result = checkStructuredData(model([page("/software/a", { jsonLd: { types: ["Organization"], invalid: 0 } }), page("/about", { jsonLd: { types: [], invalid: 1 } })]));
    expect(result.items).toEqual(["/software/a: software profile lacks BreadcrumbList, ItemList", "/about: 1 JSON-LD block(s) are not valid JSON"]);
  });

  it("does not hold the /compare hub to the comparison-page expectations", () => {
    expect(checkStructuredData(model([page("/compare")])).status).toBe("PASS");
  });
});

describe("checkAffiliateDisclosure", () => {
  it("fails for a sponsored link with no disclosure beside it and names the page", () => {
    const result = checkAffiliateDisclosure(model([page("/guide", { anchors: [link("https://v.example/r", { rel: "sponsored noopener", disclosureNearby: false }), link("https://v.example/r2", { rel: "sponsored noopener" })] })]));
    expect(result.status).toBe("FAIL");
    expect(result.items).toEqual(["/guide: 1 sponsored link(s) without a nearby disclosure"]);
  });

  it("passes when every sponsored link has one, counting them in the detail", () => {
    const result = checkAffiliateDisclosure(model([page("/guide", { anchors: [link("https://v.example/r", { rel: "sponsored noopener" }), link("/x")] })]));
    expect(result.status).toBe("PASS");
    expect(result.detail).toContain("1 sponsored link");
  });

  it("does not mistake a rel that merely contains the word for sponsored", () => {
    expect(checkAffiliateDisclosure(model([page("/g", { anchors: [link("https://v.example", { rel: "nosponsoredx", disclosureNearby: false })] })])).status).toBe("PASS");
  });
});

describe("checkHeadings", () => {
  it("fails for a page with no h1 or two", () => {
    const result = checkHeadings(model([page("/a", { h1Count: 0 }), page("/b", { h1Count: 2 }), page("/c")]));
    expect(result.items).toEqual(["/a: 0 h1 element(s)", "/b: 2 h1 element(s)"]);
  });
});

describe("reportGenericText", () => {
  const pattern: GenericPattern = { id: "x", description: "Boilerplate", scope: (path) => path.startsWith("/software/"), needle: "Most teams start by exporting" };
  const pages = [page("/software/a", { text: "Q: How do we migrate? Most teams start by exporting data." }), page("/software/b", { text: "Custom answer." }), page("/compare/a-vs-b", { text: "Most teams start by exporting too." })];

  it("counts only pages inside the pattern's scope that contain the sentence, and reports without failing by default", () => {
    const [result] = reportGenericText(model(pages), [pattern]);
    expect(result).toMatchObject({ id: "generic-text:x", status: "INFO", count: 1, items: ["/software/a"] });
  });

  it("fails once the count exceeds the allowance, and passes at the allowance", () => {
    expect(reportGenericText(model(pages), [pattern], { x: 0 })[0]!.status).toBe("FAIL");
    expect(reportGenericText(model(pages), [pattern], { x: 1 })[0]!.status).toBe("INFO");
  });
});

describe("runAllChecks", () => {
  it("returns one result per rule, in a stable order, and reports a clean minimal site as passing", () => {
    const results = runAllChecks(model([page("/", { anchors: [link("/a")] }), page("/a")], { sitemapPaths: new Set(["/", "/a"]) }));
    expect(results.map((r) => r.id)).toEqual([
      "footer-consistency",
      "internal-links",
      "links-through-redirects",
      "social-metadata",
      "metadata-uniqueness",
      "sitemap-urls-exist",
      "sitemap-excludes-noindex",
      "sitemap-exclusions-explained",
      "no-orphan-pages",
      "structured-data",
      "affiliate-disclosure",
      "single-h1",
      "generic-text:faq-migration",
      "generic-text:faq-integrations",
      "generic-text:cons-disclosure",
      "generic-text:pricing-undocumented",
      "generic-text:limitation-fallback",
    ]);
    expect(results.filter((r) => r.status === "FAIL")).toEqual([]);
  });

  it("applies the generic-text allowances it is given", () => {
    const results = runAllChecks(model([page("/", { text: "Check the required plan, usage limits and workflow fit before choosing" })], { sitemapPaths: new Set(["/"]) }), { maxGeneric: { "limitation-fallback": 0 } });
    expect(results.find((r) => r.id === "generic-text:limitation-fallback")!.status).toBe("FAIL");
  });
});
