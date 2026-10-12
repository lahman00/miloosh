import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { generateMetadata as comparisonMetadata } from "@/app/compare/[comparison]/page";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS, isComparisonDiscoverySuppressed } from "@/data/seo/gsc-sitemap-comparison-cohort";
import {
  UNREACHABLE_COMPARISON_DEFERRALS,
  UNREACHABLE_SUPPRESSED_COMPARISONS,
  isUnreachableAndSuppressed,
  isUnreachableSuppressedComparison,
} from "@/data/seo/unreachable-comparisons";

/**
 * Comparison pages that no crawler can find (outside the sitemap, linked from nowhere reachable) are taken out of
 * the index. Owner decision of 2026-10-12, recorded in data/seo/unreachable-comparisons.ts. The generic policy
 * (sitemap exclusion is not noindex) is locked in sitemap-vs-noindex-policy.test.ts and still holds for every
 * suppressed page that is reachable.
 */
const published = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b)));
const meta = (slug: string) => comparisonMetadata({ params: Promise.resolve({ comparison: slug }) });

describe("the unreachable comparison list", () => {
  it("holds only published comparison pages, sorted and without duplicates", () => {
    const slugs = [...UNREACHABLE_SUPPRESSED_COMPARISONS];
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter((slug) => !published.has(slug))).toEqual([]);
    expect(slugs).toEqual([...new Set(slugs)].sort());
  });

  it("never lists a deferred page, and each deferral names a published page, a real date and a reason", () => {
    for (const [slug, deferral] of Object.entries(UNREACHABLE_COMPARISON_DEFERRALS)) {
      expect(UNREACHABLE_SUPPRESSED_COMPARISONS).not.toContain(slug);
      expect(published.has(slug), slug).toBe(true);
      expect(deferral.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(deferral.until))).toBe(false);
      expect(deferral.reason.length).toBeGreaterThan(20);
    }
  });
});

describe("noindex for unreachable comparisons", () => {
  const sample = UNREACHABLE_SUPPRESSED_COMPARISONS.filter((slug) => isComparisonDiscoverySuppressed(slug))[0]!;

  it("gives a listed, suppressed page noindex, follow while keeping its own canonical URL", async () => {
    expect(isUnreachableSuppressedComparison(sample)).toBe(true);
    const metadata = await meta(sample);
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(`/compare/${sample}`);
  });

  it("sets robots on exactly the pages the rule selects, across every published comparison", async () => {
    const mismatches: string[] = [];
    for (const slug of published) {
      const robots = (await meta(slug)).robots;
      if (isUnreachableSuppressedComparison(slug) !== (robots !== undefined && robots !== null)) mismatches.push(slug);
    }
    expect(mismatches).toEqual([]);
  });

  it("leaves reachable suppressed pages and the discovery-priority pages indexable", async () => {
    expect((await meta("notion-vs-confluence")).robots).toBeUndefined();
    for (const slug of GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS) expect((await meta(slug)).robots).toBeUndefined();
  });

  it("leaves a deferred page alone", async () => {
    for (const slug of Object.keys(UNREACHABLE_COMPARISON_DEFERRALS)) expect((await meta(slug)).robots).toBeUndefined();
  });

  it("lifts itself when a pair is promoted out of suppression, with no edit to the list", () => {
    const listed = new Set([sample]);
    expect(isUnreachableAndSuppressed(sample, listed, () => true)).toBe(true);
    expect(isUnreachableAndSuppressed(sample, listed, () => false)).toBe(false);
    expect(isUnreachableAndSuppressed("other-vs-pair", listed, () => true)).toBe(false);
  });

  it("never lists a page that the sitemap submits", () => {
    const submitted = new Set(sitemap().map((entry) => new URL(entry.url).pathname));
    expect([...UNREACHABLE_SUPPRESSED_COMPARISONS].filter((slug) => isUnreachableSuppressedComparison(slug) && submitted.has(`/compare/${slug}`))).toEqual([]);
  });
});
