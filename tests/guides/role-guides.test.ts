import { describe, expect, it } from "vitest";
import { getAllRoleGuides, getRoleGuide, getRoleGuidesForCategory, getRoleGuidesForSoftware } from "@/data/guides/registry";
import { getSoftware } from "@/data/software";
import { getCategory } from "@/data/categories";
import { isPublishedComparison } from "@/data/comparisons";

describe("Role & Use-Case Software Engine", () => {
  const guides = getAllRoleGuides();

  it("contains at least 30 curated high-intent role guides", () => {
    expect(guides.length).toBeGreaterThanOrEqual(30);
  });

  it("ensures every guide has a unique slug and non-empty metadata", () => {
    const slugs = new Set<string>();
    for (const guide of guides) {
      expect(slugs.has(guide.slug)).toBe(false);
      slugs.add(guide.slug);

      expect(guide.title.length).toBeGreaterThan(10);
      expect(guide.headline.length).toBeGreaterThan(15);
      expect(guide.metaDescription.length).toBeGreaterThan(50);
      expect(guide.intro.length).toBeGreaterThan(50);
      expect(guide.targetAudience.length).toBeGreaterThanOrEqual(2);
      expect(guide.keyCriteria.length).toBeGreaterThanOrEqual(3);
      expect(guide.products.length).toBeGreaterThanOrEqual(3);
      expect(guide.faqs.length).toBeGreaterThanOrEqual(1);

      // Verify category exists
      const cat = getCategory(guide.categorySlug);
      expect(cat).toBeDefined();
    }
  });

  it("verifies all referenced products exist in the software catalog", () => {
    for (const guide of guides) {
      for (const item of guide.products) {
        const software = getSoftware(item.slug);
        expect(software, `Software ${item.slug} in guide ${guide.slug} must exist`).toBeDefined();
        expect(item.badge.length).toBeGreaterThan(3);
        expect(item.fitReason.length).toBeGreaterThan(20);
        expect(item.limitations.length).toBeGreaterThan(10);
      }
    }
  });

  it("verifies all related comparisons exist in PUBLISHED_COMPARISONS", () => {
    for (const guide of guides) {
      for (const compSlug of guide.comparisons) {
        const parts = compSlug.split("-vs-");
        expect(parts).toHaveLength(2);
        const [slugA, slugB] = parts;
        const exists = isPublishedComparison(slugA!, slugB!) || isPublishedComparison(slugB!, slugA!);
        expect(exists, `Comparison ${compSlug} in guide ${guide.slug} must be published`).toBe(true);
      }
    }
  });

  it("keeps every Pipedrive entry's pricingNote traceable to the current catalog tiers, not stale tier names", () => {
    const pipedrive = getSoftware("pipedrive")!;
    const tierNames = new Set(pipedrive.pricing?.tiers?.map((t) => t.name));
    expect(tierNames).toEqual(new Set(["Lite", "Growth", "Premium", "Ultimate"]));
    for (const guide of getRoleGuidesForSoftware("pipedrive")) {
      const entry = guide.products.find((p) => p.slug === "pipedrive")!;
      if (!entry.pricingNote) continue;
      expect(entry.pricingNote).not.toContain("Essential $");
      expect(entry.pricingNote).not.toContain("Advanced $");
      expect(entry.fitReason + entry.limitations).not.toMatch(/widely favored|fraction of the cost/i);
    }
  });

  it("tests helper lookup functions getRoleGuide, getRoleGuidesForCategory, getRoleGuidesForSoftware", () => {
    const agencyGuide = getRoleGuide("best-time-tracking-for-agencies");
    expect(agencyGuide).toBeDefined();
    expect(agencyGuide?.roleName).toBe("Creative & Digital Agencies");

    const productivityGuides = getRoleGuidesForCategory("productivity");
    expect(productivityGuides.length).toBeGreaterThanOrEqual(2);

    const harvestGuides = getRoleGuidesForSoftware("harvest");
    expect(harvestGuides.length).toBeGreaterThanOrEqual(2);
  });
});
