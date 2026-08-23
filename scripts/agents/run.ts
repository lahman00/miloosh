import "./_load-env";
import { runSwarm } from "@/lib/agents/orchestrator";
import { writeSwarmReport } from "@/lib/agents/report-io";
import { relativeAgentsPath, LATEST_REPORT_JSON_PATH, LATEST_REPORT_MARKDOWN_PATH } from "@/lib/agents/paths";
import { impactBucket } from "@/lib/agents/scoring";
import type { OperationMode } from "@/types/agents";

/**
 * CLI entrypoint — `npm run agents:quick|daily|weekly|full`.
 *
 * Mode -> what runs (see lib/agents/registry.ts for the exact per-agent
 * mode list):
 *   QUICK  — fail-fast production health: typecheck, lint, validate:data,
 *            smoke checks, GA4 regression checks, critical routes.
 *   DAILY  — QUICK + build verification + maint-seo + maint-recommendations
 *            + live sitemap/robots validation.
 *   WEEKLY — DAILY + the full growth/content/link-health/freshness swarm.
 *   FULL   — every enabled agent, regardless of mode list (a genuine
 *            full audit).
 *
 * Exit code: non-zero if the QA rollup is FAIL, or if any agent's run
 * status is a genuine execution failure ("failure") — matching the
 * existing maintenance system's convention (see lib/maintenance/run-agent.ts):
 * plain findings, even critical-severity ones, are information for a
 * human, not a build blocker, unless they come from a QA-domain check.
 */

function parseMode(): OperationMode {
  const arg = process.argv.find((a) => a.startsWith("--mode="));
  const value = arg?.split("=")[1];
  if (value === "quick" || value === "daily" || value === "weekly" || value === "full") return value;
  return "daily";
}

async function main() {
  const mode = parseMode();
  console.log(`Running Miloosh growth/QA swarm — mode: ${mode.toUpperCase()}\n`);

  const report = await runSwarm(mode);
  writeSwarmReport(report);

  console.log(`Agents: ${report.summary.agentsInvoked} invoked, ${report.summary.agentsSucceeded} succeeded, ${report.summary.agentsWarned} warned, ${report.summary.agentsFailed} failed, ${report.summary.agentsBlocked} blocked, ${report.summary.agentsSkipped} skipped`);
  console.log(`Findings: ${report.findings.length} (merged ${report.duplicatesMerged} duplicates) — ${report.summary.opportunitiesFound} opportunities, ${report.summary.criticalIssues} critical`);
  console.log(`QA overall: ${report.qaOverall}`);
  console.log(`Runtime: ${report.runtimeMs}ms\n`);

  const topOpportunities = report.findings
    .filter((f) => f.kind === "opportunity")
    .sort((a, b) => (b.estimatedImpact ?? 0) - (a.estimatedImpact ?? 0))
    .slice(0, 10);

  if (topOpportunities.length > 0) {
    console.log("Top opportunities:");
    for (const f of topOpportunities) {
      console.log(`  [${impactBucket(f.estimatedImpact ?? 0)}, ${f.estimatedImpact}] ${f.title}`);
    }
    console.log("");
  }

  console.log(`Full report: ${relativeAgentsPath(LATEST_REPORT_JSON_PATH)} / ${relativeAgentsPath(LATEST_REPORT_MARKDOWN_PATH)}`);

  const genuineFailure = report.agentResults.some((r) => r.status === "failure");
  if (report.qaOverall === "FAIL" || genuineFailure) {
    console.error("\nQA rollup is FAIL or an agent genuinely failed to execute — exiting non-zero.");
    process.exit(1);
  }
}

main();
