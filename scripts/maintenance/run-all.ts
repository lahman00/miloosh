import "./_load-env";
import { executeLinksAgent } from "@/scripts/maintenance/links";
import { executeSocialLinksAgent } from "@/scripts/maintenance/social-links";
import { executeSocialChannelHealthAgent } from "@/scripts/maintenance/social-channel-health";
import { executeSocialScheduleHealthAgent } from "@/scripts/maintenance/social-schedule-health";
import { executeFreshnessAgent } from "@/scripts/maintenance/freshness";
import { executeSeoAgent } from "@/scripts/maintenance/seo";
import { executeRecommendationsAgent } from "@/scripts/maintenance/recommendations";
import { executeComparisonsAgent } from "@/scripts/maintenance/comparisons";
import { executeAffiliateAgent } from "@/scripts/maintenance/affiliate";
import { writeSummary } from "@/lib/maintenance/report-io";
import { reportJsonPath, reportMarkdownPath, relativeReportPath } from "@/lib/maintenance/paths";
import { sendMaintenanceNotification } from "@/lib/maintenance/notifications";
import type { MaintenanceReport, MaintenanceSummary, MaintenanceSummaryAgentEntry } from "@/types/maintenance";

/**
 * Sprint 12 Phase 8 — Master Maintenance Run (`npm run maintenance`).
 * Runs every agent in-process (each agent already writes its own
 * var/maintenance/<agent>.json + .md), then writes a combined
 * var/maintenance/latest-summary.{json,md}.
 *
 * Exit code policy (see lib/maintenance/run-agent.ts and
 * docs/maintenance-system.md): this command exits non-zero only if an
 * agent's own `run.status` is "failure" — either it threw, or (for the
 * SEO and recommendation-regression agents specifically) it found a
 * critical issue that represents a real codebase bug rather than a fact
 * about the outside world. A pile of "this vendor's page 404'd" or
 * "this entry is a bit stale" findings, however many, never fails this
 * command — those are exactly what "prepare for human review" means.
 */

function buildAgentEntry(report: MaintenanceReport<unknown>): MaintenanceSummaryAgentEntry {
  const critical = report.issues.filter((i) => i.severity === "critical").length;
  const warning = report.issues.filter((i) => i.severity === "warning").length;
  const info = report.issues.filter((i) => i.severity === "info").length;

  return {
    agent: report.agent,
    status: report.run.status,
    durationMs: report.run.durationMs,
    summary: report.summary,
    criticalCount: critical,
    warningCount: warning,
    infoCount: info,
    jsonReportPath: relativeReportPath(reportJsonPath(report.agent)),
    markdownReportPath: relativeReportPath(reportMarkdownPath(report.agent)),
  };
}

function buildRecommendedActions(entries: MaintenanceSummaryAgentEntry[]): string[] {
  const actions: string[] = [];

  const failed = entries.filter((e) => e.status === "failure");
  if (failed.length > 0) {
    actions.push(`Investigate ${failed.length} agent(s) that failed to run cleanly: ${failed.map((e) => e.agent).join(", ")}.`);
  }

  const linkAgent = entries.find((e) => e.agent === "links");
  if (linkAgent && linkAgent.criticalCount > 0) {
    actions.push(`Review ${linkAgent.criticalCount} broken/unreachable URL(s) in var/maintenance/links.md and update the affected data/software/*.json source(s) by hand once confirmed.`);
  }

  const socialLinksAgent = entries.find((e) => e.agent === "social-links");
  if (socialLinksAgent && socialLinksAgent.criticalCount > 0) {
    actions.push(`Fix ${socialLinksAgent.criticalCount} dead internal link(s) in the social queue in var/maintenance/social-links.md — restore the route, add a redirect in data/redirects.ts, or transition the entry to SKIPPED. Treat any "LIVE PUBLISHED POST" finding as urgent: it is broken for real visitors right now.`);
  }

  const socialChannelHealthAgent = entries.find((e) => e.agent === "social-channel-health");
  if (socialChannelHealthAgent && socialChannelHealthAgent.criticalCount > 0) {
    actions.push(`Fix ${socialChannelHealthAgent.criticalCount} enabled-but-broken social channel(s) in var/maintenance/social-channel-health.md — supply the missing credentials in Vercel, or disable the channel in data/social/social-strategy.json until it's ready. Note: LinkedIn is never checked here (its transport can't be resolved outside Vercel's own runtime) — verify it separately via real queue publish history.`);
  }

  const socialScheduleHealthAgent = entries.find((e) => e.agent === "social-schedule-health");
  if (socialScheduleHealthAgent && socialScheduleHealthAgent.criticalCount > 0) {
    actions.push(`Investigate the social-schedule cron in var/maintenance/social-schedule-health.md — the SCHEDULED runway has fallen critically thin while real backlog remains, suggesting /api/cron/social-schedule stopped running or CRON_SECRET is misconfigured.`);
  }

  const freshnessAgent = entries.find((e) => e.agent === "freshness");
  if (freshnessAgent && (freshnessAgent.criticalCount > 0 || freshnessAgent.warningCount > 0)) {
    actions.push(`Consider re-researching the lowest-scoring entries in var/maintenance/freshness.md — freshness measures documentation completeness, not correctness, so a low score is a prioritization signal, not a confirmed error.`);
  }

  const seoAgent = entries.find((e) => e.agent === "seo");
  if (seoAgent && seoAgent.criticalCount > 0) {
    actions.push(`Fix ${seoAgent.criticalCount} SEO integrity issue(s) in var/maintenance/seo.md before the next deploy — these are codebase bugs, not external data drift.`);
  }

  const comparisonsAgent = entries.find((e) => e.agent === "comparisons");
  if (comparisonsAgent) {
    actions.push(`Review candidate comparisons in var/maintenance/comparisons.md and manually add any worth publishing to data/comparisons.ts — nothing is auto-published.`);
  }

  const affiliateAgent = entries.find((e) => e.agent === "affiliate");
  if (affiliateAgent) {
    actions.push(`Review affiliate opportunities in var/maintenance/affiliate.md — apply to confirmed-but-inactive programs via docs/affiliate-applications.md, or manually research the unresolved ones.`);
  }

  if (actions.length === 0) {
    actions.push("No action required — all agents completed cleanly with no critical findings.");
  }

  return actions;
}

function renderSummaryMarkdown(summary: MaintenanceSummary): string {
  const lines: string[] = [
    "# Miloosh maintenance summary",
    "",
    `Generated: ${summary.generatedAt}`,
    `All agents succeeded: ${summary.allAgentsSucceeded ? "yes" : "no"}`,
    "",
    `**Totals:** ${summary.totalCritical} critical, ${summary.totalWarning} warning, ${summary.totalInfo} info`,
    "",
    "## Agent status",
    "",
    "| Agent | Status | Critical | Warning | Info | Duration |",
    "|---|---|---|---|---|---|",
    ...summary.agents.map(
      (a) => `| ${a.agent} | ${a.status} | ${a.criticalCount} | ${a.warningCount} | ${a.infoCount} | ${a.durationMs}ms |`
    ),
    "",
    "## Recommended human actions",
    "",
    ...summary.recommendedHumanActions.map((action) => `- ${action}`),
    "",
    "## Detailed reports",
    "",
    ...summary.agents.map((a) => `- **${a.agent}**: ${a.summary} (see \`${a.markdownReportPath}\`)`),
    "",
    "---",
    "",
    "This system never publishes a factual change automatically and never pushes product-data changes to main on its own. Every finding above is for a human to review. See docs/maintenance-system.md.",
  ];
  return lines.join("\n");
}

async function main() {
  console.log("Running Miloosh maintenance agents...\n");

  const reports = [
    await executeLinksAgent(),
    await executeSocialLinksAgent(),
    await executeSocialChannelHealthAgent(),
    await executeSocialScheduleHealthAgent(),
    await executeFreshnessAgent(),
    await executeSeoAgent(),
    await executeRecommendationsAgent(),
    await executeComparisonsAgent(),
    await executeAffiliateAgent(),
  ];

  for (const report of reports) {
    console.log(`[${report.agent}] ${report.run.status} — ${report.summary}`);
  }

  const agents = reports.map(buildAgentEntry);
  const allAgentsSucceeded = agents.every((a) => a.status === "success" || a.status === "warning");

  const summary: MaintenanceSummary = {
    generatedAt: new Date().toISOString(),
    agents,
    totalCritical: agents.reduce((sum, a) => sum + a.criticalCount, 0),
    totalWarning: agents.reduce((sum, a) => sum + a.warningCount, 0),
    totalInfo: agents.reduce((sum, a) => sum + a.infoCount, 0),
    recommendedHumanActions: buildRecommendedActions(agents),
    allAgentsSucceeded,
  };

  writeSummary(summary, renderSummaryMarkdown(summary));

  console.log(`\nSummary written to var/maintenance/latest-summary.{json,md}`);
  console.log(`Totals: ${summary.totalCritical} critical, ${summary.totalWarning} warning, ${summary.totalInfo} info`);

  // Sprint 12 Phase 11 — inert unless a real provider is configured via
  // env vars (see lib/maintenance/notifications.ts and .env.example).
  // Never blocks or fails the run either way.
  const notification = await sendMaintenanceNotification({
    generatedAt: summary.generatedAt,
    totalCritical: summary.totalCritical,
    totalWarning: summary.totalWarning,
    totalInfo: summary.totalInfo,
    headline: `Miloosh maintenance: ${summary.totalCritical} critical, ${summary.totalWarning} warning, ${summary.totalInfo} info`,
  });
  console.log(
    notification.sent ? "Notification sent." : `Notification not sent (${notification.reason ?? "no provider configured"}).`
  );

  if (!allAgentsSucceeded) {
    console.error("\nOne or more agents failed to complete — see status table above. Exiting non-zero.");
    process.exit(1);
  }
}

main();
