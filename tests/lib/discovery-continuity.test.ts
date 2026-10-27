import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { getAllSoftware, getSoftware, type Software } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import {
  GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS,
  GSC_SITEMAP_SUPPRESSED_COMPARISONS,
  shouldSubmitComparisonToSitemap,
} from "@/data/seo/gsc-sitemap-comparison-cohort";
import { DISCOVERY_BASELINE } from "@/data/seo/discovery-baseline";
import {
  getSoftwareDiscoveryDecision,
  isComparisonDiscoveryEligible,
  isSoftwareDiscoveryEligible,
  validateDiscoveryBaseline,
  type DiscoveryBaseline,
} from "@/lib/discovery-continuity";
import { getSoftwareIndexingQualityReasons, isSoftwareIndexingReady } from "@/lib/indexing-quality";
import { buildReverificationQueue, checkDiscoverySentinel } from "@/lib/discovery-maintenance";
import { readFileSync } from "node:fs";

const BASELINE_DAY = new Date("2026-10-27T12:00:00Z");
const path = (url: string) => new URL(url).pathname;

function clone(slug: string, patch: (s: Software) => void): Software {
  const copy = structuredClone(getSoftware(slug)!);
  patch(copy);
  return copy;
}

afterEach(() => vi.useRealTimers());

describe("discovery baseline registry", () => {
  it("is well-formed and records exactly the 2026-10-27 live sitemap counts", () => {
    expect(validateDiscoveryBaseline(DISCOVERY_BASELINE)).toEqual([]);
    expect(DISCOVERY_BASELINE.software).toHaveLength(265);
    expect(DISCOVERY_BASELINE.comparisons).toHaveLength(347);
    expect(DISCOVERY_BASELINE.sitemapSha256).toBe("9725b96a9199d64a22b396ac7a5442b456044e02d245abde3e6fdd074abb9fcc");
  });

  it("only tracks pages that meet the CURRENT strict gate and curated suppression policy (no thin pages admitted)", () => {
    const published = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b)));
    for (const slug of DISCOVERY_BASELINE.software) {
      expect(isSoftwareIndexingReady(getSoftware(slug)!, BASELINE_DAY), slug).toBe(true);
    }
    for (const slug of DISCOVERY_BASELINE.comparisons) {
      expect(published.has(slug), slug).toBe(true);
      expect(shouldSubmitComparisonToSitemap(slug), slug).toBe(true);
    }
  });

  it("rejects corrupted registries", () => {
    const bad: unknown[] = [
      null,
      { ...DISCOVERY_BASELINE, version: 2 },
      { ...DISCOVERY_BASELINE, sourceSha: "abc" },
      { ...DISCOVERY_BASELINE, sitemapSha256: "zz" },
      { ...DISCOVERY_BASELINE, software: [] },
      { ...DISCOVERY_BASELINE, software: ["b", "a"] },
      { ...DISCOVERY_BASELINE, comparisons: ["a-vs-b", "a-vs-b"] },
      { ...DISCOVERY_BASELINE, comparisons: ["A vs B"] },
    ];
    for (const registry of bad) expect(validateDiscoveryBaseline(registry)).not.toEqual([]);
  });
});

describe("discovery continuity decision", () => {
  const future = new Date("2026-12-31T00:00:00Z");
  const slug = "airtable";

  it("keeps strict behaviour unchanged for current-day dates", () => {
    const decision = getSoftwareDiscoveryDecision(getSoftware(slug)!, BASELINE_DAY);
    expect(decision).toMatchObject({ eligible: true, basis: "strict", strictReasons: [] });
  });

  it("retains an admitted product whose only failures are age, and keeps the stale reasons visible", () => {
    const decision = getSoftwareDiscoveryDecision(getSoftware(slug)!, future);
    expect(decision.eligible).toBe(true);
    expect(decision.basis).toBe("continuity");
    expect(decision.strictReasons).toEqual(expect.arrayContaining(["content-freshness", "pricing-freshness"]));
    expect(isSoftwareIndexingReady(getSoftware(slug)!, future)).toBe(false);
  });

  it.each([
    ["no pricing evidence", (s: Software) => { delete s.pricing!.officialSource; }],
    ["no documented constraints", (s: Software) => { s.cons = []; }],
    ["thin features", (s: Software) => { s.features = s.features.slice(0, 3); }],
    ["thin buyer fit", (s: Software) => { s.bestFor = "short"; }],
    ["lost source coverage", (s: Software) => { s.sources = []; delete s.pricing!.officialSource; }],
    ["missing pricing date", (s: Software) => { delete s.pricing!.lastVerified; }],
    ["malformed content date", (s: Software) => { s.accessedAt = "soon"; }],
    ["impossible calendar date", (s: Software) => { s.pricing!.lastVerified = "2026-02-31"; }],
    ["future content date", (s: Software) => { s.accessedAt = "2027-06-01"; }],
    ["future pricing date", (s: Software) => { s.pricing!.lastVerified = "2027-06-01"; }],
  ])("fails closed on %s even for a baseline product", (_label, mutate) => {
    const product = clone(slug, mutate);
    expect(isSoftwareDiscoveryEligible(product, future)).toBe(false);
  });

  it("does not retain a product that is not in the baseline", () => {
    const notInBaseline = clone(slug, (s) => { s.slug = "brand-new-product"; });
    expect(getSoftwareDiscoveryDecision(notInBaseline, future).blockingReasons).toContain("not-in-baseline");
  });

  it("does not retain anything when the registry is corrupted", () => {
    const corrupted = { ...DISCOVERY_BASELINE, sitemapSha256: "bad" } as unknown as DiscoveryBaseline;
    expect(isSoftwareDiscoveryEligible(getSoftware(slug)!, future, corrupted)).toBe(false);
    // Strict admission still works without the registry.
    expect(isSoftwareDiscoveryEligible(getSoftware(slug)!, BASELINE_DAY, corrupted)).toBe(true);
  });

  it("admits a comparison only for the exact baseline pair, in baseline order", () => {
    const [slugA, slugB] = [...PUBLISHED_COMPARISONS].find(([a, b]) => DISCOVERY_BASELINE.comparisons.includes(getComparisonSlug(a, b)))!;
    const a = getSoftware(slugA)!;
    const b = getSoftware(slugB)!;
    expect(isComparisonDiscoveryEligible(a, b, getComparisonSlug(slugA, slugB), future)).toBe(true);
    // Reverse ordering and arbitrary pairings of two admitted products are not baseline pairs.
    expect(isComparisonDiscoveryEligible(b, a, getComparisonSlug(slugB, slugA), future)).toBe(
      DISCOVERY_BASELINE.comparisons.includes(getComparisonSlug(slugB, slugA))
    );
    expect(isComparisonDiscoveryEligible(a, b, "x-vs-y", future)).toBe(false);
  });

  it("excludes a comparison when either product loses evidence", () => {
    const [slugA, slugB] = PUBLISHED_COMPARISONS.find(([a, b]) => DISCOVERY_BASELINE.comparisons.includes(getComparisonSlug(a, b)))!;
    const broken = clone(slugA, (s) => { s.cons = []; });
    expect(isComparisonDiscoveryEligible(broken, getSoftware(slugB)!, getComparisonSlug(slugA, slugB), future)).toBe(false);
  });
});

describe("sitemap across frozen dates", () => {
  const baselinePaths = [
    ...DISCOVERY_BASELINE.software.map((s) => `/software/${s}`),
    ...DISCOVERY_BASELINE.comparisons.map((s) => `/compare/${s}`),
  ];

  function at(date: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${date}T12:00:00Z`));
    return sitemap();
  }

  const today = at("2026-10-27");
  const todayByPath = new Map(today.map((e) => [path(e.url), e]));

  it("today's sitemap equals the baseline admission set (current-day no-op)", () => {
    const inSitemap = [...todayByPath.keys()].filter((p) => p.startsWith("/software/") || p.startsWith("/compare/") && p !== "/compare");
    expect(new Set(inSitemap)).toEqual(new Set(baselinePaths));
  });

  it.each(["2026-10-30", "2026-11-03", "2026-11-30", "2026-12-31"])("keeps every admitted URL, adds none and preserves lastmod on %s", (date) => {
    const later = at(date);
    const laterByPath = new Map(later.map((e) => [path(e.url), e]));
    expect([...laterByPath.keys()].sort()).toEqual([...todayByPath.keys()].sort());
    for (const [p, entry] of todayByPath) {
      expect(laterByPath.get(p)?.lastModified, p).toEqual(entry.lastModified);
    }
  });

  it("names the three products from the confirmed defect", () => {
    const later = new Set(at("2026-11-03").map((e) => path(e.url)));
    for (const slug of ["airtable", "intercom", "semrush"]) expect(later.has(`/software/${slug}`), slug).toBe(true);
  });

  it("never submits the deliberately suppressed comparison cohort", () => {
    expect(GSC_SITEMAP_SUPPRESSED_COMPARISONS.length).toBe(804);
    const later = new Set(at("2026-12-31").map((e) => path(e.url)));
    const priority = new Set<string>(GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS);
    for (const suppressed of GSC_SITEMAP_SUPPRESSED_COMPARISONS.filter((slug) => !priority.has(slug))) expect(later.has(`/compare/${suppressed}`), suppressed).toBe(false);
  });

  it("keeps software related-comparison links on the same predicate as the sitemap", () => {
    const page = readFileSync("app/software/[slug]/page.tsx", "utf8");
    const map = readFileSync("app/sitemap.ts", "utf8");
    for (const source of [page, map]) {
      expect(source).toContain("isComparisonDiscoveryEligible(");
      expect(source).not.toMatch(/isComparisonIndexingReady\(/);
    }
    // Every admitted pair a software page would link is in the sitemap at a future date.
    const later = new Set(at("2026-12-31").map((e) => path(e.url)));
    for (const [a, b] of PUBLISHED_COMPARISONS) {
      const slug = getComparisonSlug(a, b);
      const linked = shouldSubmitComparisonToSitemap(slug) && isComparisonDiscoveryEligible(getSoftware(a)!, getSoftware(b)!, slug, new Date("2026-12-31T12:00:00Z"));
      expect(later.has(`/compare/${slug}`), slug).toBe(linked);
    }
  });

  it("strict gate and diagnostics still report the stale reasons honestly in the future", () => {
    const stale = getAllSoftware().filter((s) => getSoftwareIndexingQualityReasons(s, new Date("2026-12-31T12:00:00Z")).includes("content-freshness"));
    expect(stale.length).toBeGreaterThan(0);
  });
});

describe("maintenance queue and release sentinel", () => {
  it("queues overdue products with real dates and never mutates them", () => {
    const before = JSON.stringify(getAllSoftware());
    const queue = buildReverificationQueue(getAllSoftware(), new Date("2026-11-30T00:00:00Z"), DISCOVERY_BASELINE);
    expect(queue.some((i) => i.nextDueDate === null && i.slug === "airtable")).toBe(true);
    expect(queue.find((i) => i.slug === "airtable")!.steps.join(" ")).toMatch(/official pricing page/);
    expect(JSON.stringify(getAllSoftware())).toBe(before);
  });

  it("fails when an admitted URL disappears and passes only with an exact, reviewed waiver", () => {
    const all = new Set([
      ...DISCOVERY_BASELINE.software.map((s) => `/software/${s}`),
      ...DISCOVERY_BASELINE.comparisons.map((s) => `/compare/${s}`),
    ]);
    expect(checkDiscoverySentinel(all, DISCOVERY_BASELINE, []).ok).toBe(true);
    const target = "/software/airtable";
    const without = new Set(all);
    without.delete(target);
    expect(checkDiscoverySentinel(without, DISCOVERY_BASELINE, []).missing).toEqual([target]);
    const waiver = { path: target, reason: "product discontinued", evidence: "vendor shutdown notice", reviewedBy: "owner", reviewedAt: "2026-11-01" };
    expect(checkDiscoverySentinel(without, DISCOVERY_BASELINE, [waiver], new Date("2026-11-02T00:00:00Z")).ok).toBe(true);
    expect(checkDiscoverySentinel(without, DISCOVERY_BASELINE, [{ ...waiver, path: "/software/*" }]).ok).toBe(false);
    expect(checkDiscoverySentinel(without, DISCOVERY_BASELINE, [{ ...waiver, reviewedBy: "" }]).ok).toBe(false);
    expect(checkDiscoverySentinel(without, DISCOVERY_BASELINE, [{ ...waiver, path: "/software/other" }]).ok).toBe(false);
  });
});


describe("independent evidence-integrity probes", () => {
  it.each(["2027-06-01", "2026-02-31", "2026-10-32", "soon"])("rejects invalid/future current dates before strict admission: %s", (date) => {
    const product = clone("airtable", (s) => { s.accessedAt = date; s.pricing!.lastVerified = "2026-10-20"; });
    expect(isSoftwareDiscoveryEligible(product, BASELINE_DAY)).toBe(false);
    const badPrice = clone("airtable", (s) => { s.accessedAt = "2026-10-20"; s.pricing!.lastVerified = date; });
    expect(isSoftwareDiscoveryEligible(badPrice, BASELINE_DAY)).toBe(false);
  });
  it("does not use cached approval for a later-corrupted registry object", () => {
    const registry = structuredClone(DISCOVERY_BASELINE);
    const future = new Date("2026-12-31T00:00:00Z");
    expect(isSoftwareDiscoveryEligible(getSoftware("airtable")!, future, registry)).toBe(true);
    registry.sitemapSha256 = "corrupted";
    expect(isSoftwareDiscoveryEligible(getSoftware("airtable")!, future, registry)).toBe(false);
  });
  it("rejects invalid/future baseline capture dates for retention", () => {
    expect(validateDiscoveryBaseline({ ...DISCOVERY_BASELINE, capturedAtUtc: "2026-02-31T00:00:00Z" })).not.toEqual([]);
    expect(isSoftwareDiscoveryEligible(getSoftware("airtable")!, new Date("2026-12-31T00:00:00Z"), { ...DISCOVERY_BASELINE, capturedAtUtc: "2027-01-01T00:00:00Z" })).toBe(false);
  });
  it("cannot use a baseline pair slug to admit unrelated products", () => {
    expect(isComparisonDiscoveryEligible(getSoftware("shopify")!, getSoftware("wix")!, "monday-vs-airtable", BASELINE_DAY)).toBe(false);
  });
  it("future-dated removal approval cannot authorize a disappearance", () => {
    const paths = new Set([...DISCOVERY_BASELINE.software.filter(s => s !== "airtable").map(s => `/software/${s}`), ...DISCOVERY_BASELINE.comparisons.map(s => `/compare/${s}`)]);
    const waiver = { path: "/software/airtable", reason: "product discontinued", evidence: "vendor shutdown notice", reviewedBy: "owner", reviewedAt: "2027-01-01" };
    expect(checkDiscoverySentinel(paths, DISCOVERY_BASELINE, [waiver], BASELINE_DAY).ok).toBe(false);
  });
});


describe("prebuild sentinel integration", () => {
  it("runs the sentinel before every npm build, including direct Vercel deployments", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    expect(manifest.scripts.prebuild).toBe("npm run seo:release-sentinel");
    expect(manifest.scripts.build).toBe("next build");
    expect(manifest.scripts["seo:release-sentinel"]).toBe("tsx scripts/seo/release-sentinel.ts");
  });
});
