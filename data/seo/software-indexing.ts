import type { Metadata } from "next";
import { isSoftwareIndexingSuppressed } from "@/data/seo/software-indexing-cohort";

/**
 * Render-level robots policy for software pages.
 *
 * Suppressed pages remain useful to readers and continue to pass link equity
 * through internal navigation, but are deliberately kept out of Google's
 * index until they earn a fresh search signal or receive page-specific
 * editorial depth.
 */
export function getSoftwareRobotsMetadata(
  softwareSlug: string,
): Metadata["robots"] | undefined {
  return isSoftwareIndexingSuppressed(softwareSlug)
    ? {
        index: false,
        follow: true,
      }
    : undefined;
}
