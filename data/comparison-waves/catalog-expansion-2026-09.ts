/**
 * Miloosh 100-company expansion — curated comparison wave (2026-09).
 *
 * Profiles came first. This is deliberately NOT a pairwise factory: 122
 * comparisons were selected from 188 real alternative edges involving the
 * 100 approved new products. Every pair is declared as an alternative by at
 * least one side; 113/122 are same-category. The nine cross-category pairs
 * are explicit buyer-job overlaps (payments, meeting intelligence, contact
 * center, AI coding, and e-signature), not broad-category adjacency.
 */
export const CATALOG_EXPANSION_COMPARISONS_2026_09 = [

  // People / HR / Payroll / Recruiting — 20 curated pairs
  ["rippling", "gusto"],
  ["rippling", "deel"],
  ["rippling", "bamboohr"],
  ["rippling", "adp-workforce-now"],
  ["adp-workforce-now", "gusto"],
  ["adp-workforce-now", "paychex-flex"],
  ["bamboohr", "gusto"],
  ["bamboohr", "greenhouse"],
  ["deel", "gusto"],
  ["culture-amp", "lattice"],
  ["papaya-global", "remote"],
  ["paycom", "paylocity"],
  ["paycom", "workday-hcm"],
  ["adp-workforce-now", "paycom"],
  ["adp-workforce-now", "paylocity"],
  ["adp-workforce-now", "workday-hcm"],
  ["deel", "papaya-global"],
  ["deel", "remote"],
  ["greenhouse", "lever"],
  ["paylocity", "workday-hcm"],

  // Finance / ERP / Spend — 21 curated pairs
  ["bill", "ramp"],
  ["bill", "tipalti"],
  ["brex", "expensify"],
  ["brex", "navan"],
  ["brex", "ramp"],
  ["coupa", "stampli"],
  ["expensify", "navan"],
  ["expensify", "ramp"],
  ["expensify", "sap-concur"],
  ["netsuite", "odoo"],
  ["netsuite", "sage-intacct"],
  ["netsuite", "sap-cloud-erp"],
  ["odoo", "sage-intacct"],
  ["ramp", "sap-concur"],
  ["acumatica", "microsoft-dynamics-365-business-central"],
  ["acumatica", "netsuite"],
  ["acumatica", "odoo"],
  ["acumatica", "sage-intacct"],
  ["microsoft-dynamics-365-business-central", "netsuite"],
  ["microsoft-dynamics-365-business-central", "sage-intacct"],
  ["paypal-payments", "stripe"],

  // Sales / GTM / Revenue — 15 curated pairs
  ["6sense", "demandbase"],
  ["apollo-io", "cognism"],
  ["apollo-io", "outreach"],
  ["apollo-io", "salesloft"],
  ["apollo-io", "zoominfo-sales"],
  ["cognism", "zoominfo-sales"],
  ["clari", "gong"],
  ["outreach", "salesloft"],
  ["fathom", "fireflies-ai"],
  ["clari", "outreach"],
  ["fathom", "gong"],
  ["fathom", "otter-ai"],
  ["fireflies-ai", "gong"],
  ["linkedin-sales-navigator", "zoominfo-sales"],
  ["apollo-io", "linkedin-sales-navigator"],

  // IT Operations / ITSM / Endpoint — 8 curated pairs
  ["atera", "connectwise-rmm"],
  ["freshservice", "servicenow-itsm"],
  ["jamf-pro", "manageengine-endpoint-central"],
  ["atera", "ninjaone"],
  ["connectwise-rmm", "ninjaone"],
  ["jamf-pro", "ninjaone"],
  ["manageengine-endpoint-central", "ninjaone"],
  ["ninjaone", "teamviewer"],

  // Security / GRC / Privacy — 10 curated pairs
  ["drata", "vanta"],
  ["secureframe", "sprinto"],
  ["drata", "onetrust"],
  ["drata", "secureframe"],
  ["drata", "sprinto"],
  ["onetrust", "vanta"],
  ["secureframe", "vanta"],
  ["sprinto", "vanta"],
  ["sentinelone", "sophos-endpoint"],
  ["crowdstrike", "sentinelone"],

  // Data / BI / Warehouse / ELT — 9 curated pairs
  ["databricks", "snowflake"],
  ["microsoft-power-bi", "tableau"],
  ["airbyte", "fivetran"],
  ["databricks", "google-cloud-bigquery"],
  ["google-cloud-bigquery", "snowflake"],
  ["domo", "microsoft-power-bi"],
  ["domo", "tableau"],
  ["looker", "microsoft-power-bi"],
  ["looker", "tableau"],

  // Customer Experience / Contact Center — 8 curated pairs
  ["five9", "genesys-cloud-cx"],
  ["five9", "talkdesk"],
  ["genesys-cloud-cx", "talkdesk"],
  ["aircall", "dialpad"],
  ["aircall", "ringcentral"],
  ["five9", "ringcentral"],
  ["genesys-cloud-cx", "ringcentral"],
  ["ringcentral", "talkdesk"],

  // Property / Field Service / Construction — 13 curated pairs
  ["entrata", "yardi-breeze"],
  ["fieldedge", "workiz"],
  ["appfolio", "entrata"],
  ["buildium", "entrata"],
  ["appfolio", "yardi-breeze"],
  ["buildium", "yardi-breeze"],
  ["appfolio", "rent-manager"],
  ["buildium", "rent-manager"],
  ["rent-manager", "yardi-breeze"],
  ["fieldedge", "jobber"],
  ["fieldedge", "servicetitan"],
  ["housecall-pro", "workiz"],
  ["jobber", "workiz"],

  // Fleet / Physical Operations — 9 curated pairs
  ["azuga-fleet", "geotab"],
  ["azuga-fleet", "verizon-connect"],
  ["geotab", "motive"],
  ["geotab", "samsara"],
  ["motive", "samsara"],
  ["samsara", "verizon-connect"],
  ["azuga-fleet", "samsara"],
  ["geotab", "verizon-connect"],
  ["motive", "verizon-connect"],

  // AI Developer / App Builders — 7 curated pairs
  ["cursor", "replit"],
  ["cursor", "github-copilot"],
  ["cursor", "windsurf"],
  ["github-copilot", "replit"],
  ["github-copilot", "windsurf"],
  ["replit", "windsurf"],
  ["lovable", "replit"],

  // Legal / E-sign — 2 curated pairs
  ["docusign", "pandadoc"],
  ["clio-manage", "mycase"],
] as const satisfies ReadonlyArray<readonly [string, string]>;
