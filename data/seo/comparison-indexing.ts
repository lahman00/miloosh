import type { Metadata } from "next";
import { isComparisonDiscoverySuppressed } from "@/data/seo/gsc-sitemap-comparison-cohort";

/**
 * Search-indexing policy for published comparison pages.
 *
 * The historical suppression cohort already stays out of the sitemap and
 * high-authority discovery surfaces because it failed to earn Search
 * visibility during the original GSC observation window. Keep those pages
 * live and crawlable for readers and internal navigation, but prevent them
 * from occupying Google's index until editorial evidence explicitly promotes
 * them back into the active discovery cohort.
 */
export function getComparisonRobotsMetadata(
  comparisonSlug: string,
): Metadata["robots"] | undefined {
  return isComparisonDiscoverySuppressed(comparisonSlug)
    ? {
        index: false,
        follow: true,
      }
    : undefined;
}
