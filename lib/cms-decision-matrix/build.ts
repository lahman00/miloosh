import { getAllSoftware } from "@/data/software";
import type { Software } from "@/data/software/types";
import { CMS_MIGRATION_PROFILES, type CmsMigrationProfile } from "./data";

/**
 * CMS Buying Decision Matrix 2026 -- built around the single strongest
 * cross-vendor finding from tonight's research: every CMS checked
 * documents a path to import content IN, but almost none document a path
 * to export content OUT to a competitor. This is a structural,
 * category-wide pattern, not a criticism of any one vendor.
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
  commercialSupportAvailable: boolean;
  commercialSupportNote: string;
  developerAgencyFitNote: string;
  primarySourceUrl: string;
  officialSource: string;
  ownPageEditable: boolean;
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

// Webflow's pricing is not in the catalog (see data.ts); use the vendor-verified figure directly here only.
const WEBFLOW_FALLBACK_PRICE = "Free Starter plan exists; cheapest paid Site plan (Basic) is $15/mo billed yearly";

export function buildCmsDecisionMatrix(all: readonly Software[] = getAllSoftware()): CmsDecisionMatrix {
  const bySlug = new Map(all.map((s) => [s.slug, s]));

  const rows: CmsRow[] = SLUGS.map((slug) => {
    const software = bySlug.get(slug);
    const profile: CmsMigrationProfile = CMS_MIGRATION_PROFILES[slug]!;
    return {
      slug,
      name: software?.name ?? slug,
      recordedStartingPrice: software?.pricing?.startingPrice ?? (slug === "webflow" ? WEBFLOW_FALLBACK_PRICE : null),
      hasFreeTier: software?.pricing?.hasFreeTier ?? software?.pricing?.freePlan ?? (slug === "webflow" ? true : null),
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
      ownPageEditable: profile.ownPageEditable,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: rows.length,
    inclusionRule: "The 8 CMS products named in the mission brief (WordPress, Umbraco, Craft CMS, Drupal, Joomla, Webflow, Contentful, Storyblok) -- not exhaustive of the CMS category.",
    rows,
    importOnlyCount: rows.filter((r) => r.documentsImportIntoProduct && !r.documentsExportOutOfProduct).length,
    importAndExportCount: rows.filter((r) => r.documentsImportIntoProduct && r.documentsExportOutOfProduct).length,
    exportOnlyCount: rows.filter((r) => !r.documentsImportIntoProduct && r.documentsExportOutOfProduct).length,
    neitherDocumentedCount: rows.filter((r) => !r.documentsImportIntoProduct && !r.documentsExportOutOfProduct).length,
    bothHostedAndSelfHostedCount: rows.filter((r) => r.hostedOrSelfHosted === "both").length,
    hostedOnlyCount: rows.filter((r) => r.hostedOrSelfHosted === "hosted").length,
    freeTierCount: rows.filter((r) => r.hasFreeTier === true).length,
    noOfficialVendorSupportCount: rows.filter((r) => !r.commercialSupportAvailable).length,
  };
}
