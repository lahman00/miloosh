import { describe, expect, it } from "vitest";
import manifest from "@/public/community-traffic-manifest.json";
import { getSoftware } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getComparisonBySlug } from "@/lib/comparison";
import { isPublishedComparison } from "@/data/comparisons";

describe("community traffic manifest", () => {
  it("contains exactly 20 unique, contiguous, canonical Miloosh pages", () => {
    expect(manifest.pages).toHaveLength(20);
    expect(manifest.pages.map((page) => page.rank)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(new Set(manifest.pages.map((page) => page.slug)).size).toBe(20);
    for (const page of manifest.pages) {
      const routePrefix = page.page_type === "comparison" ? "compare" : "software";
      expect(page.url).toBe(`https://miloosh.com/${routePrefix}/${page.slug}`);
      expect(page.last_verification_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.recommended_use_case.length).toBeGreaterThan(20);
    }
  });

  it("references real software and curated substitution-valid comparisons", () => {
    for (const page of manifest.pages) {
      if (page.page_type === "software") {
        expect(getSoftware(page.slug), page.slug).toBeDefined();
        continue;
      }
      const comparison = getComparisonBySlug(page.slug);
      expect(comparison, page.slug).not.toBeNull();
      expect(isPublishedComparison(comparison!.softwareA.slug, comparison!.softwareB.slug), page.slug).toBe(true);
      expect(comparison!.softwareA.category, `${page.slug} must be a genuine same-category substitute`).toBe(comparison!.softwareB.category);
      expect(JSON.stringify(comparison), `${page.slug} must not render a comparison placeholder`).not.toContain("Not yet documented");
    }
  });

  it("keeps affiliate labels derived from operational truth rather than editorial rank", () => {
    for (const page of manifest.pages) {
      const activeSides = page.page_type === "software"
        ? Number(Boolean(getActivePartner(page.slug)))
        : [getComparisonBySlug(page.slug)!.softwareA.slug, getComparisonBySlug(page.slug)!.softwareB.slug]
            .filter((slug) => Boolean(getActivePartner(slug))).length;
      const expected = activeSides === 2 ? "both-active" : activeSides === 1 ? (page.page_type === "software" ? "active" : "one-side-active") : "inactive";
      expect(page.affiliate_status, page.slug).toBe(expected);
    }
  });

  it("has source-backed pricing and no comparison placeholder for every money page", () => {
    for (const page of manifest.pages) {
      const products = page.page_type === "software"
        ? [getSoftware(page.slug)!]
        : [getComparisonBySlug(page.slug)!.softwareA, getComparisonBySlug(page.slug)!.softwareB];
      for (const product of products) {
        expect(product.pricing?.status, `${page.slug}: ${product.slug}`).toMatch(/^(verified|contact_sales|free_only)$/);
        expect(product.pricing?.officialSource, `${page.slug}: ${product.slug}`).toMatch(/^https:\/\//);
        expect(product.pricing?.lastVerified, `${page.slug}: ${product.slug}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("locks the three P0 comparison routes and repaired pricing", () => {
    for (const slug of ["hubspot-vs-pipedrive", "zapier-vs-make", "intercom-vs-freshdesk"]) {
      expect(manifest.pages.some((page) => page.slug === slug && page.page_type === "comparison")).toBe(true);
    }
    expect(getSoftware("hubspot")!.pricing?.model).toBe("freemium");
    expect(getSoftware("make")!.pricing?.entryPaid?.amount).toBe("9");
  });
});
