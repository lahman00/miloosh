/** First-party documentation review, 2026-09-27. Content transfer is not a
 * turnkey migration. No edit permissions or catalog prices are public facts here. */
export interface CmsMigrationProfile {
  slug: string;
  hostedOrSelfHosted: "hosted" | "self-hosted" | "both";
  documentsImportIntoProduct: boolean;
  importNote: string;
  documentsExportOutOfProduct: boolean;
  exportNote: string;
  commercialSupportAvailable: boolean | null;
  commercialSupportNote: string;
  developerAgencyFitNote: string;
  primarySourceUrl: string;
  sourceUrls: string[];
  officialSource: string;
}
export const CMS_MIGRATION_PROFILES: Record<string, CmsMigrationProfile> = {
  "wordpress": {
    "slug": "wordpress",
    "hostedOrSelfHosted": "both",
    "documentsImportIntoProduct": true,
    "importNote": "Tools → Import supports WXR import. Other source systems require their own importer and field mapping.",
    "documentsExportOutOfProduct": true,
    "exportNote": "Tools → Export downloads WXR/XML containing selected content. This is not a working theme/plugin stack or proof of compatibility with another CMS.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Check whether theme/plugin behavior must be rebuilt separately from WXR content, and name the party maintaining hosting and updates.",
    "primarySourceUrl": "https://wordpress.org/documentation/article/tools-export-screen/",
    "sourceUrls": [
      "https://wordpress.org/documentation/article/tools-export-screen/",
      "https://learn.wordpress.org/lesson/tools-export-and-import/"
    ],
    "officialSource": "https://wordpress.org/documentation/article/tools-export-screen/, https://learn.wordpress.org/lesson/tools-export-and-import/"
  },
  "umbraco": {
    "slug": "umbraco",
    "hostedOrSelfHosted": "both",
    "documentsImportIntoProduct": true,
    "importNote": "Deploy imports its ZIP content/schema archives into another Umbraco environment. This verifies an Umbraco-to-Umbraco path, not an importer for competing CMSs.",
    "documentsExportOutOfProduct": true,
    "exportNote": "Deploy exports selected content, schema and optionally media to ZIP. Version upgrades may require migrators; another CMS needs conversion of the Umbraco representation.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Test the exact source/destination versions and property editors. Deploy archives are useful for Umbraco transfers, not evidence of automatic conversion to another CMS.",
    "primarySourceUrl": "https://docs.umbraco.com/umbraco-deploy/deployment-workflow/import-export",
    "sourceUrls": [
      "https://docs.umbraco.com/umbraco-deploy/deployment-workflow/import-export"
    ],
    "officialSource": "https://docs.umbraco.com/umbraco-deploy/deployment-workflow/import-export"
  },
  "craft-cms": {
    "slug": "craft-cms",
    "hostedOrSelfHosted": "both",
    "documentsImportIntoProduct": true,
    "importNote": "Craft documents a WordPress import tool. Verify custom-field and plugin compatibility separately.",
    "documentsExportOutOfProduct": true,
    "exportNote": "Element indexes offer CSV, JSON and XML export. These formats still need mapping to the receiving CMS; they are not a complete application migration.",
    "commercialSupportAvailable": true,
    "commercialSupportNote": "Craft offers developer support and premium support options. Edition and response commitments should be checked separately from the CMS license.",
    "developerAgencyFitNote": "Have the developer test WordPress imports and exported element fields against the destination model; evaluate Craft Cloud separately from a self-hosted license.",
    "primarySourceUrl": "https://craftcms.com/docs/5.x/system/elements",
    "sourceUrls": [
      "https://craftcms.com/docs/5.x/system/elements",
      "https://craftcms.com/knowledge-base/for-wordpress-devs",
      "https://craftcms.com/pricing"
    ],
    "officialSource": "https://craftcms.com/docs/5.x/system/elements, https://craftcms.com/knowledge-base/for-wordpress-devs, https://craftcms.com/pricing"
  },
  "drupal": {
    "slug": "drupal",
    "hostedOrSelfHosted": "self-hosted",
    "documentsImportIntoProduct": true,
    "importNote": "The Migrate API documents source plugins and transformations for bringing external data into Drupal. Formats may require contributed modules.",
    "documentsExportOutOfProduct": true,
    "exportNote": "Core JSON:API documentation shows GET requests for entities and collections. This is developer-oriented extraction, not a one-click whole-site export; handle permissions, pagination and related files.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Assign ownership for entity mapping, API permissions, pagination and media retrieval. A working API response is only one part of a migration.",
    "primarySourceUrl": "https://www.drupal.org/docs/drupal-apis/migrate-api",
    "sourceUrls": [
      "https://www.drupal.org/docs/drupal-apis/migrate-api",
      "https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/fetching-resources-get"
    ],
    "officialSource": "https://www.drupal.org/docs/drupal-apis/migrate-api, https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/fetching-resources-get"
  },
  "joomla": {
    "slug": "joomla",
    "hostedOrSelfHosted": "self-hosted",
    "documentsImportIntoProduct": true,
    "importNote": "Joomla Community Magazine documents a GSoC 2025 CMS Migration extension for WordPress-to-Joomla content transfer over web-service APIs. Verify current maintenance and version compatibility.",
    "documentsExportOutOfProduct": false,
    "exportNote": "A general outbound content-transfer workflow was not verified in the sources reviewed for this row. This is an evidence gap, not a claim that Joomla cannot export data or that no extension exists.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Confirm that the extension supports the needed versions and content types. Ask the implementer to demonstrate the outbound path that this review could not verify.",
    "primarySourceUrl": "https://magazine.joomla.org/issues/2025/september-2025/migrating-content-from-wordpress-to-joomla-with-the-migration-tool",
    "sourceUrls": [
      "https://magazine.joomla.org/issues/2025/september-2025/migrating-content-from-wordpress-to-joomla-with-the-migration-tool"
    ],
    "officialSource": "https://magazine.joomla.org/issues/2025/september-2025/migrating-content-from-wordpress-to-joomla-with-the-migration-tool"
  },
  "webflow": {
    "slug": "webflow",
    "hostedOrSelfHosted": "hosted",
    "documentsImportIntoProduct": true,
    "importNote": "Webflow CMS imports Collection items from CSV with field mapping. A restriction on importing arbitrary website code is not a restriction on importing CMS content.",
    "documentsExportOutOfProduct": true,
    "exportNote": "Collections export as CSV. Image/file URLs can point at the original site: preserve or migrate assets before deleting it. CSV does not recreate the site's design or application behavior.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Validate reference fields, locales and file URLs in exported CSV. Plan design/application rebuilding separately from Collection content transfer.",
    "primarySourceUrl": "https://help.webflow.com/hc/en-us/articles/33961290794771-How-do-I-import-content-into-the-Webflow-CMS",
    "sourceUrls": [
      "https://help.webflow.com/hc/en-us/articles/33961290794771-How-do-I-import-content-into-the-Webflow-CMS"
    ],
    "officialSource": "https://help.webflow.com/hc/en-us/articles/33961290794771-How-do-I-import-content-into-the-Webflow-CMS"
  },
  "contentful": {
    "slug": "contentful",
    "hostedOrSelfHosted": "hosted",
    "documentsImportIntoProduct": true,
    "importNote": "The CLI imports content and content models using Contentful's JSON schema. Another CMS's export needs mapping to that schema.",
    "documentsExportOutOfProduct": true,
    "exportNote": "The CLI exports entries, assets, content types and other space data as JSON. Version history and some workflow/application configuration do not migrate. This is not turnkey compatibility with competing CMSs.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Include the CLI's omissions in the migration plan: version history, workflows and apps do not all travel with entries and assets.",
    "primarySourceUrl": "https://www.contentful.com/developers/docs/tutorials/cli/import-and-export/",
    "sourceUrls": [
      "https://www.contentful.com/developers/docs/tutorials/cli/import-and-export/"
    ],
    "officialSource": "https://www.contentful.com/developers/docs/tutorials/cli/import-and-export/"
  },
  "storyblok": {
    "slug": "storyblok",
    "hostedOrSelfHosted": "hosted",
    "documentsImportIntoProduct": true,
    "importNote": "The CLI pushes previously pulled stories into a space; keep component schemas in sync. Content from a different CMS needs transformation.",
    "documentsExportOutOfProduct": true,
    "exportNote": "The stories pull command retrieves stories into local files, alongside separate component-schema commands. Export is not limited to a per-story API, but these files are not a ready-to-run site on another CMS.",
    "commercialSupportAvailable": null,
    "commercialSupportNote": "Support fees and SLAs were not measured in this content-transfer review. Confirm responsibility with the project, hosting provider or agency before contracting.",
    "developerAgencyFitNote": "Review stories and component schemas together. Validate references after push/pull rather than treating downloaded stories as a standalone website.",
    "primarySourceUrl": "https://www.storyblok.com/docs/libraries/storyblok-cli",
    "sourceUrls": [
      "https://www.storyblok.com/docs/libraries/storyblok-cli"
    ],
    "officialSource": "https://www.storyblok.com/docs/libraries/storyblok-cli"
  }
};
