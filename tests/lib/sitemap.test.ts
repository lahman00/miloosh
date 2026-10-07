import { describe, it, expect } from "vitest";
import sitemap, { COMPARISON_TEMPLATE_UPDATED_AT } from "@/app/sitemap";
import { getAllSoftware } from "@/data/software";
import { FIRST_REVENUE_CONTENT_UPDATED_AT, getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
import { getDecisionMoneyPage } from "@/data/growth/decision-money-pages";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import {
  GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS,
  GSC_SITEMAP_SUPPRESSED_COMPARISONS,
  shouldSubmitComparisonToSitemap,
} from "@/data/seo/gsc-sitemap-comparison-cohort";
import {
  isComparisonIndexingReady,
  isSoftwareIndexingReady,
} from "@/lib/indexing-quality";

describe("sitemap indexing-quality gate", () => {
  it("submits only software pages that pass the publication-quality gate", () => {
    const entries = sitemap();
    const software = getAllSoftware();

    for (const item of software) {
      const entry = entries.find((e) => e.url.endsWith(`/software/${item.slug}`));
      if (!isSoftwareIndexingReady(item)) {
        expect(entry, `${item.slug} should stay out of the sitemap until it passes the quality gate`).toBeUndefined();
        continue;
      }

      expect(entry?.lastModified, `${item.slug} is ready but missing from the sitemap`).toBeTruthy();
      const expected = getFirstRevenuePage(item.slug)
        ? [item.accessedAt, FIRST_REVENUE_CONTENT_UPDATED_AT].sort().at(-1)
        : item.accessedAt;
      expect(new Date(entry!.lastModified!).toISOString().slice(0, 10)).toBe(expected);
    }
  });

  it("submits a comparison only when discovery rules and both product quality gates pass", () => {
    const entries = sitemap();
    const allSoftware = getAllSoftware();
    const softwareBySlug = new Map(allSoftware.map((s) => [s.slug, s]));
    const comparisonUrls = new Set(
      entries.filter((e) => e.url.includes("/compare/")).map((e) => e.url)
    );

    const expectedPairs = PUBLISHED_COMPARISONS.filter(([slugA, slugB]) => {
      const a = softwareBySlug.get(slugA);
      const b = softwareBySlug.get(slugB);
      return Boolean(
        a &&
          b &&
          shouldSubmitComparisonToSitemap(getComparisonSlug(slugA, slugB)) &&
          isComparisonIndexingReady(a, b)
      );
    });

    expect(comparisonUrls.size).toBe(expectedPairs.length);

    for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
      const slug = getComparisonSlug(slugA, slugB);
      const a = softwareBySlug.get(slugA);
      const b = softwareBySlug.get(slugB);
      const shouldSubmit = Boolean(
        a &&
          b &&
          shouldSubmitComparisonToSitemap(slug) &&
          isComparisonIndexingReady(a, b)
      );
      const included = [...comparisonUrls].some((url) => url.endsWith(`/compare/${slug}`));
      expect(included, slug).toBe(shouldSubmit);
    }
  });

  it("gives every submitted comparison a real lastModified date including the 2026-10-07 template upgrade", () => {
    const entries = sitemap();
    const allSoftware = getAllSoftware();
    const softwareBySlug = new Map(allSoftware.map((s) => [s.slug, s]));

    for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
      const slug = getComparisonSlug(slugA, slugB);
      const entry = entries.find((e) => e.url.endsWith(`/compare/${slug}`));
      if (!entry) continue;

      const a = softwareBySlug.get(slugA)!;
      const b = softwareBySlug.get(slugB)!;
      const moneyPage = getDecisionMoneyPage(slug);
      const expected = [
        a.accessedAt,
        b.accessedAt,
        COMPARISON_TEMPLATE_UPDATED_AT,
        moneyPage?.updatedAt,
      ]
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1);

      expect(new Date(entry.lastModified!).toISOString().slice(0, 10)).toBe(expected);
    }
  });

  it("keeps the historical comparison suppression evidence while allowing only quality-ready priority overrides", () => {
    expect(GSC_SITEMAP_SUPPRESSED_COMPARISONS).toHaveLength(804);
    expect(GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS).toHaveLength(8);

    const entries = sitemap();
    const comparisonUrls = new Set(
      entries.filter((e) => e.url.includes("/compare/")).map((e) => e.url)
    );
    expect(comparisonUrls.has("https://miloosh.com/compare/notion-vs-confluence")).toBe(false);
  });

  it("keeps the five focused money comparisons submitted after their source pages pass the quality gate", () => {
    const entries = sitemap();
    const moneyPages = [
      "wix-vs-shopify",
      "monday-vs-airtable",
      "constant-contact-vs-getresponse",
      "mailerlite-vs-moosend",
      "surveymonkey-vs-jotform",
    ];

    for (const slug of moneyPages) {
      const entry = entries.find((e) => e.url.endsWith(`/compare/${slug}`));
      expect(entry?.lastModified, `${slug} should remain a quality-ready money page`).toBeTruthy();
      expect(new Date(entry!.lastModified!).toISOString().slice(0, 10)).toBe("2026-10-07");
    }
  });

  it("includes the public decision-guide hub", () => {
    const entries = sitemap();
    expect(entries.some((entry) => entry.url.endsWith("/guides"))).toBe(true);
  });

  it("never emits a future lastModified", () => {
    const entries = sitemap();
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.lastModified) continue;
      expect(new Date(entry.lastModified).getTime(), `${entry.url} has a future lastModified`).toBeLessThanOrEqual(now);
    }
  });
});
