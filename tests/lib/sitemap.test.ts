import { describe, it, expect } from "vitest";
import sitemap, { COMPARISON_TEMPLATE_UPDATED_AT, parseLongDate } from "@/app/sitemap";
import { getAllRoleGuides } from "@/data/guides/registry";
import { getDataFreshness } from "@/lib/freshness";
import { LEGAL_LAST_UPDATED, LEGAL_PAGES } from "@/lib/legal";
import { buildPricingIndex } from "@/lib/pricing-index/build";
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

describe("sitemap lastmod on hubs, tools and legal pages", () => {
  const entries = () => sitemap();
  const day = (value: Date | string | number | undefined) => (value === undefined ? undefined : new Date(value).toISOString().slice(0, 10));
  // SITE_URL is localhost under test, so entries are matched by path.
  const pathOf = (url: string) => new URL(url).pathname;
  const entryFor = (path: string) => entries().find((entry) => pathOf(entry.url) === path);

  it("reads the long dates the legal pages print", () => {
    expect(day(parseLongDate("July 31, 2026"))).toBe("2026-07-31");
    expect(day(parseLongDate("  January 1, 2027 "))).toBe("2027-01-01");
    expect(parseLongDate("2026-07-31")).toBeUndefined();
    expect(parseLongDate("Smarch 3, 2026")).toBeUndefined();
    expect(parseLongDate("")).toBeUndefined();
  });

  it("dates the home page and the comparison hub by the latest verification in the catalog", () => {
    const latest = getDataFreshness().latestAccessedAt;
    expect(day(entryFor("/")?.lastModified)).toBe(latest);
    expect(day(entryFor("/compare")?.lastModified)).toBe(latest);
  });

  it("dates the guides hub by the newest guide update", () => {
    const newest = getAllRoleGuides().map((guide) => guide.updatedAt).sort().at(-1);
    expect(day(entryFor("/guides")?.lastModified)).toBe(newest);
  });

  it("dates the calculator by the latest pricing check behind it and the report by its own latest source check", () => {
    const checks = getAllSoftware().flatMap((s) => (s.pricing?.entryPaid && s.pricing.lastVerified ? [s.pricing.lastVerified] : [])).sort();
    expect(day(entryFor("/tools/saas-cost-calculator")?.lastModified)).toBe(checks.at(-1));
    expect(day(entryFor("/research/saas-pricing-pressure-index-2026")?.lastModified)).toBe(buildPricingIndex().verificationWindow.latest);
  });

  it("dates every legal page by the 'Last updated' date those pages print", () => {
    const expected = day(parseLongDate(LEGAL_LAST_UPDATED));
    expect(expected).toBeDefined();
    for (const page of LEGAL_PAGES) expect(day(entryFor(page.href)?.lastModified), page.href).toBe(expected);
  });

  it("leaves lastmod off the pages that have no data-derived date, instead of inventing one", () => {
    for (const path of ["/about", "/contact", "/newsletter", "/recommend"]) {
      expect(entryFor(path), path).toBeDefined();
      expect(entryFor(path)?.lastModified, path).toBeUndefined();
    }
  });

  it("leaves no page of the sitemap without a date except those four", () => {
    const undated = entries().filter((entry) => !entry.lastModified).map((entry) => pathOf(entry.url));
    expect(undated.sort()).toEqual(["/about", "/contact", "/newsletter", "/recommend"]);
  });
});
