import { BUYER_DEPTH_CONTENT_UPDATED_AT, BUYER_DEPTH_GUIDE_PATHS } from "@/data/seo/buyer-depth-checklists";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { SITE_URL } from "@/lib/site";
import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { getAllRoleGuides } from "@/data/guides/registry";
import { FIRST_REVENUE_SUPPORTING_GUIDES } from "@/data/guides/first-revenue";
import { FIRST_REVENUE_CONTENT_UPDATED_AT } from "@/data/revenue/first-revenue-cohort";
import { PUBLISHED_COMPARISONS, getPublishedComparisonSlugs } from "@/data/comparisons";
import { REMOVED_COMPARISON_REDIRECTS } from "@/data/redirects";
import { LEGAL_PAGES } from "@/lib/legal";
import { RESEARCH_PATHS } from "@/lib/analytics/research";

describe("crawl inventory contract", () => {
  const entries = sitemap();
  const paths = entries.map((entry) => new URL(entry.url).pathname);
  const software = getAllSoftware();
  const softwarePaths = new Set(software.map((item) => `/software/${item.slug}`));
  const comparisons = getPublishedComparisonSlugs();
  const guides = getAllRoleGuides();

  it("has exactly one normalized URL per submitted route", () => {
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    for (const entry of entries) {
      const url = new URL(entry.url);
      expect(url.origin).toBe(SITE_URL);
      expect(url.search + url.hash).toBe("");
      expect(url.pathname === "/" || !url.pathname.endsWith("/")).toBe(true);
      expect(url.pathname).not.toMatch(/\/\/|%/);
    }
  });

  it("submits only existing public pages, excluding retired and query-driven routes", () => {
    const known = new Set([
      "/", "/about", "/contact", "/guides", "/compare", "/recommend", "/newsletter",
      "/tools/saas-cost-calculator", ...RESEARCH_PATHS,
      ...softwarePaths, ...comparisons.map((slug) => `/compare/${slug}`),
      ...guides.map((guide) => `/${guide.slug}`),
      ...getAllCategories().map((category) => `/category/${category.slug}`),
      ...LEGAL_PAGES.map((page) => page.href),
    ]);
    for (const path of paths) expect(known.has(path), path).toBe(true);
    for (const [retired, target] of REMOVED_COMPARISON_REDIRECTS) {
      expect(paths).not.toContain(`/compare/${retired}`);
      expect(comparisons).not.toContain(retired);
      expect(softwarePaths.has(`/software/${target}`), target).toBe(true);
    }
    expect(paths.some((path) => /^\/(internal|api)(\/|$)/.test(path))).toBe(false);
    expect(paths).not.toContain("/recommend/results");
    expect(paths).not.toContain("/newsletter/unsubscribe");
  });

  it("keeps primary and supporting pages discoverable without expanding the cohort", () => {
    expect(FIRST_REVENUE_SUPPORTING_GUIDES).toHaveLength(5);
    for (const { primarySlug, guideSlug } of FIRST_REVENUE_SUPPORTING_GUIDES) {
      expect(paths).toContain(`/software/${primarySlug}`);
      expect(paths).toContain(`/${guideSlug}`);
    }
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(robots().rules).toEqual({ userAgent: "*", allow: "/", disallow: "/internal/" });
  });

  it("has no duplicate or reversed comparison owners", () => {
    const unordered = PUBLISHED_COMPARISONS.map((pair) => [...pair].sort().join("|"));
    expect(new Set(unordered).size).toBe(unordered.length);
  });

  it("uses explicit guide dates and constituent category dates, never build time", () => {
    const dates = new Map(entries.map((entry) => [new URL(entry.url).pathname,
      entry.lastModified ? new Date(entry.lastModified).toISOString().slice(0, 10) : null]));
    for (const guide of guides) {
      const isSupport = FIRST_REVENUE_SUPPORTING_GUIDES.some((support) => support.guideSlug === guide.slug);
      const expected = [
        guide.updatedAt,
        ...(isSupport ? [FIRST_REVENUE_CONTENT_UPDATED_AT] : []),
        ...(BUYER_DEPTH_GUIDE_PATHS.some(path => path === `/${guide.slug}`) ? [BUYER_DEPTH_CONTENT_UPDATED_AT] : []),
      ].sort().at(-1);
      expect(dates.get(`/${guide.slug}`)).toBe(expected);
    }
    for (const category of getAllCategories()) {
      const latest = software.filter((item) => item.category === category.slug).map((item) => item.accessedAt).sort().at(-1);
      expect(dates.get(`/category/${category.slug}`)).toBe(latest ?? null);
    }
    expect(dates.get("/")).toBeNull();
  });
});
