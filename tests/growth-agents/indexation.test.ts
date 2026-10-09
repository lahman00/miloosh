import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildIndexationEvidence, coverageReportAgeDays, postReleaseCrawlObserved } from "@/lib/growth-agents/indexation";
import { U } from "./fixtures";

const sitemaps = {
  schemaVersion: 1,
  kind: "sitemaps",
  property: "sc-domain:miloosh.com",
  capturedAt: "2026-10-08T22:00:00Z",
  source: "fixture",
  sitemaps: [
    { url: "https://miloosh.com/sitemap.xml", type: "Sitemap", submitted: "2026-09-01", lastRead: "2026-10-07", status: "SUCCESS", discoveredPages: 692 },
    { url: "https://miloosh.com/old.xml", type: "Sitemap", submitted: "2026-08-01", lastRead: "2026-08-02", status: "HAS_ERRORS", discoveredPages: 5 },
  ],
};

const pageIndexing = {
  schemaVersion: 1,
  kind: "page-indexing",
  property: "sc-domain:miloosh.com",
  capturedAt: "2026-10-08T22:00:00Z",
  reportLastUpdated: "2026-10-05",
  source: "fixture",
  indexedPages: 76,
  notIndexedPages: 905,
  reasons: [
    {
      label: "Crawled - currently not indexed",
      source: "Google systems",
      pages: 400,
      validation: { state: "NOT_STARTED" },
      sampleLastCrawled: [
        { url: "https://www.miloosh.com/software/alpha/", lastCrawled: "2026-09-01" },
        { url: "https://miloosh.com/software/alpha", lastCrawled: "2026-09-20" },
        { url: "https://example.com/other", lastCrawled: "2026-10-01" },
        { url: "https://miloosh.com/software/beta", lastCrawled: "2026-10-08" },
      ],
    },
    { label: "Discovered - currently not indexed", source: "Google systems", pages: 505, validation: { state: "NOT_STARTED" }, sampleLastCrawled: "not available" },
  ],
};

const crawlStats = {
  schemaVersion: 1,
  kind: "crawl-stats",
  property: "sc-domain:miloosh.com",
  capturedAt: "2026-10-08T22:00:00Z",
  reportLastUpdated: "2026-10-07",
  source: "fixture",
  totalCrawlRequests: 1200,
  averageResponseTimeMs: 310,
  hosts: [{ host: "miloosh.com", requests: 1100, status: "No issues in the past 90 days" }, { host: "www.miloosh.com", requests: 100, status: "1 issue" }],
};

const reader = (files: Record<string, unknown>) => (name: string) => (name in files ? files[name] : null);

describe("indexation evidence from Search Console sidecars", () => {
  it("is NOT_MEASURED, never healthy, for every report that was not captured", () => {
    const evidence = buildIndexationEvidence(reader({}), "fixture");
    expect(evidence.sitemap.state).toBe("NOT_MEASURED");
    expect(evidence.coverage.state).toBe("NOT_MEASURED");
    expect(evidence.crawlStats.state).toBe("NOT_MEASURED");
    expect(evidence.inspections.size).toBe(0);
    expect(evidence.lastCrawlSamples.size).toBe(0);
    expect(coverageReportAgeDays(evidence, new Date("2026-10-09T00:00:00Z"))).toBeNull();
  });

  it("reports an invalid sidecar as UNAVAILABLE with a warning instead of trusting it", () => {
    const evidence = buildIndexationEvidence(reader({ "sitemaps.json": { ...sitemaps, sitemaps: [{ url: "not a url" }] } }), "fixture");
    expect(evidence.sitemap.state).toBe("UNAVAILABLE");
    expect(evidence.warnings.join(" ")).toMatch(/sitemaps.json is present but invalid/);
  });

  it("reads the sitemap that discovered the most pages", () => {
    const evidence = buildIndexationEvidence(reader({ "sitemaps.json": sitemaps }), "fixture");
    expect(evidence.sitemap).toMatchObject({ state: "MEASURED", value: { url: "https://miloosh.com/sitemap.xml", discoveredPages: 692, status: "SUCCESS", lastRead: "2026-10-07" } });
  });

  it("keeps the newest sampled crawl per canonical URL and ignores URLs that are not Miloosh pages", () => {
    const evidence = buildIndexationEvidence(reader({ "page-indexing.json": pageIndexing }), "fixture");
    expect(evidence.lastCrawlSamples.get(U("/software/alpha"))).toMatchObject({ date: "2026-09-20" });
    expect(evidence.lastCrawlSamples.get(U("/software/beta"))!.date).toBe("2026-10-08");
    expect(evidence.lastCrawlSamples.size).toBe(2);
  });

  it("dates a coverage report by when Google last updated it, not by when it was captured", () => {
    const evidence = buildIndexationEvidence(reader({ "page-indexing.json": pageIndexing }), "fixture");
    expect(evidence.coverage).toMatchObject({ state: "MEASURED", value: { indexed: 76, notIndexed: 905, reportLastUpdated: "2026-10-05" } });
    expect(coverageReportAgeDays(evidence, new Date("2026-10-09T12:00:00Z"))).toBe(4);
  });

  it("summarises crawl statistics and surfaces any host with an issue", () => {
    const evidence = buildIndexationEvidence(reader({ "crawl-stats.json": crawlStats }), "fixture");
    expect(evidence.crawlStats).toMatchObject({ state: "MEASURED", value: { totalCrawlRequests: 1200, hostIssues: ["www.miloosh.com: 1 issue"] } });
  });

  it("accepts only indexed-version inspections: a live test or an indexing request is never recorded", () => {
    const sidecar = (flag: boolean) => ({
      schemaVersion: 1,
      kind: "url-inspections",
      property: "sc-domain:miloosh.com",
      capturedAt: "2026-10-08T22:00:00Z",
      source: "fixture",
      indexedVersionOnly: flag,
      inspections: [{ url: U("/software/alpha"), inspectedAt: "2026-10-08T22:00:00Z", coverageState: "Crawled - currently not indexed", lastCrawl: "2026-09-20T01:02:03Z", crawlAllowed: true, indexingAllowed: true, pageFetch: "Successful", userCanonical: U("/software/alpha"), googleCanonical: U("/software/alpha") }],
    });
    const good = buildIndexationEvidence(reader({ "url-inspections.json": sidecar(true) }), "fixture");
    expect(good.inspections.get(U("/software/alpha"))).toMatchObject({ state: "MEASURED" });
    expect(good.lastCrawlSamples.get(U("/software/alpha"))).toMatchObject({ date: "2026-09-20", evidence: "URL inspection" });
    const bad = buildIndexationEvidence(reader({ "url-inspections.json": sidecar(false) }), "fixture");
    expect(bad.inspections.size).toBe(0);
    expect(bad.warnings.join(" ")).toMatch(/url-inspections.json is present but invalid/);
  });

  it("counts a post-release crawl only among URLs that have a sampled crawl date", () => {
    const evidence = buildIndexationEvidence(reader({ "page-indexing.json": pageIndexing }), "fixture");
    const urls = [U("/software/alpha"), U("/software/beta"), U("/software/never-sampled")];
    expect(postReleaseCrawlObserved(evidence, urls, "2026-10-08")).toEqual({ sampled: 2, crawledAfterRelease: 1, newestCrawl: "2026-10-08" });
    expect(postReleaseCrawlObserved(evidence, urls, "2026-10-09")).toEqual({ sampled: 2, crawledAfterRelease: 0, newestCrawl: "2026-10-08" });
    expect(postReleaseCrawlObserved(evidence, [], "2026-10-08")).toEqual({ sampled: 0, crawledAfterRelease: 0, newestCrawl: null });
  });

  it("treats a reader that throws as a missing capture", () => {
    const evidence = buildIndexationEvidence(() => {
      throw new Error("ENOENT");
    }, "fixture");
    expect(evidence.sitemap.state).toBe("NOT_MEASURED");
  });
});

describe("the committed 20261009 indexation sidecars", () => {
  const dir = path.join(process.cwd(), "docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009");
  const available = fs.existsSync(path.join(dir, "url-inspections.json"));
  const read = (name: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    } catch {
      return null;
    }
  };

  it.skipIf(!available)("validate against their schemas without a single warning", () => {
    const evidence = buildIndexationEvidence(read, "committed");
    expect(evidence.warnings).toEqual([]);
    expect(evidence.sitemap).toMatchObject({ state: "MEASURED", value: { discoveredPages: 692, status: "SUCCESS" } });
    expect(evidence.coverage.state).toBe("MEASURED");
    expect(evidence.crawlStats.state).toBe("MEASURED");
  });

  it.skipIf(!available)("record indexed-version inspections only, each dated, none a live test", () => {
    const raw = read("url-inspections.json");
    expect(raw.indexedVersionOnly).toBe(true);
    const evidence = buildIndexationEvidence(read, "committed");
    expect(evidence.inspections.size).toBe(raw.inspections.length);
    for (const inspection of raw.inspections) {
      expect(inspection.url).toMatch(/^https:\/\/miloosh\.com\//);
      expect(inspection.lastCrawl).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/);
    }
  });
});
