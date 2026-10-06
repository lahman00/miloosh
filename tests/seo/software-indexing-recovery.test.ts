import { describe, expect, it } from "vitest";
import {
  SOFTWARE_INDEXING_REPAIR_PRIORITY_SLUGS,
  SOFTWARE_INDEXING_SUPPRESSED_SLUGS,
  isSoftwareIndexingSuppressed,
  shouldSubmitSoftwareToSitemap,
} from "@/data/seo/software-indexing-cohort";
import { getSoftwareRobotsMetadata } from "@/data/seo/software-indexing";

describe("software indexation recovery policy", () => {
  it("keeps the cohort bounded to the 146 evidence-reviewed generic pages", () => {
    expect(SOFTWARE_INDEXING_SUPPRESSED_SLUGS).toHaveLength(146);
    expect(new Set(SOFTWARE_INDEXING_SUPPRESSED_SLUGS).size).toBe(146);
  });

  it("noindexes generic pages that lost or never earned search signal while keeping links followable", () => {
    for (const slug of ["basecamp", "figma", "google-chat", "apollo-io"]) {
      expect(isSoftwareIndexingSuppressed(slug)).toBe(true);
      expect(shouldSubmitSoftwareToSitemap(slug)).toBe(false);
      expect(getSoftwareRobotsMetadata(slug)).toEqual({
        index: false,
        follow: true,
      });
    }
  });

  it("keeps current-signal, editorially enhanced, and recent-grace pages indexable", () => {
    for (const slug of ["fullstory", "semrush", "wrike", "trainual", "shopify"]) {
      expect(isSoftwareIndexingSuppressed(slug)).toBe(false);
      expect(shouldSubmitSoftwareToSitemap(slug)).toBe(true);
      expect(getSoftwareRobotsMetadata(slug)).toBeUndefined();
    }
  });

  it("records a finite repair queue for lost-signal and active-partner pages", () => {
    expect(SOFTWARE_INDEXING_REPAIR_PRIORITY_SLUGS).toHaveLength(28);
    expect(SOFTWARE_INDEXING_REPAIR_PRIORITY_SLUGS).toContain("basecamp");
    expect(SOFTWARE_INDEXING_REPAIR_PRIORITY_SLUGS).toContain("apollo-io");
    expect(SOFTWARE_INDEXING_REPAIR_PRIORITY_SLUGS).toContain("fireflies-ai");
    expect(SOFTWARE_INDEXING_REPAIR_PRIORITY_SLUGS).toContain("jotform");
  });
});
