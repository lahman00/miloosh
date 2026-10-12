import { describe, expect, it } from "vitest";
import {
  checkAffiliateDisclosure,
  checkCanonicals,
  checkFooterConsistency,
  checkHeadings,
  checkInternalLinks,
  checkLinksThroughRedirects,
  checkMetadataUniqueness,
  checkProfileTemplateGating,
  checkRedirects,
  checkSitemapCoverage,
  checkSocialMetadata,
  checkStructuredData,
  internalPath,
  reachablePaths,
  reportGenericText,
  runAllChecks,
  unreachableComparisonSlugs,
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
    jsonLd: { types: [], topTypes: [], invalid: 0 },
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
    explainDeferral: () => null,
    isProfileTemplateV2: () => null,
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

describe("checkRedirects", () => {
  const m = (redirects: Array<[string, string]>, pages = [page("/target")]) => model(pages, { redirects: new Map(redirects), isStaticRoute: (path) => path === "/recommend" });

  it("passes for redirects that land on a page, a route or an absolute URL elsewhere", () => {
    expect(checkRedirects(m([["/a", "/target"], ["/b", "/recommend"], ["/c", "https://other.example/x"], ["/d", "https://miloosh.com/target"]])).status).toBe("PASS");
  });

  it("fails on a chain, a loop and a destination that does not exist", () => {
    const result = checkRedirects(m([["/a", "/b"], ["/b", "/target"], ["/x", "/x"], ["/gone", "/nowhere"]]));
    expect(result.items).toEqual(["/a -> /b -> /target (a redirect chain)", "/gone -> /nowhere (the destination does not exist)", "/x -> /x -> /x (a redirect chain)"]);
  });
});

describe("checkCanonicals", () => {
  it("passes when each indexable page names itself, including the home page with or without a slash", () => {
    expect(checkCanonicals(model([page("/", { canonical: SITE }), page("/a"), page("/b", { canonical: null, robots: "noindex" })])).status).toBe("PASS");
    expect(checkCanonicals(model([page("/", { canonical: `${SITE}/` })])).status).toBe("PASS");
  });

  it("fails on a missing canonical, another page's, a query string, a trailing slash or another host", () => {
    const result = checkCanonicals(model([page("/a", { canonical: null }), page("/b", { canonical: `${SITE}/a` }), page("/c", { canonical: `${SITE}/c?x=1` }), page("/d", { canonical: `${SITE}/d/` }), page("/e", { canonical: "https://www.miloosh.com/e" })]));
    expect(result.items).toEqual(["/a: no canonical link", `/b: canonical is ${SITE}/a`, `/c: canonical is ${SITE}/c?x=1`, `/d: canonical is ${SITE}/d/`, "/e: canonical is https://www.miloosh.com/e"]);
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

describe("reachablePaths", () => {
  const anchors = (...hrefs: string[]) => hrefs.map((href) => link(href));

  it("starts from the home page and the sitemap, and follows internal links and redirects", () => {
    const m = model([page("/", { anchors: anchors("/a", "/old") }), page("/a", { anchors: anchors("/b") }), page("/b"), page("/c"), page("/d"), page("/new")], {
      sitemapPaths: new Set(["/c"]),
      redirects: new Map([["/old", "/new"]]),
    });
    expect([...reachablePaths(m)].sort()).toEqual(["/", "/a", "/b", "/c", "/new"]);
  });

  it("does not follow links on a noindex page, unless asked to count every link", () => {
    const m = model([page("/", { anchors: anchors("/hidden") }), page("/hidden", { robots: "noindex, follow", anchors: anchors("/behind") }), page("/behind")]);
    expect([...reachablePaths(m)].sort()).toEqual(["/", "/hidden"]);
    expect([...reachablePaths(m, { countNoindexLinks: true })].sort()).toEqual(["/", "/behind", "/hidden"]);
  });

  it("ignores external links, missing pages and links back to a visited page", () => {
    const m = model([page("/", { anchors: anchors("https://vendor.example/x", "/missing", "/") })]);
    expect([...reachablePaths(m)]).toEqual(["/"]);
  });
});

describe("unreachableComparisonSlugs", () => {
  it("lists only comparison pages that are neither in the sitemap nor reachable, even when linked from noindex pages", () => {
    const m = model(
      [
        page("/", { anchors: [link("/compare/a-vs-b")] }),
        page("/compare/a-vs-b"),
        page("/compare/c-vs-d", { robots: "noindex, follow", anchors: [link("/compare/e-vs-f")] }),
        page("/compare/e-vs-f"),
        page("/compare/g-vs-h"),
        page("/software/x"),
      ],
      { sitemapPaths: new Set(["/compare/g-vs-h"]) },
    );
    expect(unreachableComparisonSlugs(m)).toEqual(["c-vs-d", "e-vs-f"]);
  });
});

describe("checkSitemapCoverage", () => {
  const byId = (results: ReturnType<typeof checkSitemapCoverage>) => Object.fromEntries(results.map((r) => [r.id, r]));

  it("passes for a site whose indexable pages are listed or reachable, with the exclusions explained", () => {
    const m = model([page("/", { anchors: [link("/a")] }), page("/a")], { sitemapPaths: new Set(["/"]), explainExclusion: () => "quality gate" });
    const r = byId(checkSitemapCoverage(m));
    expect(Object.values(r).map((x) => x.status)).toEqual(["PASS", "PASS", "PASS", "PASS", "PASS"]);
  });

  it("flags an unlisted page that nothing links to, and one whose exclusion no policy explains", () => {
    const m = model([page("/", { anchors: [link("/a")] }), page("/a"), page("/b", { anchors: [link("/a")] })], { sitemapPaths: new Set(["/", "/a"]) });
    const r = byId(checkSitemapCoverage(m));
    expect(r["sitemap-urls-exist"]!.status).toBe("PASS");
    expect(r["sitemap-excludes-noindex"]!.status).toBe("PASS");
    expect(r["sitemap-exclusions-explained"]!.items).toEqual(["/b"]);
    expect(r["indexable-pages-reachable"]!.items).toEqual(["/b"]);
  });

  it("fails when a sitemap URL matches no page, unless it is a known route", () => {
    const m = model([page("/")], { sitemapPaths: new Set(["/", "/gone", "/recommend"]), isStaticRoute: (path) => path === "/recommend" });
    expect(byId(checkSitemapCoverage(m))["sitemap-urls-exist"]!.items).toEqual(["/gone"]);
  });

  it("fails when a noindex page is in the sitemap", () => {
    const m = model([page("/", { robots: "noindex" })], { sitemapPaths: new Set(["/"]) });
    expect(byId(checkSitemapCoverage(m))["sitemap-excludes-noindex"]!.items).toEqual(["/"]);
  });

  it("accepts an unlisted page when the policy explains it and a reachable page links to it", () => {
    const m = model([page("/", { anchors: [link("/c")] }), page("/c")], { sitemapPaths: new Set(["/"]), explainExclusion: (path) => (path === "/c" ? "quality gate" : null) });
    const r = byId(checkSitemapCoverage(m));
    expect(r["sitemap-exclusions-explained"]!.status).toBe("PASS");
    expect(r["indexable-pages-reachable"]!.status).toBe("PASS");
  });

  it("reports an unreachable page even when the policy explains why it is unlisted", () => {
    const m = model([page("/"), page("/c")], { sitemapPaths: new Set(["/"]), explainExclusion: () => "discovery suppression" });
    const r = byId(checkSitemapCoverage(m));
    expect(r["sitemap-exclusions-explained"]!.status).toBe("PASS");
    expect(r["indexable-pages-reachable"]!.items).toEqual(["/c"]);
  });

  it("treats pages that only link to each other as unreachable, although each has an inbound link", () => {
    const m = model([page("/"), page("/x", { anchors: [link("/y")] }), page("/y", { anchors: [link("/x")] })], { sitemapPaths: new Set(["/"]), explainExclusion: () => "reason" });
    expect(byId(checkSitemapCoverage(m))["indexable-pages-reachable"]!.items).toEqual(["/x", "/y"]);
  });

  it("does not let a link on a noindex page rescue another page, and does not count a noindex page itself", () => {
    const m = model([page("/", { anchors: [link("/hidden")] }), page("/hidden", { robots: "noindex, follow", anchors: [link("/behind")] }), page("/behind")], { sitemapPaths: new Set(["/"]), explainExclusion: () => "reason" });
    expect(byId(checkSitemapCoverage(m))["indexable-pages-reachable"]!.items).toEqual(["/behind"]);
  });

  it("reports a deferred page as information with its reason, not as a failure, and leaves the others failing", () => {
    const m = model([page("/"), page("/held"), page("/lost")], {
      sitemapPaths: new Set(["/"]),
      explainExclusion: () => "reason",
      explainDeferral: (path) => (path === "/held" ? "deferred until 2026-11-04: protected" : null),
    });
    const r = byId(checkSitemapCoverage(m));
    expect(r["indexable-pages-reachable"]!.items).toEqual(["/lost"]);
    expect(r["unreachable-deferred"]).toMatchObject({ status: "INFO", count: 1, items: ["/held: deferred until 2026-11-04: protected"] });
  });
});

describe("checkStructuredData", () => {
  const full = { types: ["BreadcrumbList", "ItemList", "Organization"], topTypes: ["BreadcrumbList", "ItemList"], invalid: 0 };

  it("passes when each page type has the entities it needs", () => {
    expect(checkStructuredData(model([page("/software/a", { jsonLd: full }), page("/compare/a-vs-b", { jsonLd: full }), page("/category/crm", { jsonLd: { types: ["BreadcrumbList", "CollectionPage", "Organization"], topTypes: [], invalid: 0 } }), page("/about")])).status).toBe("PASS");
  });

  it("fails when a profile lacks an expected entity or a block does not parse", () => {
    const result = checkStructuredData(model([page("/software/a", { jsonLd: { types: ["Organization"], topTypes: [], invalid: 0 } }), page("/about", { jsonLd: { types: [], topTypes: [], invalid: 1 } })]));
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

describe("checkProfileTemplateGating", () => {
  const review = "Last reviewed October 8, 2026 against the vendor's official sources. Pricing last verified October 6, 2026.";
  const v2Page = (path: string, overrides = {}) => page(path, { text: review, jsonLd: { types: ["SoftwareApplication"], topTypes: ["SoftwareApplication"], invalid: 0 }, ...overrides });
  const gate = (v2: string[], held: string[]) => (path: string) => (v2.includes(path) ? true : held.includes(path) ? false : null);

  it("passes when editable profiles carry the v2 markers and held profiles carry none", () => {
    const m = model([v2Page("/software/a"), page("/software/b", { text: "Most teams start by exporting their existing b data." }), page("/about")], { isProfileTemplateV2: gate(["/software/a"], ["/software/b"]) });
    const result = checkProfileTemplateGating(m);
    expect(result.status).toBe("PASS");
    expect(result.detail).toContain("1 editable profiles");
  });

  it("fails when a held profile shows a v2 marker, because its measurement would be spoiled", () => {
    const m = model([v2Page("/software/b")], { isProfileTemplateV2: gate([], ["/software/b"]) });
    expect(checkProfileTemplateGating(m).items).toEqual(["/software/b: held profile shows the review line and the product entity"]);
  });

  it("fails when an editable profile lacks a marker or keeps the generic answers", () => {
    const m = model(
      [page("/software/a"), v2Page("/software/c", { text: `${review} Integration support varies by tool.` }), v2Page("/software/d", { jsonLd: { types: [], topTypes: [], invalid: 0 } })],
      { isProfileTemplateV2: gate(["/software/a", "/software/c", "/software/d"], []) },
    );
    expect(checkProfileTemplateGating(m).items).toEqual([
      "/software/a: v2 profile is missing the review line, the product entity",
      "/software/c: v2 profile is missing (it still has the generic FAQ answers)",
      "/software/d: v2 profile is missing the product entity",
    ]);
  });

  it("does not count a SoftwareApplication that only sits inside the alternatives list as the product entity", () => {
    const m = model([page("/software/a", { text: review, jsonLd: { types: ["ItemList", "SoftwareApplication"], topTypes: ["ItemList"], invalid: 0 } })], { isProfileTemplateV2: gate(["/software/a"], []) });
    expect(checkProfileTemplateGating(m).items).toEqual(["/software/a: v2 profile is missing the product entity"]);
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
      "redirects",
      "canonical-self",
      "social-metadata",
      "metadata-uniqueness",
      "sitemap-urls-exist",
      "sitemap-excludes-noindex",
      "sitemap-exclusions-explained",
      "indexable-pages-reachable",
      "unreachable-deferred",
      "structured-data",
      "affiliate-disclosure",
      "profile-template-gating",
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
