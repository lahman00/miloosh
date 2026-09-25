import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LEGAL_PAGES } from "@/lib/legal";
import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { getAllRoleGuides } from "@/data/guides/registry";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { shouldSubmitComparisonToSitemap } from "@/data/seo/gsc-sitemap-comparison-cohort";
import { getDecisionMoneyPage } from "@/data/growth/decision-money-pages";
import { FIRST_REVENUE_CONTENT_UPDATED_AT, getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — real finding:
 * every one of this sitemap's 1,526 entries had zero <lastmod>, the
 * signal Google's own docs say helps crawlers prioritize what to
 * (re)crawl. Not fabricated: software.accessedAt (100% real coverage,
 * every catalog entry) and guide.updatedAt (100% coverage) are genuine
 * per-entry "when was this content last verified/touched" facts already
 * tracked in the data. A comparison or category page's true freshness is
 * the MORE RECENT of its constituent products' accessedAt dates — its
 * rendered content changes whenever either input does.
 */
function toDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

function latestOf(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const allSoftware = getAllSoftware();
  const softwareBySlug = new Map(allSoftware.map((s) => [s.slug, s]));

  const softwarePages: MetadataRoute.Sitemap = allSoftware.map((software) => ({
    url: `${SITE_URL}/software/${software.slug}`,
    lastModified: getFirstRevenuePage(software.slug)
      ? latestOf([toDate(software.accessedAt), toDate(FIRST_REVENUE_CONTENT_UPDATED_AT)])
      : toDate(software.accessedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = getAllCategories().map((category) => {
    const membersAccessedAt = allSoftware.filter((s) => s.category === category.slug).map((s) => toDate(s.accessedAt));
    return {
      url: `${SITE_URL}/category/${category.slug}`,
      ...(membersAccessedAt.length > 0 ? { lastModified: latestOf(membersAccessedAt) } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  const roleGuidePages: MetadataRoute.Sitemap = getAllRoleGuides().map((guide) => ({
    url: `${SITE_URL}/${guide.slug}`,
    lastModified: toDate(guide.updatedAt),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  const comparisonPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.7 },
    ...PUBLISHED_COMPARISONS.filter(([slugA, slugB]) =>
      shouldSubmitComparisonToSitemap(getComparisonSlug(slugA, slugB))
    ).map(([slugA, slugB]) => {
      const softwareA = softwareBySlug.get(slugA);
      const softwareB = softwareBySlug.get(slugB);
      const comparisonSlug = getComparisonSlug(slugA, slugB);
      const moneyPage = getDecisionMoneyPage(comparisonSlug);
      const dates = [softwareA, softwareB]
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => toDate(s.accessedAt));
      if (moneyPage) dates.push(toDate(moneyPage.updatedAt));
      return {
        url: `${SITE_URL}/compare/${comparisonSlug}`,
        ...(dates.length > 0 ? { lastModified: latestOf(dates) } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.75,
      };
    }),
  ];

  // Every legal/trust page (Privacy, Terms, Disclaimer, Affiliate
  // Disclosure, Editorial Policy, Sources Policy, Corrections Policy, AI
  // Usage Disclosure, Accessibility Statement, Cookie Policy, Trademark
  // Notice) is added here automatically via lib/legal.ts's shared list —
  // a new legal page only needs to be added there once.
  const legalPages: MetadataRoute.Sitemap = LEGAL_PAGES.map((page) => ({
    url: `${SITE_URL}${page.href}`,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.8 },
    // /recommend/results is excluded — it's query-param-driven and marked
    // noindex on the page itself; every answer combination would otherwise
    // look like near-duplicate content to a crawler.
    { url: `${SITE_URL}/recommend`, changeFrequency: "monthly", priority: 0.9 },
    // MILOOSH PEOPLE NOW mission (2026-08-23) — the first linkable tool and
    // the newsletter landing page. /newsletter/unsubscribe is correctly
    // excluded (already noindex on the page itself, and query-param-driven
    // per-token content the same way /recommend/results is).
    { url: `${SITE_URL}/tools/saas-cost-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/newsletter`, changeFrequency: "monthly", priority: 0.5 },
    // MILOOSH WAR MODE mission (2026-08-24) — the PR data asset. Weekly
    // since the underlying pricing dataset is re-verified continuously.
    { url: `${SITE_URL}/research/saas-pricing-pressure-index-2026`, changeFrequency: "weekly", priority: 0.8 },
  ];

  return [...staticPages, ...categoryPages, ...roleGuidePages, ...softwarePages, ...comparisonPages, ...legalPages];
}
