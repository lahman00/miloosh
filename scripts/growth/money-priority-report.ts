import { computeMoneyPriorityQueue } from "@/lib/growth/money-priority-engine";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { readLatestSeoFactoryRun } from "@/lib/seo-factory/store";

/**
 * MILOOSH AUTONOMOUS REVENUE COMPANY BUILD mission (2026-08-24), Phase 2 —
 * real production run of the Money Priority Engine. Pulls real first-party
 * events and the latest real SEO Factory opportunity rows, computes the
 * ranked queue, and prints it. Read-only against both stores.
 *
 * Deliberately does NOT auto-load .env.local (unlike scripts/social/
 * _load-env.ts) -- that pattern is exactly what caused a real incident
 * earlier this session (a "local dry run" wasn't actually local). Pass
 * --env-file explicitly for a real production read; omitting it is a
 * safe no-op against local fallback storage.
 *
 * Usage:
 *   npx tsx scripts/growth/money-priority-report.ts                        # local fallback only
 *   npx tsx --env-file=.env.local scripts/growth/money-priority-report.ts  # real production read
 */
async function main() {
  const events = await getAllFirstPartyEvents();
  const seoRun = await readLatestSeoFactoryRun();
  const seoOpportunities = seoRun?.opportunities ?? [];

  if (!seoRun) {
    console.log("No SEO Factory run available -- GSC fields will show NOT_MEASURED for every partner.");
  } else {
    console.log(`Using SEO Factory run generated ${seoRun.generatedAt} (${seoRun.opportunities.length} opportunity rows).`);
  }

  const queue = computeMoneyPriorityQueue(events, seoOpportunities);

  console.log(`\n${"RANK".padEnd(5)}${"SLUG".padEnd(16)}${"SCORE".padEnd(7)}${"READINESS".padEnd(11)}${"CLICKS".padEnd(8)}${"SESSIONS".padEnd(10)}${"CMP".padEnd(5)}${"GUIDE".padEnd(7)}${"PRICE".padEnd(7)}GSC IMPR.`);
  queue.forEach((row, i) => {
    console.log(
      `${(i + 1).toString().padEnd(5)}${row.slug.padEnd(16)}${row.score.toString().padEnd(7)}${row.revenueReadiness.padEnd(11)}${row.uniqueEligibleHumanClickers.toString().padEnd(8)}${row.eligibleHumanPageSessions.toString().padEnd(10)}${row.comparisonCoverage.toString().padEnd(5)}${(row.hasDecisionGuideCoverage ? "yes" : "no").padEnd(7)}${(row.hasPricingCtaCoverage ? "yes" : "no").padEnd(7)}${row.gscImpressions}`,
    );
  });

  console.log("\n--- Top 5 detail ---");
  for (const row of queue.slice(0, 5)) {
    console.log(`\n${row.name} (${row.slug}) — score ${row.score}, ${row.revenueReadiness}`);
    console.log(`  Breakdown: ${JSON.stringify(row.scoreBreakdown)}`);
    console.log(`  Commission: ${row.commissionModel} | Cookie: ${row.cookieWindow}`);
    console.log(`  Blocker: ${row.currentBlocker ?? "none"}`);
    console.log(`  Next: ${row.nextIntervention}`);
    if (row.commercialIntentQueries.length) console.log(`  Real queries: ${row.commercialIntentQueries.join(" | ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
