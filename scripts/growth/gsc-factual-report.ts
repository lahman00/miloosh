import { readSnapshots, latestSnapshot } from "@/lib/agents/gsc-snapshot";

/**
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) Critical Task 4 --
 * the factual counterpart to every heuristic-priority script in this
 * directory (comparison-graph.ts's HEURISTIC_TRAFFIC_SIGNAL and everything
 * derived from it). This script prints ONLY real, authenticated Search
 * Console evidence from var/agents/gsc-snapshots.json -- never a
 * hand-curated estimate, and never silently falls back to one. If no
 * snapshot exists, it says so plainly instead of inventing a number.
 *
 * Does not write, mutate, or destroy any snapshot -- read-only.
 */

function main() {
  const snapshots = readSnapshots();

  console.log("================================================================");
  console.log("       MILOOSH FACTUAL GSC REPORT (authenticated snapshots only) ");
  console.log("================================================================\n");

  if (snapshots.length === 0) {
    console.log("No GSC snapshots exist in var/agents/gsc-snapshots.json.");
    console.log("This is not a report of zero traffic -- it is an absence of measurement.");
    console.log("Do not substitute a heuristic value here; capture a real snapshot instead.\n");
    return;
  }

  console.log(`${snapshots.length} snapshot(s) on record:\n`);
  for (const snap of snapshots) {
    console.log(`- ${snap.capturedAt} (source: ${snap.source})`);
    console.log(`  Scope: ${snap.scope}`);
    if (snap.sitemapUrls !== null) console.log(`  Sitemap URLs: ${snap.sitemapUrls}`);
    if (snap.indexed !== null) console.log(`  Indexed: ${snap.indexed}${snap.notIndexed !== null ? ` / Not indexed: ${snap.notIndexed}` : ""}`);
    if (snap.impressions !== null) console.log(`  Impressions: ${snap.impressions} (real, authenticated -- not a heuristic estimate)`);
    if (snap.clicks !== null) console.log(`  Clicks: ${snap.clicks}`);
    if (snap.averageCtr !== null) console.log(`  Average CTR: ${(snap.averageCtr * 100).toFixed(2)}%`);
    if (snap.averagePosition !== null) console.log(`  Average position: ${snap.averagePosition.toFixed(2)}`);
    if (snap.exclusions.length > 0) {
      console.log(`  Exclusion reasons:`);
      for (const ex of snap.exclusions) console.log(`    - ${ex.reason}: ${ex.count}`);
    }
    if (snap.notes) console.log(`  Notes: ${snap.notes}`);
    console.log("");
  }

  const latest = latestSnapshot();
  if (latest?.source === "owner-reported") {
    console.log("NOTE: the most recent snapshot is owner-reported (read off the Search Console UI by a human), not a direct API pull -- real evidence, but distinguish it from an API-sourced snapshot in anything downstream that cites this report.");
  }

  console.log("\nThis is SITE-WIDE data, not broken down per product/slug. For");
  console.log("per-product relative prioritization (a genuinely different, heuristic");
  console.log("signal), see lib/growth-audit/comparison-graph.ts's HEURISTIC_TRAFFIC_SIGNAL");
  console.log("-- the two must never be presented as the same kind of evidence.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
