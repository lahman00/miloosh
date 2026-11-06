import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { generateMetadata as softwareMetadata } from "@/app/software/[slug]/page";
import { generateMetadata as comparisonMetadata } from "@/app/compare/[comparison]/page";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAllSoftware } from "@/data/software";
import { INDEXABLE_COMPARISONS, INDEXABLE_SOFTWARE, isIndexableComparison, isIndexableSoftware } from "@/data/seo/index-allowlist";

/**
 * SEO RESET 2026-11-06 — the deliberate, evidence-backed noindex policy change that the previous version of this test
 * asked for. Evidence (Search Console + rendered-build analysis) is recorded in data/seo/index-allowlist.ts and
 * docs/seo-reset-20261106/index-decisions.csv. Google's scaled-content policy says to exclude such content from Search:
 * https://developers.google.com/search/docs/essentials/spam-policies
 *
 * The policy: one allowlist decides indexing. Allowlisted pages carry no robots override and are in the sitemap.
 * Every other comparison/software page is `noindex, follow`, out of the sitemap, and keeps its self-canonical.
 */
describe("Miloosh index allowlist versus noindex policy", () => {
  // Compare by path: SITE_URL differs between local test runs and production builds.
  const urls = () => new Set(sitemap().map((entry) => new URL(entry.url).pathname));

  it("allowlists only real, published pages", () => {
    const published = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b)));
    for (const slug of INDEXABLE_COMPARISONS) expect(published.has(slug), slug).toBe(true);
    const software = new Set(getAllSoftware().map((item) => item.slug));
    for (const slug of INDEXABLE_SOFTWARE) expect(software.has(slug), slug).toBe(true);
    expect(INDEXABLE_COMPARISONS.size).toBeGreaterThan(0);
    expect(INDEXABLE_SOFTWARE.size).toBeGreaterThan(0);
  });

  it("noindexes a non-allowlisted comparison but keeps it usable and self-canonical", async () => {
    const slug = "asana-vs-wrike";
    expect(isIndexableComparison(slug)).toBe(false);
    expect(urls().has(`/compare/${slug}`)).toBe(false);
    const metadata = await comparisonMetadata({ params: Promise.resolve({ comparison: slug }) });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(`/compare/${slug}`);
  });

  it("noindexes a non-allowlisted software page but keeps it usable and self-canonical", async () => {
    const slug = "obsidian";
    expect(isIndexableSoftware(slug)).toBe(false);
    expect(urls().has(`/software/${slug}`)).toBe(false);
    const metadata = await softwareMetadata({ params: Promise.resolve({ slug }) });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(`/software/${slug}`);
  });

  it("leaves allowlisted money and demand pages indexable and submitted", async () => {
    for (const slug of ["wix-vs-shopify", "krispcall-vs-dialpad", "notion-vs-clickup"]) {
      expect(isIndexableComparison(slug), slug).toBe(true);
      expect(urls().has(`/compare/${slug}`), slug).toBe(true);
      const metadata = await comparisonMetadata({ params: Promise.resolve({ comparison: slug }) });
      expect(metadata.robots, slug).toBeUndefined();
      expect(metadata.alternates?.canonical).toBe(`/compare/${slug}`);
    }
    for (const slug of ["semrush", "pipedrive", "close"]) {
      expect(isIndexableSoftware(slug), slug).toBe(true);
      const metadata = await softwareMetadata({ params: Promise.resolve({ slug }) });
      expect(metadata.robots, slug).toBeUndefined();
    }
  });

  it("never submits a noindexed URL in the sitemap", () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname;
      if (path.startsWith("/compare/")) expect(isIndexableComparison(path.slice("/compare/".length)), path).toBe(true);
      if (path.startsWith("/software/")) expect(isIndexableSoftware(path.slice("/software/".length)), path).toBe(true);
    }
  });
});
