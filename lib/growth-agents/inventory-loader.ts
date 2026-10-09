import sitemap from "@/app/sitemap";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAllRoleGuides } from "@/data/guides/registry";
import { getAlternativeGuide } from "@/data/seo/alternative-guides";
import { getBuyerChecklist } from "@/data/seo/buyer-checklists";
import { getAllSoftware } from "@/data/software";
import { LEGAL_PAGES } from "@/lib/legal";
import { buildSiteInventory, sitemapPathsFromEntries, type SiteInventory } from "./inventory";

/**
 * Read-only adapter: gathers the real registries of the checked-out code into a SiteInventory.
 * Importing the sitemap builder runs `getAllSoftware()` and the indexing-quality gate, exactly as the site does.
 */
export function loadSiteInventory(options: { checkoutSha: string; now: Date }): SiteInventory {
  return buildSiteInventory({
    checkoutSha: options.checkoutSha,
    now: options.now,
    software: getAllSoftware(),
    comparisons: PUBLISHED_COMPARISONS,
    comparisonSlug: getComparisonSlug,
    categories: getAllCategories().map((category) => ({ slug: category.slug, name: category.name })),
    guideSlugs: getAllRoleGuides().map((guide) => guide.slug),
    legalPaths: LEGAL_PAGES.map((page) => page.href),
    sitemapPaths: sitemapPathsFromEntries(sitemap()),
    // The software page renders a "Visit <product>" call to action for these, exactly as the page components do.
    otherCtaSlugsOf: (slug) => [...(getBuyerChecklist(slug)?.options.map((option) => option.slug) ?? []), ...(getAlternativeGuide(slug)?.decisions.map((decision) => decision.alternativeSlug) ?? [])],
  });
}
