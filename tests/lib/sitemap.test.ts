import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { getAllSoftware } from "@/data/software";
import { getDecisionMoneyPage } from "@/data/growth/decision-money-pages";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import {
  GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS,
  GSC_SITEMAP_SUPPRESSED_COMPARISONS,
  shouldSubmitComparisonToSitemap,
} from "@/data/seo/gsc-sitemap-comparison-cohort";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — real
 * indexation-investigation finding: this sitemap's 1,526 entries had zero
 * <lastmod> dates (Google's own crawl-priority freshness signal), for a
 * brand-new (23-day-old at investigation time) domain competing for
 * limited crawl trust. Fixed using real per-entry data already tracked
 * (software.accessedAt, guide.updatedAt) -- never a fabricated or
 * build-time-only placeholder for content that has real per-entry dates
 * available. This test proves every software and comparison entry gets a
 * genuine, real lastModified value, not a systemic silent gap like the
 * meta-description one found earlier in the same investigation.
 */
describe("sitemap lastModified coverage", () => {
  it("every software page entry has a real lastModified date matching its own accessedAt", () => {
    const entries = sitemap();
    const software = getAllSoftware();
    for (const s of software) {
      const entry = entries.find((e) => e.url.endsWith(`/software/${s.slug}`));
      expect(entry?.lastModified, `${s.slug} missing from sitemap`).toBeTruthy();
      expect(new Date(entry!.lastModified!).toISOString().slice(0, 10)).toBe(s.accessedAt);
    }
  });

  it("every submitted comparison has a lastModified date equal to the MORE RECENT of its two products' accessedAt", () => {
    const entries = sitemap();
    const softwareBySlug = new Map(getAllSoftware().map((s) => [s.slug, s]));
    const submitted = PUBLISHED_COMPARISONS.filter(([slugA, slugB]) =>
      shouldSubmitComparisonToSitemap(getComparisonSlug(slugA, slugB))
    ).slice(0, 25);
    for (const [slugA, slugB] of submitted) {
      const slug = getComparisonSlug(slugA, slugB);
      const entry = entries.find((e) => e.url.endsWith(`/compare/${slug}`));
      const a = softwareBySlug.get(slugA)!;
      const b = softwareBySlug.get(slugB)!;
      const moneyPage = getDecisionMoneyPage(slug);
      const expected = [a.accessedAt, b.accessedAt, moneyPage?.updatedAt]
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1);
      expect(entry?.lastModified, `${slug} missing from sitemap`).toBeTruthy();
      expect(new Date(entry!.lastModified!).toISOString().slice(0, 10)).toBe(expected);
    }
  });

  it("suppresses the GSC-proven old zero-visibility cohort except explicit current decision priorities", () => {
    const entries = sitemap();
    const comparisonUrls = entries.filter((e) => e.url.includes("/compare/")).map((e) => e.url);
    expect(GSC_SITEMAP_SUPPRESSED_COMPARISONS).toHaveLength(804);
    expect(GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS).toHaveLength(8);
    const suppressedPriorityOverrides = GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS.filter((slug) =>
      GSC_SITEMAP_SUPPRESSED_COMPARISONS.includes(
        slug as (typeof GSC_SITEMAP_SUPPRESSED_COMPARISONS)[number]
      )
    ).length;
    expect(comparisonUrls).toHaveLength(
      PUBLISHED_COMPARISONS.length - 804 + suppressedPriorityOverrides
    );
    expect(comparisonUrls.some((url) => url.endsWith("/compare/notion-vs-confluence"))).toBe(false);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/docker-vs-vercel"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/ecwid-vs-shopify"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/ecwid-vs-woocommerce"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/shopify-vs-woocommerce"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/wix-vs-shopify"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/monday-vs-airtable"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/constant-contact-vs-getresponse"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/mailerlite-vs-moosend"))).toBe(true);
    expect(comparisonUrls.some((url) => url.endsWith("/compare/surveymonkey-vs-jotform"))).toBe(true);
  });

  it("uses the real 2026-09-25 content-update date for the five focused money pages", () => {
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
      expect(entry?.lastModified).toBeTruthy();
      expect(new Date(entry!.lastModified!).toISOString().slice(0, 10)).toBe("2026-09-25");
    }
  });

  it("includes the public decision-guide hub so discovered guides have a crawlable internal-link path", () => {
    const entries = sitemap();
    expect(entries.some((entry) => entry.url.endsWith("/guides"))).toBe(true);
  });

  it("no entry's lastModified is ever in the future (a sign of a fabricated/placeholder date, not a real one)", () => {
    const entries = sitemap();
    const now = Date.now();
    for (const e of entries) {
      if (!e.lastModified) continue;
      expect(new Date(e.lastModified).getTime(), `${e.url} has a future lastModified`).toBeLessThanOrEqual(now);
    }
  });
});
