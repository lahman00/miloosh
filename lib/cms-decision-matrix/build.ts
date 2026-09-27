import { getAllSoftware } from "@/data/software";
import type { Software } from "@/data/software/types";
import { CMS_MIGRATION_PROFILES, type CmsMigrationProfile } from "./data";

/**
 * CMS Buying Decision Matrix 2026 -- built around the single strongest
 * content-transfer review. A format/API is not a turnkey competing-CMS
 * migration. Missing evidence is never evidence of no capability.
 */
export interface CmsRow {
  slug: string;
  name: string;
  recordedStartingPrice: string | null;
  hasFreeTier: boolean | null;
  hostedOrSelfHosted: string;
  documentsImportIntoProduct: boolean;
  importNote: string;
  documentsExportOutOfProduct: boolean;
  exportNote: string;
  commercialSupportAvailable: boolean | null;
  commercialSupportNote: string;
  developerAgencyFitNote: string;
  primarySourceUrl: string;
  officialSource: string;
  sourceUrls: string[];
}

export interface CmsDecisionMatrix {
  generatedAt: string;
  sampleSize: number;
  inclusionRule: string;
  rows: CmsRow[];
  importOnlyCount: number;
  importAndExportCount: number;
  exportOnlyCount: number;
  neitherDocumentedCount: number;
  bothHostedAndSelfHostedCount: number;
  hostedOnlyCount: number;
  freeTierCount: number;
  noOfficialVendorSupportCount: number;
}

const SLUGS = ["wordpress", "umbraco", "craft-cms", "drupal", "joomla", "webflow", "contentful", "storyblok"];

export function buildCmsDecisionMatrix(all: readonly Software[] = getAllSoftware()): CmsDecisionMatrix {
  const bySlug = new Map(all.map((s) => [s.slug, s]));

  const rows: CmsRow[] = SLUGS.map((slug) => {
    const software = bySlug.get(slug);
    const profile: CmsMigrationProfile = CMS_MIGRATION_PROFILES[slug]!;
    return {
      slug,
      name: software?.name ?? slug,
      // Pricing is outside this review, not refreshed by copying older catalog data.
      recordedStartingPrice: null,
      hasFreeTier: null,
      hostedOrSelfHosted: profile.hostedOrSelfHosted,
      documentsImportIntoProduct: profile.documentsImportIntoProduct,
      importNote: profile.importNote,
      documentsExportOutOfProduct: profile.documentsExportOutOfProduct,
      exportNote: profile.exportNote,
      commercialSupportAvailable: profile.commercialSupportAvailable,
      commercialSupportNote: profile.commercialSupportNote,
      developerAgencyFitNote: profile.developerAgencyFitNote,
      primarySourceUrl: profile.primarySourceUrl,
      officialSource: profile.officialSource,
      sourceUrls: profile.sourceUrls,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: rows.length,
    inclusionRule: "An editorial sample of 8 CMS products (WordPress, Umbraco, Craft CMS, Drupal, Joomla, Webflow, Contentful, Storyblok), not an exhaustive or market-share-weighted sample.",
    rows,
    importOnlyCount: rows.filter((r) => r.documentsImportIntoProduct && !r.documentsExportOutOfProduct).length,
    importAndExportCount: rows.filter((r) => r.documentsImportIntoProduct && r.documentsExportOutOfProduct).length,
    exportOnlyCount: rows.filter((r) => !r.documentsImportIntoProduct && r.documentsExportOutOfProduct).length,
    neitherDocumentedCount: rows.filter((r) => !r.documentsImportIntoProduct && !r.documentsExportOutOfProduct).length,
    bothHostedAndSelfHostedCount: rows.filter((r) => r.hostedOrSelfHosted === "both").length,
    hostedOnlyCount: rows.filter((r) => r.hostedOrSelfHosted === "hosted").length,
    freeTierCount: rows.filter((r) => r.hasFreeTier === true).length,
    noOfficialVendorSupportCount: rows.filter((r) => r.commercialSupportAvailable === false).length,
  };
}
