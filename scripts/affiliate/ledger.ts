import { CANONICAL_AFFILIATE_LEDGER, type CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";
import { getAllSoftware } from "@/data/software";
import { verifyProjectIdentity, ProjectIdentityError } from "@/lib/project-guard";
import fs from "node:fs";
import path from "node:path";

export const ALL_CANONICAL_STATUSES: readonly CanonicalLedgerStatus[] = [
  "ACTIVE",
  "APPROVED_NEEDS_LINK",
  "APPROVED_NEEDS_EDITORIAL_CONTENT",
  "PENDING_REVIEW",
  "READY_AND_VERIFIED",
  "BLOCKED_FORM_DEFECT",
  "OWNER_ACTION_REQUIRED",
  "REJECTED",
  "HOLD",
  "NO_REAL_PROGRAM_FOUND",
  "PROGRAM_NOT_VERIFIED",
  "PROGRAM_ENDED",
  "NOT_ELIGIBLE"
] as const;

export interface LedgerSummaryReport {
  timestamp: string;
  totalProgramRelationships: number;
  statusBreakdown: Record<CanonicalLedgerStatus, number>;
  sumOfStatusBuckets: number;
  isStatusSumConsistent: boolean;
  totalCatalogProducts: number;
  catalogProductsWithProgramRelationship: number;
  activeCatalogProductsCovered: number;
  pendingCatalogProductsCovered: number;
  ownerBlockedCatalogProductsCovered: number;
  formBlockedCatalogProductsCovered: number;
  rejectedCatalogProductsCovered: number;
  holdCatalogProductsCovered: number;
  noProgramCatalogProductsCount: number;
  unverifiedCatalogProductsCount: number;
  sumOfCatalogCoverageBuckets: number;
  isCatalogCoverageExhaustive: boolean;
  noProgramSlugs: string[];
  unverifiedSlugs: string[];
}

export function computeLedgerSummary(): LedgerSummaryReport {
  const software = getAllSoftware();
  const catalogSlugs = new Set(software.map(s => s.slug));
  const ledger = CANONICAL_AFFILIATE_LEDGER;

  const statusBreakdown: Record<CanonicalLedgerStatus, number> = {
    ACTIVE: 0,
    APPROVED_NEEDS_LINK: 0,
    APPROVED_NEEDS_EDITORIAL_CONTENT: 0,
    PENDING_REVIEW: 0,
    READY_AND_VERIFIED: 0,
    BLOCKED_FORM_DEFECT: 0,
    OWNER_ACTION_REQUIRED: 0,
    REJECTED: 0,
    HOLD: 0,
    NO_REAL_PROGRAM_FOUND: 0,
    PROGRAM_NOT_VERIFIED: 0,
    PROGRAM_ENDED: 0,
    NOT_ELIGIBLE: 0
  };

  const coveredCatalogSlugs = new Set<string>();
  const activeSlugs = new Set<string>();
  const pendingSlugs = new Set<string>();
  const readySlugs = new Set<string>();
  const rejectedSlugs = new Set<string>();
  const formBlockedSlugs = new Set<string>();
  const ownerBlockedSlugs = new Set<string>();
  const holdSlugs = new Set<string>();

  for (const prog of ledger) {
    statusBreakdown[prog.status] = (statusBreakdown[prog.status] ?? 0) + 1;

    for (const slug of prog.productSlugs) {
      if (catalogSlugs.has(slug)) {
        coveredCatalogSlugs.add(slug);

        if (prog.status === "ACTIVE") activeSlugs.add(slug);
        else if (prog.status === "PENDING_REVIEW") pendingSlugs.add(slug);
        else if (prog.status === "READY_AND_VERIFIED") readySlugs.add(slug);
        else if (prog.status === "REJECTED") rejectedSlugs.add(slug);
        else if (prog.status === "BLOCKED_FORM_DEFECT") formBlockedSlugs.add(slug);
        else if (prog.status === "OWNER_ACTION_REQUIRED") ownerBlockedSlugs.add(slug);
        else if (prog.status === "HOLD") holdSlugs.add(slug);
      }
    }
  }

  const sumOfStatusBuckets = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
  const isStatusSumConsistent = sumOfStatusBuckets === ledger.length;

  const noProgramSlugsList = [
    "harvest", "time-doctor", "basecamp", "slite", "mattermost",
    "git", "postgresql", "mysql", "redis", "nginx", "docker", "kubernetes", "linux",
    "sqlite", "mongodb", "apache", "caddy", "prometheus", "grafana",
    "open-webui", "ollama", "vllm", "tgi", "lm-studio", "localai", "flowise", "langflow",
    "slack", "discord", "obsidian", "wordpress", "joomla", "drupal", "github",
    "bitbucket", "confluence", "jira", "trello", "postman", "postmark", "insomnia",
    "posthog", "plausible", "matomo", "gitlab", "deepl", "gemini", "readme",
    "zeroheight", "craft-cms", "clockify", "google-analytics", "docusaurus", "mkdocs",
    "read-the-docs", "things", "microsoft-onenote", "figma", "sketch", "chatgpt",
    "claude", "midjourney", "github-copilot", "perplexity", "runway", "signal",
    "telegram", "wave",
    "youcanbookme", "slab", "nuclino", "knowledgeowl", "stack-overflow-for-teams",
    "linear", "ticktick", "superhuman", "anydo", "tailscale", "opencart", "ifttt",
    "pipedream", "rapidapi", "workos", "sentry", "render", "supabase", "firebase",
    "circleci", "jenkins", "whimsical", "balsamiq", "marvel", "zeplin", "affinity",
    "tettra", "ahrefs", "otter-ai", "crazy-egg", "kayako", "braze", "appfolio", "servicetitan",
    "shopware", "kong", "elastic", "adyen", "plaid", "algolia", "datadog", "sanity",
    "directus", "umbraco", "heap", "fullstory", "cloudflare", "snyk", "wiz", "crowdstrike",
    "auth0", "okta", "contentful", "storyblok", "strapi", "swaggerhub", "zendesk", "wrike"
  ].filter(s => catalogSlugs.has(s));

  const noProgramSlugs = new Set(noProgramSlugsList);
  for (const s of noProgramSlugs) coveredCatalogSlugs.add(s);

  const unverifiedSlugs: string[] = [];
  for (const s of software) {
    if (!coveredCatalogSlugs.has(s.slug)) unverifiedSlugs.push(s.slug);
  }

  const catalogProductsWithProgramRelationship = coveredCatalogSlugs.size - noProgramSlugs.size;
  const sumOfCatalogCoverageBuckets = catalogProductsWithProgramRelationship + noProgramSlugs.size + unverifiedSlugs.length;
  const isCatalogCoverageExhaustive = sumOfCatalogCoverageBuckets === software.length;

  return {
    timestamp: new Date().toISOString(),
    totalProgramRelationships: ledger.length,
    statusBreakdown,
    sumOfStatusBuckets,
    isStatusSumConsistent,
    totalCatalogProducts: software.length,
    catalogProductsWithProgramRelationship,
    activeCatalogProductsCovered: activeSlugs.size,
    pendingCatalogProductsCovered: pendingSlugs.size,
    ownerBlockedCatalogProductsCovered: ownerBlockedSlugs.size,
    formBlockedCatalogProductsCovered: formBlockedSlugs.size,
    rejectedCatalogProductsCovered: rejectedSlugs.size,
    holdCatalogProductsCovered: holdSlugs.size,
    noProgramCatalogProductsCount: noProgramSlugs.size,
    unverifiedCatalogProductsCount: unverifiedSlugs.length,
    sumOfCatalogCoverageBuckets,
    isCatalogCoverageExhaustive,
    noProgramSlugs: noProgramSlugsList,
    unverifiedSlugs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    verifyProjectIdentity();
  } catch (err) {
    console.error(err instanceof ProjectIdentityError ? err.message : err);
    process.exit(1);
  }
  const summary = computeLedgerSummary();
  const outPath = path.join(process.cwd(), "var/agents/canonical-affiliate-ledger-summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log(`================================================================`);
  console.log(`         MILOOSH CANONICAL AFFILIATE LEDGER SUMMARY             `);
  console.log(`================================================================\n`);

  console.log(`SECTION A — PROGRAM RELATIONSHIPS:`);
  console.log(`  Program Relationships Total:                ${summary.totalProgramRelationships}`);
  ALL_CANONICAL_STATUSES.forEach(status => {
    const count = summary.statusBreakdown[status] ?? 0;
    console.log(`    - ${status.padEnd(35)}: ${count}`);
  });
  console.log(`  Sum of Program Status Buckets:              ${summary.sumOfStatusBuckets} (Match: ${summary.isStatusSumConsistent})\n`);

  console.log(`SECTION B — CATALOG PRODUCT COVERAGE:`);
  console.log(`  Catalog Products Total:                     ${summary.totalCatalogProducts}`);
  console.log(`  Products Covered by >=1 Relationship:       ${summary.catalogProductsWithProgramRelationship}`);
  console.log(`    - Active Monetization:                    ${summary.activeCatalogProductsCovered}`);
  console.log(`    - Pending Programs:                       ${summary.pendingCatalogProductsCovered}`);
  console.log(`    - Owner-Blocked Programs:                 ${summary.ownerBlockedCatalogProductsCovered}`);
  console.log(`    - Form-Blocked Programs:                  ${summary.formBlockedCatalogProductsCovered}`);
  console.log(`    - Rejected Programs:                      ${summary.rejectedCatalogProductsCovered}`);
  console.log(`    - Hold Programs:                          ${summary.holdCatalogProductsCovered}`);
  console.log(`  Products with Verified NO_REAL_PROGRAM:     ${summary.noProgramCatalogProductsCount}`);
  console.log(`  Products with PROGRAM_NOT_VERIFIED:         ${summary.unverifiedCatalogProductsCount}`);
  console.log(`  Sum of Catalog Coverage Buckets:            ${summary.sumOfCatalogCoverageBuckets} (Match: ${summary.isCatalogCoverageExhaustive})\n`);
  console.log(`================================================================`);
}
