import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { pathToFileURL } from "node:url";

export interface ComparisonAuditResult {
  pair: [string, string];
  slugA: string;
  slugB: string;
  categoryA: string;
  categoryB: string;
  classification:
    | "DIRECT_SUBSTITUTE"
    | "STRONG_OVERLAP"
    | "LEGITIMATE_NICHE_OVERLAP"
    | "FORCED_CROSS_DOMAIN_INVALID";
  reason: string;
}

export function auditComparisonGraph(): ComparisonAuditResult[] {
  const results: ComparisonAuditResult[] = [];

  // Allowed cross-category pairs that represent real-world software buyer evaluation sets
  const legitimateCrossCategoryPairs = new Set([
    // Productivity vs Project Management
    "productivity-project-management", "project-management-productivity",
    // CRM vs Marketing
    "crm-marketing", "marketing-crm",
    // Customer Support vs Communication
    "customer-support-communication", "communication-customer-support",
    // Knowledge Base vs Documentation
    "knowledge-base-documentation", "documentation-knowledge-base",
    // Knowledge Base vs Productivity (Notes/Wikis)
    "knowledge-base-productivity", "productivity-knowledge-base",
    // Design vs CMS (Visual site builders: Framer vs Webflow)
    "design-cms", "cms-design",
    // Design vs Documentation (Design system handoff: Figma/Zeplin vs Zeroheight)
    "design-documentation", "documentation-design",
    // Developer Tools vs Analytics (PostHog telemetry vs Sentry error tracking)
    "developer-tools-analytics", "analytics-developer-tools",
    // Developer Tools vs Documentation (API docs: SwaggerHub vs Postman/Readme)
    "developer-tools-documentation", "documentation-developer-tools",
    // API vs Security (SSO / IAM: Auth0 / Okta vs WorkOS)
    "api-security", "security-api",
    // API vs Marketing (Transactional & Newsletter email: Postmark vs Brevo / SendGrid)
    "api-marketing", "marketing-api",
    // AI vs Productivity (AI transcription/notes vs Meeting apps: Zoom vs Otter)
    "ai-communication", "communication-ai",
    // Scheduling vs Productivity
    "scheduling-productivity", "productivity-scheduling"
  ]);

  // Specific forced/unnatural pairings that dilute editorial authority
  const forcedInvalidPairs = new Set([
    "setmore-pipedrive", "pipedrive-setmore",
    "setmore-hubspot", "hubspot-setmore",
    "setmore-freshsales", "freshsales-setmore",
    "cal-com-pipedrive", "pipedrive-cal-com",
    "cal-com-hubspot", "hubspot-cal-com",
    "calendly-pipedrive", "pipedrive-calendly",
    "quickbooks-online-jobber", "jobber-quickbooks-online",
    "quickbooks-online-housecall-pro", "housecall-pro-quickbooks-online",
    "xero-jobber", "jobber-xero",
    "xero-housecall-pro", "housecall-pro-xero",
    "datadog-snyk", "snyk-datadog",
    "sentry-snyk", "snyk-sentry",
    "elastic-supabase", "supabase-elastic",
    "algolia-supabase", "supabase-algolia",
    "freshbooks-clockify", "clockify-freshbooks",
    "freshbooks-toggl-track", "toggl-track-freshbooks",
    "freshbooks-harvest", "harvest-freshbooks",
    "wave-harvest", "harvest-wave",
    "monday-pipedrive", "pipedrive-monday",
    "airtable-pipedrive", "pipedrive-airtable"
  ]);

  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const swA = getSoftware(a);
    const swB = getSoftware(b);

    if (!swA || !swB) {
      results.push({
        pair: [a, b],
        slugA: a,
        slugB: b,
        categoryA: "unknown",
        categoryB: "unknown",
        classification: "FORCED_CROSS_DOMAIN_INVALID",
        reason: `Missing product software metadata for ${!swA ? a : b}`
      });
      continue;
    }

    const catA = swA.category;
    const catB = swB.category;
    const pairKey = `${a}-${b}`;
    const crossKey = `${catA}-${catB}`;

    if (forcedInvalidPairs.has(pairKey)) {
      results.push({
        pair: [a, b],
        slugA: a,
        slugB: b,
        categoryA: catA,
        categoryB: catB,
        classification: "FORCED_CROSS_DOMAIN_INVALID",
        reason: `Forced cross-domain pairing (${a} in ${catA} vs ${b} in ${catB}) lacking direct buyer substitution overlap.`
      });
    } else if (catA === catB) {
      results.push({
        pair: [a, b],
        slugA: a,
        slugB: b,
        categoryA: catA,
        categoryB: catB,
        classification: "DIRECT_SUBSTITUTE",
        reason: `Direct substitute within ${catA}.`
      });
    } else if (legitimateCrossCategoryPairs.has(crossKey)) {
      results.push({
        pair: [a, b],
        slugA: a,
        slugB: b,
        categoryA: catA,
        categoryB: catB,
        classification: "LEGITIMATE_NICHE_OVERLAP",
        reason: `Legitimate buyer overlap between adjacent categories ${catA} and ${catB}.`
      });
    } else {
      results.push({
        pair: [a, b],
        slugA: a,
        slugB: b,
        categoryA: catA,
        categoryB: catB,
        classification: "FORCED_CROSS_DOMAIN_INVALID",
        reason: `Unnatural category combination: ${catA} vs ${catB}.`
      });
    }
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = auditComparisonGraph();
  const direct = audit.filter(r => r.classification === "DIRECT_SUBSTITUTE");
  const legitCross = audit.filter(r => r.classification === "LEGITIMATE_NICHE_OVERLAP");
  const invalid = audit.filter(r => r.classification === "FORCED_CROSS_DOMAIN_INVALID");

  console.log("================================================================");
  console.log("             MILOOSH DECISION GRAPH ADVERSARIAL AUDIT           ");
  console.log("================================================================\n");
  console.log(`Total Published Comparisons Audited: ${audit.length}`);
  console.log(`  - DIRECT_SUBSTITUTE (Same Category)    : ${direct.length}`);
  console.log(`  - LEGITIMATE_NICHE_OVERLAP (Cross-Cat) : ${legitCross.length}`);
  console.log(`  - FORCED_CROSS_DOMAIN_INVALID          : ${invalid.length}`);

  if (invalid.length > 0) {
    console.log(`\nFlagged Invalid Forced Comparisons (${invalid.length}):`);
    invalid.forEach((item, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2, " ")}. ${item.slugA} (${item.categoryA}) vs ${item.slugB} (${item.categoryB}) -> ${item.reason}`);
    });
  }
}
