import type { Software } from "@/data/software";
import type { Category } from "@/data/categories";
import { getAllSoftware, getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";

/**
 * Content forensics (2026-08-10) flagged category pages as "just a list"
 * — a static one-line description plus a card grid, no synthesis of what
 * actually varies across the category's members. This computes a real,
 * grounded second sentence from data every category member already has
 * (validate:data requires a non-empty `platforms` array), rather than an
 * editorial claim about which tools are "best."
 */
export function generateCategorySynthesis(category: Category, members: Software[]): string {
  if (members.length === 0) return category.description;

  const webCount = members.filter((m) => m.platforms?.includes("Web")).length;
  const mobileCount = members.filter((m) => m.platforms?.includes("iOS") && m.platforms?.includes("Android")).length;
  const desktopCount = members.filter((m) => m.platforms?.includes("Windows") || m.platforms?.includes("macOS")).length;

  const parts: string[] = [];
  if (webCount > 0) parts.push(`${webCount} of ${members.length} run in the browser`);
  if (mobileCount > 0) parts.push(`${mobileCount} have native iOS and Android apps`);
  if (desktopCount > 0) parts.push(`${desktopCount} also ship Windows and/or macOS desktop apps`);

  if (parts.length === 0) return category.description;

  return `${category.description} Of the ${members.length} tools tracked here, ${parts.join("; ")} — platform support sourced from each vendor's own site.`;
}

export type FeaturedCategoryComparison = {
  slugA: string;
  slugB: string;
  softwareA: Software;
  softwareB: Software;
  comparisonSlug: string;
  bothInCat: boolean;
  isDirectAlt: boolean;
  score: number;
};

/**
 * Derives a curated, deterministically ranked set of featured comparisons
 * for a category page.
 *
 * Ranking criteria (editorial usefulness only -- affiliate/commercial
 * status is never a scoring input, see below):
 * 1. Intra-category relevance: both tools belong to this category (+100 pts).
 * 2. Mutual / direct alternative relationship (+50 pts).
 * 3. Information richness: combined feature depth (+0-20 pts).
 *
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) P0-3: this function
 * used to add `activeCount * 5` to the score (up to +10 for a pair where
 * both sides were active affiliate partners), a real, measurable
 * affiliate-status influence on featured-comparison selection and
 * ordering across 9 categories -- removed entirely, along with the
 * ACTIVE_PARTNERS import and the now-meaningless `ignoreAffiliateStatus`
 * option that used to let a caller compute the (previously different)
 * affiliate-free ranking for comparison. There is no longer an
 * affiliate-free variant to compute, because there is no affiliate
 * signal in this function at all -- see
 * tests/category/featured-comparisons.test.ts's editorial-independence
 * test, which now asserts exact order/identity, not just matching
 * length, against a scoring function with ACTIVE_PARTNERS emptied out
 * entirely (there being nothing left to disable in this file itself).
 */
export function getCategoryFeaturedComparisons(
  categorySlug: string,
  limit = 6
): FeaturedCategoryComparison[] {
  const allSoftware = getAllSoftware();
  const catProds = allSoftware.filter((s) => s.category === categorySlug);
  const catSlugs = new Set(catProds.map((s) => s.slug));

  const comparisons = PUBLISHED_COMPARISONS.filter(
    ([slugA, slugB]) => catSlugs.has(slugA) || catSlugs.has(slugB)
  )
    .map(([slugA, slugB]) => {
      const softwareA = getSoftware(slugA);
      const softwareB = getSoftware(slugB);
      if (!softwareA || !softwareB) return null;

      const bothInCat = catSlugs.has(slugA) && catSlugs.has(slugB);
      const isDirectAlt = Boolean(
        softwareA.alternatives?.some((alt) => alt.slug === slugB) ||
        softwareB.alternatives?.some((alt) => alt.slug === slugA)
      );
      const featureDepth = (softwareA.features?.length || 0) + (softwareB.features?.length || 0);

      let score = 0;
      if (bothInCat) score += 100;
      if (isDirectAlt) score += 50;
      score += Math.min(20, featureDepth);

      return {
        slugA,
        slugB,
        softwareA,
        softwareB,
        comparisonSlug: getComparisonSlug(slugA, slugB),
        bothInCat,
        isDirectAlt,
        score,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  comparisons.sort((a, b) => b.score - a.score || a.comparisonSlug.localeCompare(b.comparisonSlug));
  return comparisons.slice(0, limit);
}
