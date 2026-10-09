import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { generateMetadata as softwareMetadata } from "@/app/software/[slug]/page";
import { generateMetadata as comparisonMetadata } from "@/app/compare/[comparison]/page";
import { isSoftwareIndexingReady } from "@/lib/indexing-quality";
import { getSoftware } from "@/data/software";
import {
  isComparisonDiscoverySuppressed,
  shouldSubmitComparisonToSitemap,
} from "@/data/seo/gsc-sitemap-comparison-cohort";

/**
 * Google treats a sitemap as a discovery hint; noindex is a separate,
 * stronger instruction. We deliberately do not auto-noindex every URL
 * excluded from the quality/discovery-focused sitemap.
 *
 * https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
 * https://developers.google.com/search/docs/crawling-indexing/block-indexing
 *
 * Any future mass noindex policy requires separately reviewed evidence
 * and a deliberate change to the policy/test; not a side effect of sitemap.
 */
describe("Miloosh sitemap versus noindex policy", () => {
  const urls = () => new Set(sitemap().map((entry) => entry.url));

  it("does not turn sitemap-excluded software into an automatic noindex", async () => {
    const discord = getSoftware("discord");
    expect(discord).toBeDefined();
    expect(isSoftwareIndexingReady(discord!)).toBe(false);
    expect(urls().has("https://miloosh.com/software/discord")).toBe(false);

    const metadata = await softwareMetadata({
      params: Promise.resolve({ slug: "discord" }),
    });
    expect(metadata.alternates?.canonical).toBe("/software/discord");
    expect(metadata.robots).toBeUndefined();
  });

  it("keeps suppression of comparison discovery distinct from noindex", async () => {
    const slug = "notion-vs-confluence";
    expect(isComparisonDiscoverySuppressed(slug)).toBe(true);
    expect(shouldSubmitComparisonToSitemap(slug)).toBe(false);
    expect(urls().has(`https://miloosh.com/compare/${slug}`)).toBe(false);

    const metadata = await comparisonMetadata({
      params: Promise.resolve({ comparison: slug }),
    });
    expect(metadata.alternates?.canonical).toBe(`/compare/${slug}`);
    expect(metadata.robots).toBeUndefined();
  });

  it("does not accidentally remove the discovery-priority comparison", async () => {
    const slug = "wix-vs-shopify";
    expect(shouldSubmitComparisonToSitemap(slug)).toBe(true);
    const metadata = await comparisonMetadata({
      params: Promise.resolve({ comparison: slug }),
    });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(`/compare/${slug}`);
  });
});
