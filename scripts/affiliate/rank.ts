import "./_load-env";
import { getFreshApplicationCandidates, getAllPriorities } from "@/lib/revenue/affiliate-priority";

/**
 * `npm run affiliate:rank` prints fresh application candidates only.
 * Public program existence is necessary but never sufficient: current active,
 * pending, rejected, ended, blocked, or already-progressed relationships are
 * excluded by lib/revenue/affiliate-priority.ts. Pass --all for the forensic
 * full catalog view, where operationalStatus/blockReason explain exclusions.
 */
async function main() {
  const showAll = process.argv.includes("--all");
  const rows = showAll ? await getAllPriorities() : await getFreshApplicationCandidates();

  console.log(
    showAll
      ? `All ${rows.length} products, ranked by affiliate acquisition signals (forensic view):`
      : `${rows.length} genuine fresh affiliate application candidates, ranked by priority score:`
  );
  console.log("");

  rows.forEach((row, index) => {
    console.log(`${String(index + 1).padStart(3)}. ${row.name} (${row.slug}) — score ${row.totalScore}/100`);
    console.log(
      `     publicProgram=${row.programExists} operational=${row.operationalStatus} pipeline=${row.pipelineStatus} readyToApply=${row.readyToApply} | availability=${row.affiliateAvailabilityScore}/10 category=${row.categoryValueScore}/10 commercialIntent=${row.commercialIntentScore}/10 buyingIntent=${row.buyingIntentScore}/10`
    );
    console.log(
      `     traffic=${row.trafficOpportunityScore}/10 (${row.trafficDataSource}) approvalFriction=${row.approvalFrictionScore}/10 recurringBonus=+${row.recurringBonus}`
    );
    if (row.blockReason) console.log(`     blocked: ${row.blockReason}`);
  });

  console.log("");
  console.log("Score model: additive real-signal ranking for acquisition candidates. Public program existence never overrides Miloosh account truth. No dollar amount or approval probability is predicted.");
}

main();
