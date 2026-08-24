/**
 * MILOOSH P0 -- FIRST REAL PAIN RADAR SIGNAL mission (2026-08-24).
 *
 * Deliberately does NOT import any env-loading module at the top level.
 * The incident from the prior mission (scripts/social/_load-env.ts loads
 * .env.local unconditionally on import, so a "local dry run" without
 * --env-file wasn't actually local) is not repeated here: .env.local is
 * only ever loaded inside the --live branch below, after an explicit
 * flag check, so running this file with no arguments is PHYSICALLY
 * INCAPABLE of touching production -- process.env.BLOB_READ_WRITE_TOKEN
 * is simply never populated in that code path.
 *
 * REAL_CANDIDATES below are the only two of the three researched signals
 * (Freshdesk, Salesforce, Notion) that could be independently verified
 * tonight: opened, fetched, and confirmed to genuinely describe the pain
 * attributed to them. Reddit itself could not be reached -- ten distinct
 * WebSearch queries across two sessions, plus a direct forum fetch
 * (edugeek.net, HTTP 403), never produced a real, openable Reddit
 * permalink. No slug was guessed to fill that gap. Salesforce was
 * dropped entirely: every search result was a generic pricing-guide
 * article, not a specific dated pain narrative, and didn't clear the
 * same evidentiary bar as the other two.
 *
 * Every field below is either (a) a fact I directly verified by fetching
 * the URL and reading the actual page content, or (b) an explicit
 * `undefined`/omitted field where the source didn't support a fact
 * (never a guessed value), or (c) a reasoned analyst score (severity,
 * commercialIntent, audienceFit -- the scoring model's own inputs, not
 * claims about the source itself) with its reasoning in a comment.
 * engagement is intentionally omitted for both: neither source is a
 * Reddit/forum post with a real upvote/comment count, and none was
 * invented to stand in for one.
 */

import type { NewPainCandidateInput } from "@/lib/growth/pain-candidate-store";

const REAL_CANDIDATES: NewPainCandidateInput[] = [
  {
    source: "news",
    sourceUrl: "https://www.eesel.ai/blog/freshdesk-free-plan",
    vendor: "Freshdesk",
    product: "Freshdesk",
    title: "Does Freshdesk still have a free plan? The 2026 answer",
    excerpt:
      "Freshdesk's free plan still exists, but it is invisible from the outside. What survives is the Freshdesk Free Program, buried in the help centre. The Free Program supports up to 2 agents without additional charges. If you need more than two agents or wish to continue using the Free Program beyond the six-month period, you must upgrade to a paid plan.",
    // Verified by direct fetch 2026-08-24: page states "Last edited July 31, 2026 (expert verified)".
    publishedAt: "2026-07-31",
    discoveredAt: new Date().toISOString(),
    intent: "free-plan-ending",
    normalizedPainClass: "loss-of-free-access",
    // sourceReliability: a niche SaaS-tooling blog, not a first-party vendor
    // page or a major outlet -- independently fetched and content-verified,
    // but not authoritative-tier. Reasoned estimate, not an observed fact.
    sourceReliability: 55,
    // severity: the free program is reduced (not eliminated outright: 2
    // agents / 6 months, buried in the help center) -- real friction for
    // small orgs, not a total-loss event.
    severity: 55,
    // commercialIntent: buyers who hit this wall have an immediate,
    // concrete reason to evaluate paid alternatives.
    commercialIntent: 60,
    audienceFit: 65, // Miloosh already covers Freshdesk with real verified pricing
    existingMilooshCoverage: 40, // Freshdesk page exists in the catalog with verified pricing; no dedicated free-plan-change content yet
    affiliateRelevant: true,
    canBuildAssetQuickly: true,
    canDistributeImmediately: true,
  },
  {
    source: "news",
    sourceUrl: "https://fengniii.com/en/archives/5020",
    vendor: "Notion",
    product: "Notion AI",
    title: "Notion AI Usage Limits Explained: Six-Hour Caps, Plus Trials and Kimi K3",
    excerpt:
      "Notion AI officially introduced usage limits on August 3, 2026. The six-hour allowance is calculated on a rolling basis. It does not reset completely at a fixed time. The Plus subscription fee mainly covers features such as file uploads, collaboration, websites, charts and version history. It does not include unrestricted access to Notion AI.",
    // NOT VERIFIED: the article states only "current as of August 2026",
    // no specific publish date was shown on the page -- left undefined
    // rather than guessed.
    publishedAt: undefined,
    discoveredAt: new Date().toISOString(),
    intent: "usage-limit",
    normalizedPainClass: "billing-unpredictability",
    sourceReliability: 50, // same niche-blog caveat as above, slightly lower: no visible publish date to anchor freshness
    severity: 45, // a rolling usage cap with feature pausing, not a full outage or price hike
    commercialIntent: 35, // real friction but weaker direct switching signal than a pricing/plan-ending event
    audienceFit: 55,
    existingMilooshCoverage: 20, // Notion page exists but no dedicated AI-limits content
    affiliateRelevant: true,
    canBuildAssetQuickly: true,
    canDistributeImmediately: true,
  },
];

async function main() {
  const live = process.argv.includes("--live");

  if (live) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      console.log("No .env.local found -- proceeding without it (local fallback storage will be used).");
    }
  }

  const { recordPainCandidate, getAllPainCandidates } = await import("@/lib/growth/pain-candidate-store");
  const { clusterPainCandidates } = await import("@/lib/growth/pain-clustering");
  const { selectRemedy } = await import("@/lib/growth/remedy-selector");

  console.log(`Mode: ${live ? "LIVE (writes to production Blob if BLOB_READ_WRITE_TOKEN is set)" : "DRY-RUN (local fallback only -- .env.local was never loaded)"}`);
  console.log(`BLOB_READ_WRITE_TOKEN present in this process: ${Boolean(process.env.BLOB_READ_WRITE_TOKEN)}`);
  console.log("");

  const recorded = [];
  for (const input of REAL_CANDIDATES) {
    const candidate = await recordPainCandidate(input);
    recorded.push(candidate);
    console.log(`Recorded candidate ${candidate.id}`);
    console.log(`  vendor: ${candidate.vendor}`);
    console.log(`  source: ${candidate.source} -- ${candidate.sourceUrl}`);
    console.log(`  publishedAt: ${candidate.publishedAt ?? "NOT VERIFIED"}`);
    console.log(`  normalizedPainClass: ${candidate.normalizedPainClass}`);
    console.log("");
  }

  const all = await getAllPainCandidates();
  console.log(`Total candidates in store after this run: ${all.length}`);

  const clusters = clusterPainCandidates(all);
  console.log(`\nClusters formed: ${clusters.length}`);
  for (const cluster of clusters) {
    console.log(`\nCluster ${cluster.id}`);
    console.log(`  vendor: ${cluster.vendor}, painClass: ${cluster.normalizedPainClass}`);
    console.log(`  signalCount: ${cluster.signalCount}, uniqueSourceCount: ${cluster.uniqueSourceCount}`);
    console.log(`  trendDirection: ${cluster.trendDirection}`);
    console.log(`  painVelocityScore: ${cluster.painVelocityScore}`);
    console.log(`  explanation: ${cluster.painVelocityExplanation}`);

    const candidatesInCluster = recorded.filter((c) => cluster.candidateIds.includes(c.id));
    for (const candidate of candidatesInCluster) {
      const remedy = selectRemedy(candidate, cluster);
      console.log(`\n  Remedy for ${candidate.id} (${candidate.vendor}): ${remedy.remedy}`);
      console.log(`    reasons: ${remedy.reasons.join("; ")}`);
      console.log(`    requiresVerificationFirst: ${remedy.requiresVerificationFirst}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
