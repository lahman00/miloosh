import { describe, it, expect } from "vitest";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";
import { CMS_MIGRATION_PROFILES } from "@/lib/cms-decision-matrix/data";

/**
 * Claude Overnight/Daytime War (2026-09-27) — regression suite for the CMS
 * Buying Decision Matrix. The four migration-direction buckets
 * (import-only / both / export-only / neither) must always partition the
 * full sample -- a bug here previously silently dropped export-only rows
 * (Umbraco, Webflow) from every count.
 */
describe("buildCmsDecisionMatrix", () => {
  const m = buildCmsDecisionMatrix();

  it("sample is exactly the 8 named CMS products", () => {
    expect(m.sampleSize).toBe(8);
  });

  it("the four migration-direction buckets exactly partition the sample (no row silently dropped)", () => {
    expect(m.importOnlyCount + m.importAndExportCount + m.exportOnlyCount + m.neitherDocumentedCount).toBe(m.sampleSize);
  });

  it("every row's bucket membership matches its own documentsImportIntoProduct/documentsExportOutOfProduct booleans", () => {
    const importOnly = m.rows.filter((r) => r.documentsImportIntoProduct && !r.documentsExportOutOfProduct).length;
    const both = m.rows.filter((r) => r.documentsImportIntoProduct && r.documentsExportOutOfProduct).length;
    const exportOnly = m.rows.filter((r) => !r.documentsImportIntoProduct && r.documentsExportOutOfProduct).length;
    const neither = m.rows.filter((r) => !r.documentsImportIntoProduct && !r.documentsExportOutOfProduct).length;
    expect(importOnly).toBe(m.importOnlyCount);
    expect(both).toBe(m.importAndExportCount);
    expect(exportOnly).toBe(m.exportOnlyCount);
    expect(neither).toBe(m.neitherDocumentedCount);
  });

  it("Webflow's pricing is sourced directly in this module, not from data/software/webflow.json, and is not asserted as written back to the catalog", () => {
    const webflow = m.rows.find((r) => r.slug === "webflow")!;
    expect(webflow.recordedStartingPrice).toContain("Basic");
    expect(webflow.ownPageEditable).toBe(false);
  });

  it("every profile in the overlay has a non-empty officialSource", () => {
    for (const profile of Object.values(CMS_MIGRATION_PROFILES)) {
      expect(profile.officialSource.length).toBeGreaterThan(0);
    }
  });

  it("every profile's primarySourceUrl is a clean, single, directly-usable https URL (regression: previously derived by splitting officialSource on commas, which broke on Webflow's parenthetical note)", () => {
    for (const profile of Object.values(CMS_MIGRATION_PROFILES)) {
      expect(profile.primarySourceUrl).toMatch(/^https:\/\/\S+$/);
      expect(profile.primarySourceUrl).not.toContain(" ");
      expect(profile.primarySourceUrl).not.toContain("(");
    }
  });

  it("inclusion rule is always present and non-empty", () => {
    expect(m.inclusionRule.length).toBeGreaterThan(0);
  });
});
