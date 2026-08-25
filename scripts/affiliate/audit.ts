import "./_load-env";
import { readAffiliatePipeline } from "@/lib/revenue/affiliate-pipeline";
import { readNetworkStatuses } from "@/lib/revenue/affiliate-network-status";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship } from "@/data/affiliate/canonical-ledger";
import { getAllSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

/**
 * Read-only affiliate health audit.
 *
 * Three layers intentionally remain separate:
 * - AFFILIATE_PROGRAMS: public/static vendor research.
 * - affiliate pipeline: mutable runtime workflow history.
 * - CURRENT_AFFILIATE_LEDGER + ACTIVE_PARTNERS: operational account truth.
 *
 * This audit compares the lower-authority layers against current truth rather
 * than letting stale research/pipeline state silently become an owner task.
 */

const STALE_DAYS = 14;
const FOLLOWUP_DAYS = 14;

const PIPELINE_PROGRESS_STATUSES = new Set([
  "submitted",
  "pending_review",
  "approved",
  "affiliate_link_received",
  "activated",
  "earning",
]);
const PIPELINE_ACTIVE_COMPATIBLE_STATUSES = new Set([
  "approved",
  "affiliate_link_received",
  "activated",
  "earning",
]);
const CURRENT_TERMINAL_NEGATIVE_STATUSES = new Set([
  "REJECTED",
  "NOT_ELIGIBLE",
  "NO_REAL_PROGRAM_FOUND",
  "PROGRAM_ENDED",
]);

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function relationshipForProduct(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  // Product-specific and newer evidence beats a broad portfolio record.
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

async function main() {
  const pipeline = await readAffiliatePipeline();
  const networks = await readNetworkStatuses();
  const software = getAllSoftware();
  const softwareSlugs = new Set(software.map((softwareEntry) => softwareEntry.slug));
  const activeMap = new Map(ACTIVE_PARTNERS.map((partner) => [partner.slug as string, partner]));

  const problems: { category: string; slug: string; message: string }[] = [];

  // 1. Stale public research. This is discovery metadata only, but stale
  // vendor facts should still be refreshed before they are quoted or used in
  // a new application decision.
  for (const program of AFFILIATE_PROGRAMS) {
    if (program.programExists !== "yes") continue;
    const age = daysSince(`${program.lastVerifiedAt}T00:00:00.000Z`);
    if (age > STALE_DAYS) {
      problems.push({ category: "stale-research", slug: program.slug, message: `Last verified ${program.lastVerifiedAt} (${age} days ago).` });
    }
  }

  // 2. Duplicate affiliate URLs across pipeline/active records.
  const urlToSlugs = new Map<string, string[]>();
  const activeUrls = [
    ...pipeline
      .filter((entry) => entry.affiliateUrl && PIPELINE_ACTIVE_COMPATIBLE_STATUSES.has(entry.status))
      .map((entry) => ({ slug: entry.slug, url: entry.affiliateUrl! })),
    ...ACTIVE_PARTNERS.filter((partner) => partner.affiliateUrl).map((partner) => ({ slug: partner.slug as string, url: partner.affiliateUrl! })),
  ];
  for (const { slug, url } of activeUrls) {
    if (!urlToSlugs.has(url)) urlToSlugs.set(url, []);
    if (!urlToSlugs.get(url)!.includes(slug)) urlToSlugs.get(url)!.push(slug);
  }
  for (const [url, slugs] of urlToSlugs) {
    if (slugs.length > 1) {
      problems.push({ category: "duplicate-affiliate-url", slug: slugs.join(", "), message: `Same URL (${url}) recorded for ${slugs.length} approved/active programs — verify the network-issued links.` });
    }
  }

  // 3. Approved pipeline state with no URL, plus direct disagreement between
  // a pipeline URL and the stronger active registry URL.
  for (const entry of pipeline) {
    if (PIPELINE_ACTIVE_COMPATIBLE_STATUSES.has(entry.status) && !entry.affiliateUrl) {
      problems.push({ category: "approved-missing-link", slug: entry.slug, message: `Pipeline status is "${entry.status}" but no affiliateUrl is recorded.` });
    }
    const active = activeMap.get(entry.slug);
    if (active?.affiliateUrl && entry.affiliateUrl && active.affiliateUrl !== entry.affiliateUrl) {
      problems.push({
        category: "pipeline-active-url-conflict",
        slug: entry.slug,
        message: `Pipeline URL differs from the verified active registry. Active registry wins; reconcile the pipeline history instead of changing the live URL blindly.`,
      });
    }
  }
  for (const partner of ACTIVE_PARTNERS) {
    if (!partner.affiliateUrl) {
      problems.push({ category: "approved-missing-link", slug: partner.slug, message: "Verified active partner has no legitimate affiliate URL; official vendor navigation remains in use." });
    }
  }

  // 4. Catalog products with no public affiliate research entry. This means
  // UNKNOWN / not researched, never "no program".
  const researchedSlugs = new Set(AFFILIATE_PROGRAMS.map((program) => program.slug));
  const uncoveredCount = software.filter((softwareEntry) => !researchedSlugs.has(softwareEntry.slug)).length;
  if (uncoveredCount > 0) {
    problems.push({ category: "catalog-research-gap", slug: "(aggregate)", message: `${uncoveredCount} of ${software.length} catalog products have no public affiliate research entry. Treat them as unknown, not no-program.` });
  }

  // 5. Research entries with no catalog product.
  for (const program of AFFILIATE_PROGRAMS) {
    if (!softwareSlugs.has(program.slug)) {
      problems.push({ category: "orphaned-research", slug: program.slug, message: `Research entry exists but no matching data/software/${program.slug}.json.` });
    }
  }

  // 6. Current pending relationships overdue for follow-up. Current ledger is
  // stronger than the mutable pipeline for deciding WHAT is genuinely pending.
  for (const relationship of CURRENT_AFFILIATE_LEDGER.filter((entry) => entry.status === "PENDING_REVIEW")) {
    const since = relationship.applicationSubmittedAt ?? relationship.statusUpdatedAt;
    const age = daysSince(`${since}T00:00:00.000Z`);
    if (age > FOLLOWUP_DAYS) {
      problems.push({
        category: "overdue-followup",
        slug: relationship.productSlugs.join(", ") || relationship.programId,
        message: `${relationship.programName} has remained PENDING_REVIEW for ${age} days since ${since}; a single professional follow-up is justified.`,
      });
    }
  }

  // 7. Research versus real progress. Public research can be stale; flag it,
  // but never downgrade an account relationship just because the research
  // file says unknown/no.
  for (const entry of pipeline) {
    const research = AFFILIATE_PROGRAMS.find((program) => program.slug === entry.slug);
    if (PIPELINE_PROGRESS_STATUSES.has(entry.status) && research && research.programExists !== "yes") {
      problems.push({ category: "status-research-conflict", slug: entry.slug, message: `Pipeline status is "${entry.status}" but public research says programExists="${research.programExists}". Refresh research; do not roll back real account progress.` });
    }
  }

  // 8. Pipeline versus current operational truth. This is the high-value drift
  // guard: a stale mutable entry must never resurrect a rejected/ended program,
  // and a stale rejected/pending pipeline row must never hide an ACTIVE partner.
  for (const entry of pipeline) {
    const active = activeMap.get(entry.slug);
    const relationship = relationshipForProduct(entry.slug);

    if (active && !PIPELINE_ACTIVE_COMPATIBLE_STATUSES.has(entry.status)) {
      problems.push({
        category: "pipeline-current-truth-conflict",
        slug: entry.slug,
        message: `Active registry proves this partner is live, but pipeline still says "${entry.status}". Reconcile pipeline state; never downgrade the active registry from this stale row.`,
      });
      continue;
    }

    if (
      !active &&
      relationship &&
      CURRENT_TERMINAL_NEGATIVE_STATUSES.has(relationship.status) &&
      PIPELINE_PROGRESS_STATUSES.has(entry.status)
    ) {
      problems.push({
        category: "pipeline-current-truth-conflict",
        slug: entry.slug,
        message: `Current relationship is ${relationship.status}, but pipeline still says "${entry.status}". Current relationship wins; do not treat this as an actionable/approved program.`,
      });
    }

    if (!active && relationship?.status === "PENDING_REVIEW" && ["rejected", "no_program", "program_closed"].includes(entry.status)) {
      problems.push({
        category: "pipeline-current-truth-conflict",
        slug: entry.slug,
        message: `Current first-party truth is PENDING_REVIEW, but pipeline says "${entry.status}". Keep the operational status pending until a real vendor decision is recorded.`,
      });
    }
  }

  // 9. Network-level gates.
  const frozenNetworks = networks.filter((network) => network.status === "pending_review");
  for (const network of frozenNetworks) {
    problems.push({ category: "network-pending", slug: `(${network.network})`, message: `Network-level relationship "${network.network}" is pending_review; programs gated on it are not independently actionable.` });
  }

  console.log(`Affiliate audit — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`${software.length} catalog products · ${AFFILIATE_PROGRAMS.length} public research entries · ${CURRENT_AFFILIATE_LEDGER.length} current relationships · ${pipeline.length} pipeline entries · ${ACTIVE_PARTNERS.length} active partners · ${problems.length} findings\n`);

  const byCategory = new Map<string, typeof problems>();
  for (const problem of problems) {
    if (!byCategory.has(problem.category)) byCategory.set(problem.category, []);
    byCategory.get(problem.category)!.push(problem);
  }
  for (const [category, items] of byCategory) {
    console.log(`\n=== ${category} (${items.length}) ===`);
    for (const item of items) console.log(`  [${item.slug}] ${item.message}`);
  }

  if (problems.length === 0) console.log("No issues found.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
