/**
 * CMS Buying Decision Matrix 2026 -- hand-verified migration, hosting, and
 * commercial-support data for 8 CMS products, researched live against
 * primary sources on 2026-09-27 (see docs/growth/receipts/
 * 20260927-winnable-serp-day-war/cms-cluster.json for the raw findings).
 *
 * IMPORTANT: craft-cms, drupal, joomla, webflow, contentful, and storyblok
 * are all pages under active frozen-cohort experiments
 * (data/growth/frozen-cohorts.ts) or legacy reservations. This module and
 * the page that renders it do NOT modify those products' own
 * data/software/*.json records or /software/[slug] pages -- this is a
 * separate, new research asset that only cites already-public vendor
 * facts. Base pricing fields below are read from the existing catalog
 * where available; Webflow's pricing (which the catalog has never
 * recorded) is sourced here directly from webflow.com/pricing and is
 * NOT written back into data/software/webflow.json, since that page is a
 * protected experiment control.
 */
export interface CmsMigrationProfile {
  slug: string;
  /** Whether Miloosh's own software page can be safely linked to right now (false = active experiment/reservation; still fine to cite public facts about the vendor, just don't imply this page was edited). */
  ownPageEditable: boolean;
  hostedOrSelfHosted: "hosted" | "self-hosted" | "both";
  documentsImportIntoProduct: boolean;
  importNote: string;
  documentsExportOutOfProduct: boolean;
  exportNote: string;
  commercialSupportAvailable: boolean;
  commercialSupportNote: string;
  developerAgencyFitNote: string;
  /** A single clean URL safe to use directly in an href -- never parsed out of officialSource by string-splitting. */
  primarySourceUrl: string;
  officialSource: string;
}

export const CMS_MIGRATION_PROFILES: Record<string, CmsMigrationProfile> = {
  wordpress: {
    slug: "wordpress",
    ownPageEditable: true,
    hostedOrSelfHosted: "both",
    documentsImportIntoProduct: true,
    importNote: "Core ships native importers for only Blogger, LiveJournal, Movable Type/TypePad, RSS, Tumblr, WordPress-to-WordPress, and WooCommerce CSV -- 25+ other systems need third-party plugins. The hosted WordPress.com product supports a broader one-click import list (Medium, Substack, Squarespace, Wix, Weebly, and more).",
    documentsExportOutOfProduct: true,
    exportNote: "The built-in Export tool produces an open WXR (WordPress eXtended RSS/XML) file with no stated restriction on content types or volume -- the most portable export format found across all 8 products checked.",
    commercialSupportAvailable: true,
    commercialSupportNote: "Tiered: WordPress.com Business plan includes 24/7 priority support; WordPress VIP (enterprise) is custom-quoted with no published price on any primary source.",
    developerAgencyFitNote: "Explicitly positioned across the full spectrum: non-technical users, developers/agencies (via the Automattic for Agencies partner program), and enterprises (via WordPress VIP).",
    primarySourceUrl: "https://wordpress.org",
    officialSource: "https://wordpress.org, https://wordpress.com/pricing/, https://wpvip.com",
  },
  umbraco: {
    slug: "umbraco",
    ownPageEditable: true,
    hostedOrSelfHosted: "both",
    documentsImportIntoProduct: false,
    importNote: "No official Umbraco documentation was found describing how to import content from a non-Umbraco CMS (WordPress, Sitecore, Drupal, etc.) -- that direction of migration is left to third-party agencies/tools.",
    documentsExportOutOfProduct: true,
    exportNote: "Umbraco Deploy (bundled with Cloud plans) and the free core's built-in Packages feature both support exporting content/schema to a .zip/XML for import into another Umbraco instance -- but only Umbraco-to-Umbraco, not to a competing CMS.",
    commercialSupportAvailable: true,
    commercialSupportNote: "Official paid Support plans (Professional/Enterprise tiers) exist with SLA-backed response times; exact current fees could not be independently verified from a primary source tonight (umbraco.com blocked automated fetches) and are left unconfirmed rather than guessed.",
    developerAgencyFitNote: "Explicitly positions itself for developers (open-source .NET core), agencies/enterprises (Cloud plans with custom SLAs), and non-technical editors (\"the friendly CMS\") simultaneously.",
    primarySourceUrl: "https://umbraco.com",
    officialSource: "https://umbraco.com, https://docs.umbraco.com",
  },
  "craft-cms": {
    slug: "craft-cms",
    ownPageEditable: false,
    hostedOrSelfHosted: "both",
    documentsImportIntoProduct: true,
    importNote: "Ships an official first-party `craftcms/wp-import` CLI tool (Craft 5.5+) that imports WordPress posts, pages, media, users, comments, and custom fields directly. No comparable first-party importer was found for other CMSs.",
    documentsExportOutOfProduct: false,
    exportNote: "No official documentation describes exporting Craft content to another CMS. A generic developer-facing \"Element Exporter\" API exists for dumping entry data, but it is not a documented path to any specific competing platform.",
    commercialSupportAvailable: true,
    commercialSupportNote: "Free \"Basic\" email support included with a Pro license; paid \"Pro\" support is $75/month (12-hour weekday response); \"Enterprise\" support is custom-priced.",
    developerAgencyFitNote: "Explicitly tiered by buyer in the vendor's own words: Solo (\"for you or a friend\"), Team (\"a small team\"), Pro (\"professionally for a business\"), Enterprise (\"specific licensing requirements\").",
    primarySourceUrl: "https://craftcms.com/pricing",
    officialSource: "https://craftcms.com/pricing, https://craftcms.com/knowledge-base/for-wordpress-devs",
  },
  drupal: {
    slug: "drupal",
    ownPageEditable: false,
    hostedOrSelfHosted: "both",
    documentsImportIntoProduct: true,
    importNote: "The core Migrate API officially documents importing data into Drupal from CSV/JSON/XML/database/REST/RSS sources via contributed modules.",
    documentsExportOutOfProduct: false,
    exportNote: "No destination/output plugins or guidance for pushing Drupal content out to another CMS were found in the Migrate API docs or the Drupal 7 End-of-Life Migration Resource Center (which only covers migrating to newer Drupal or to Backdrop CMS).",
    commercialSupportAvailable: true,
    commercialSupportNote: "No vendor sells support directly. The Drupal Association's Certified Partner program is a directory of independently priced agencies; the Association's own certification fees ($1,500-$25,000/year, scaled by agency size) are what agencies pay to be listed, not what end customers pay for support.",
    developerAgencyFitNote: "Positioned first for developers and its large certified-partner agency ecosystem, with the newer \"Drupal CMS\" distribution aimed at non-technical marketers/content teams on the same core.",
    primarySourceUrl: "https://www.drupal.org",
    officialSource: "https://www.drupal.org",
  },
  joomla: {
    slug: "joomla",
    ownPageEditable: false,
    hostedOrSelfHosted: "both",
    documentsImportIntoProduct: true,
    importNote: "An official first-party \"CMS Migration\" extension (built during Google Summer of Code 2025) imports WordPress categories, articles, media, and menus into Joomla via web-service APIs -- explicitly one-directional.",
    documentsExportOutOfProduct: false,
    exportNote: "No official tool or documentation for exporting Joomla content to another CMS's native format was found. The vendor's own guidance for moving a Joomla site describes raw MySQL database export/import, which preserves Joomla's own schema rather than a portable interchange format.",
    commercialSupportAvailable: false,
    commercialSupportNote: "No official paid support contract is sold by the Joomla project itself -- its own Community Magazine states plainly \"there is no 'official' commercial vendor.\" A directory of independent third-party service providers exists, each setting its own undisclosed pricing.",
    developerAgencyFitNote: "Explicitly segments its own pitch by audience in the same page: non-technical users/small businesses, web agencies, developers, and enterprise use cases.",
    primarySourceUrl: "https://www.joomla.org",
    officialSource: "https://www.joomla.org",
  },
  webflow: {
    slug: "webflow",
    ownPageEditable: false,
    hostedOrSelfHosted: "hosted",
    documentsImportIntoProduct: false,
    importNote: "Webflow's own pricing-page FAQ states flatly: \"Can I import my website or my code? No, you can only develop websites in Webflow.\" This is the most explicit no-import statement found across all 8 products.",
    documentsExportOutOfProduct: true,
    exportNote: "Static HTML/CSS/JS/assets can be exported and rehosted elsewhere on paid Workspace plans, but the same FAQ warns dynamic content \"must be exported on a collection-by-collection basis and forms will stop working\" -- and once exported, code \"can't be reimported.\"",
    commercialSupportAvailable: true,
    commercialSupportNote: "Baseline: email support, 48-hour target response. The Team plan ($2,500/month, annual contract) adds priority support; Enterprise (custom quote) adds 24/7 support and a dedicated customer success manager.",
    developerAgencyFitNote: "Homepage and Enterprise page both lead with marketing-team framing (\"build without filing a ticket,\" \"publish content without a developer\"); a newer research-preview product (\"Source by Webflow\") is explicitly pitching toward developers/agencies but is not the core product.",
    primarySourceUrl: "https://webflow.com/pricing",
    officialSource: "https://webflow.com/pricing (base pricing not present in Miloosh's catalog as of 2026-09-27; cited here directly from the vendor, not written back to data/software/webflow.json since that page is a protected experiment control)",
  },
  contentful: {
    slug: "contentful",
    ownPageEditable: false,
    hostedOrSelfHosted: "hosted",
    documentsImportIntoProduct: true,
    importNote: "A first-party CLI (`contentful space export`/`space import`) exists, but it moves content between Contentful spaces in Contentful's own JSON schema -- not a universal CMS interchange format. No vendor-provided one-click importer from other CMSs exists; only blog-level guidance for custom scripts.",
    documentsExportOutOfProduct: false,
    exportNote: "The same export CLI outputs Contentful's proprietary schema, and Contentful's own docs explicitly flag \"the version history isn't migrated -- will start fresh in the new space\" even for space-to-space moves. No path to a non-Contentful destination format is documented.",
    commercialSupportAvailable: true,
    commercialSupportNote: "Four premium tiers (Silver/Gold/Platinum/Titanium), differentiated by SLA response time from 8-24 business hours down to \"as fast as 1 hour\" -- none publicly priced.",
    developerAgencyFitNote: "Explicitly segments its homepage by role: Growth Marketing, Product, and Developers each get distinct framing; agencies are addressed through a formal Solution Partner program as implementers, not a separate self-serve buyer segment.",
    primarySourceUrl: "https://www.contentful.com/pricing/",
    officialSource: "https://www.contentful.com/pricing/",
  },
  storyblok: {
    slug: "storyblok",
    ownPageEditable: false,
    hostedOrSelfHosted: "hosted",
    documentsImportIntoProduct: true,
    importNote: "Extensive official migration guides exist for moving content INTO Storyblok from specific competitors, including \"Migrating a blog site from Contentful to Storyblok\" and \"Migrating Drupal articles to Storyblok.\"",
    documentsExportOutOfProduct: false,
    exportNote: "No official page describes exporting content out of Storyblok to another CMS. The only concrete export mechanism found is a per-story XML/JSON API endpoint -- bulk whole-space export would require scripting repeated calls to it; no one-click full-space export exists.",
    commercialSupportAvailable: true,
    commercialSupportNote: "Enterprise-tier \"Premium\" (99.9% uptime SLA) and \"Elite\" (99.99% uptime SLA) plans are custom-priced and bundle a dedicated Customer Success Manager; exact fees require a sales conversation.",
    developerAgencyFitNote: "Positions itself jointly to developers, marketers, and enterprises (\"the only content platform where developers, marketers, and AI agents all get exactly what they need\"); agencies are a partner/reseller channel, not a distinct pricing tier.",
    primarySourceUrl: "https://www.storyblok.com",
    officialSource: "https://www.storyblok.com",
  },
};
