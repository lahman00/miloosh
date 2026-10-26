import { describe, expect, it } from "vitest";
import {
  analyzeCrawlGraph,
  analyzeFocusPaths,
  familyOf,
  normalizeInternalHref,
  projectIndexingGate,
  type CrawledPage,
} from "@/lib/seo/crawl-graph-diagnostic";
import { getAllSoftware, type Software } from "@/data/software";
import { isSoftwareIndexingReady } from "@/lib/indexing-quality";

const SITE = "https://miloosh.com";

const page = (path: string, hrefs: string[] = [], extra: Partial<CrawledPage> = {}): CrawledPage => ({
  path,
  status: 200,
  noindex: false,
  hrefs,
  ...extra,
});

describe("normalizeInternalHref", () => {
  it("keeps same-site paths and strips query, hash and trailing slash", () => {
    expect(normalizeInternalHref("/compare/a-vs-b/?x=1#top", SITE)).toBe("/compare/a-vs-b");
    expect(normalizeInternalHref("https://miloosh.com/software/x", SITE)).toBe("/software/x");
    expect(normalizeInternalHref("https://miloosh.com", SITE)).toBe("/");
  });

  it("drops external, protocol-relative and non-path links", () => {
    expect(normalizeInternalHref("https://vendor.example/pricing", SITE)).toBeNull();
    expect(normalizeInternalHref("//cdn.example/a", SITE)).toBeNull();
    expect(normalizeInternalHref("mailto:a@b.c", SITE)).toBeNull();
  });
});

describe("analyzeCrawlGraph", () => {
  const pages = [
    page("/", ["/software/a", "/compare/a-vs-b"]),
    page("/software/a", ["/compare/a-vs-b", "/compare/a-vs-c"]),
    page("/compare/a-vs-b", ["/compare/a-vs-c"]),
    page("/compare/a-vs-c", []),
    page("/compare/a-vs-d", ["/compare/a-vs-c"], { noindex: true }),
    page("/compare/a-vs-e", [], { status: 404 }),
  ];
  const report = analyzeCrawlGraph({
    pages,
    sitemapPaths: [`${SITE}/`, `${SITE}/software/a`, `${SITE}/compare/a-vs-b`],
    siteUrl: SITE,
  });

  it("counts sitemap membership and orphans only for URLs outside the sitemap", () => {
    const c = report.families.comparison;
    expect(c.pages).toBe(4);
    expect(c.inSitemap).toBe(1);
    expect(c.notInSitemap).toBe(3);
    // a-vs-d and a-vs-e have no inbound link; a-vs-c is linked three times.
    expect(c.notInSitemapZeroInbound).toBe(2);
    expect(report.orphanSample).toEqual(["/compare/a-vs-d", "/compare/a-vs-e"]);
  });

  it("flags unsitemapped URLs reachable only from their own family", () => {
    // a-vs-c is linked from software/a, so it is not same-family-only.
    expect(report.families.comparison.notInSitemapOnlyFromSameFamily).toBe(0);
    const chained = analyzeCrawlGraph({
      pages: [page("/compare/x", ["/compare/y"]), page("/compare/y", [])],
      sitemapPaths: [`${SITE}/compare/x`],
      siteUrl: SITE,
    });
    expect(chained.families.comparison.notInSitemapOnlyFromSameFamily).toBe(1);
  });

  it("reports non-200 and noindex pages separately and never treats them as zero visibility", () => {
    expect(report.families.comparison.nonOk).toBe(1);
    expect(report.nonOkPaths).toEqual(["/compare/a-vs-e"]);
    expect(report.families.comparison.noindex).toBe(1);
  });

  it("ignores self-links and links to uncrawled paths", () => {
    const r = analyzeCrawlGraph({
      pages: [page("/compare/s", ["/compare/s", "/compare/unknown"])],
      sitemapPaths: [],
      siteUrl: SITE,
    });
    expect(r.families.comparison.notInSitemapZeroInbound).toBe(1);
  });

  it("classifies route families", () => {
    expect(familyOf("/compare/a-vs-b")).toBe("comparison");
    expect(familyOf("/software/a")).toBe("software");
    expect(familyOf("/category/crm")).toBe("category");
    expect(familyOf("/guides")).toBe("other");
  });
});

describe("projectIndexingGate", () => {
  const software = getAllSoftware();
  const start = new Date();

  it("matches isSoftwareIndexingReady on the start date", () => {
    const [row] = projectIndexingGate({
      software,
      comparisons: [],
      discoveryAllowed: () => true,
      start,
      offsetsDays: [0],
    });
    expect(row.softwareReady).toBe(software.filter((s) => isSoftwareIndexingReady(s, start)).length);
    expect(row.softwareReady + row.softwareBlocked).toBe(software.length);
  });

  it("only ever loses ready software as the date moves forward when nothing is re-verified", () => {
    const rows = projectIndexingGate({
      software,
      comparisons: [],
      discoveryAllowed: () => true,
      start,
      offsetsDays: [0, 30, 120],
    });
    expect(rows[1].softwareReady).toBeLessThanOrEqual(rows[0].softwareReady);
    expect(rows[2].softwareReady).toBeLessThanOrEqual(rows[1].softwareReady);
    // Beyond every verification date nothing can pass: proves the gate is date-dependent.
    const far = projectIndexingGate({
      software,
      comparisons: [],
      discoveryAllowed: () => true,
      start,
      offsetsDays: [3650],
    })[0];
    expect(far.softwareReady).toBe(0);
  });

  it("requires discovery rules and two ready products for a comparison", () => {
    const ready = software.find((s) => isSoftwareIndexingReady(s, start)) as Software;
    const other = software.find((s) => s.slug !== ready.slug && isSoftwareIndexingReady(s, start)) as Software;
    const blocked = software.find((s) => !isSoftwareIndexingReady(s, start)) as Software;
    const comparisons = [
      [ready.slug, other.slug],
      [ready.slug, blocked.slug],
      [ready.slug, "no-such-product"],
    ] as const;
    const eligible = (allowed: boolean) =>
      projectIndexingGate({
        software,
        comparisons,
        discoveryAllowed: () => allowed,
        start,
        offsetsDays: [0],
      })[0].comparisonsEligible;
    expect(eligible(true)).toBe(1);
    expect(eligible(false)).toBe(0);
  });
});

describe("analyzeFocusPaths", () => {
  const pages = [
    page("/", ["/software/a", "/compare/a-vs-b"]),
    page("/software/a", ["/compare/a-vs-b", "/compare/a-vs-b?ref=x", "/software/a", "https://vendor.example/a"]),
    page("/compare/a-vs-b", ["/compare/a-vs-c/"]),
    page("/compare/a-vs-c", ["/compare/a-vs-b"]),
    page("/compare/a-vs-orphan", []),
    page("/category/x", ["/compare/a-vs-b"]),
  ];
  const sitemapPaths = [`${SITE}/`, `${SITE}/software/a`, `${SITE}/compare/a-vs-b`];
  const detail = analyzeFocusPaths({
    pages,
    sitemapPaths,
    siteUrl: SITE,
    focusPaths: ["/compare/a-vs-b", "/compare/a-vs-orphan", "/compare/a-vs-c/", "/compare/missing"],
  });
  const by = (path: string) => detail.find((d) => d.path === path)!;

  it("counts distinct crawlable linking pages by family, ignoring self-links, duplicates and external links", () => {
    expect(by("/compare/a-vs-b")).toMatchObject({
      crawled: true,
      status: 200,
      inSitemap: true,
      inboundTotal: 4,
      inboundByFamily: { comparison: 1, software: 1, category: 1, other: 1 },
      inboundSample: ["/", "/category/x", "/compare/a-vs-c", "/software/a"],
    });
  });

  it("reports a true orphan as zero inbound and not in the sitemap", () => {
    expect(by("/compare/a-vs-orphan")).toMatchObject({ crawled: true, inSitemap: false, inboundTotal: 0, inboundSample: [] });
  });

  it("normalises focus paths and link targets the same way (trailing slash)", () => {
    expect(by("/compare/a-vs-c")).toMatchObject({ crawled: true, inboundTotal: 1 });
  });

  it("marks a path that was never crawled instead of reporting it as a measured orphan", () => {
    expect(by("/compare/missing")).toMatchObject({ crawled: false, status: null, inboundTotal: 0 });
  });

  it("caps the sample without changing the total", () => {
    const capped = analyzeFocusPaths({ pages, sitemapPaths, siteUrl: SITE, focusPaths: ["/compare/a-vs-b"], sampleSize: 2 });
    expect(capped[0]).toMatchObject({ inboundTotal: 4, inboundSample: ["/", "/category/x"] });
  });

  it("does not change the aggregate analysis", () => {
    const before = JSON.stringify(analyzeCrawlGraph({ pages, sitemapPaths, siteUrl: SITE }));
    analyzeFocusPaths({ pages, sitemapPaths, siteUrl: SITE, focusPaths: ["/compare/a-vs-b"] });
    expect(JSON.stringify(analyzeCrawlGraph({ pages, sitemapPaths, siteUrl: SITE }))).toBe(before);
  });
});
