import type { Software } from "@/data/software";
import { getAllSoftware } from "@/data/software";
import { getComparisonsInvolving } from "@/data/comparisons";

/**
 * Software not already shown as a direct alternative on this page.
 *
 * Prefer products that already have a published head-to-head comparison with
 * the current product, then other products in the same category. This keeps
 * "Compare other tools" relevant instead of falling back to the first catalog
 * entries (which previously produced unrelated links such as Notion/Slack on
 * developer-tool pages).
 */
export function getRelatedSoftware(software: Software, limit = 3): Software[] {
  const directAlternativeSlugs = new Set(software.alternatives.map((alt) => alt.slug));
  const allSoftware = getAllSoftware();
  const bySlug = new Map(allSoftware.map((item) => [item.slug, item]));
  const eligible = allSoftware.filter(
    (item) => item.slug !== software.slug && !directAlternativeSlugs.has(item.slug),
  );
  const eligibleSlugs = new Set(eligible.map((item) => item.slug));

  const comparisonPeers = getComparisonsInvolving(software.slug)
    .map(([slugA, slugB]) => (slugA === software.slug ? slugB : slugA))
    .filter((slug, index, peers) => eligibleSlugs.has(slug) && peers.indexOf(slug) === index)
    .map((slug) => bySlug.get(slug))
    .filter((item): item is Software => Boolean(item));

  const comparisonPeerSlugs = new Set(comparisonPeers.map((item) => item.slug));
  const sameCategory = eligible.filter(
    (item) => item.category === software.category && !comparisonPeerSlugs.has(item.slug),
  );
  const used = new Set([...comparisonPeerSlugs, ...sameCategory.map((item) => item.slug)]);
  const otherCategories = eligible.filter((item) => !used.has(item.slug));

  return [...comparisonPeers, ...sameCategory, ...otherCategories].slice(0, limit);
}

/** All software belonging to a given category slug, for /category/[slug]. */
export function getSoftwareByCategory(categorySlug: string): Software[] {
  return getAllSoftware().filter((item) => item.category === categorySlug);
}

/**
 * "Popular" is defined as: most often listed as another tool's alternative
 * in this dataset. It's a real, computed number from our own data — not a
 * rating or review count we don't have.
 */
export function getPopularAlternatives(limit = 5): Software[] {
  const allSoftware = getAllSoftware();
  const mentionCounts = new Map<string, number>();

  for (const software of allSoftware) {
    for (const alternative of software.alternatives) {
      mentionCounts.set(alternative.slug, (mentionCounts.get(alternative.slug) ?? 0) + 1);
    }
  }

  return [...allSoftware]
    .sort((a, b) => (mentionCounts.get(b.slug) ?? 0) - (mentionCounts.get(a.slug) ?? 0))
    .slice(0, limit);
}
