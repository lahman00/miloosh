import { readQueue } from "@/lib/social/queue";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Track A ask #7
 * — health checking for the new social-schedule cron (app/api/cron/
 * social-schedule/route.ts). The publish cron's own health is easy to
 * observe (it either produces real published posts or it doesn't); the
 * schedule cron's failure mode is quieter — if it silently stopped
 * running, the SCHEDULED runway would just drain to zero over ~14 days
 * with no obvious symptom until the publish cron ran completely dry.
 * This makes that failure mode loud instead: flags critical if there's a
 * real backlog (APPROVED_FOR_AUTO > 0) but the SCHEDULED runway has
 * fallen below a floor that a working daily cron should never allow.
 *
 * escalateCriticalToFailure: true — an empty runway while backlog exists
 * means OUR OWN automation stopped working, not a fact about the outside
 * world (same precedent as seo.ts, social-links.ts, social-channel-health.ts).
 */
const MIN_RUNWAY_DAYS = 3; // the daily cron schedules up to DAYS_AHEAD=14 days out; falling below this many days of SCHEDULED runway while backlog exists is a real signal, not noise

async function run() {
  const queue = await readQueue();
  const approvedCount = queue.filter((e) => e.state === "APPROVED_FOR_AUTO").length;
  const scheduled = queue.filter((e) => e.state === "SCHEDULED" && e.scheduledFor);

  const now = Date.now();
  const futureScheduled = scheduled.filter((e) => new Date(e.scheduledFor!).getTime() > now);
  const runwayDays = futureScheduled.length > 0
    ? Math.max(...futureScheduled.map((e) => (new Date(e.scheduledFor!).getTime() - now) / (24 * 60 * 60 * 1000)))
    : 0;

  const issues: MaintenanceIssue[] = [];
  if (approvedCount > 0 && runwayDays < MIN_RUNWAY_DAYS) {
    issues.push({
      id: "social-schedule-runway-low",
      severity: "critical",
      title: `Scheduling runway is only ${runwayDays.toFixed(1)} day(s) deep while ${approvedCount} entries remain APPROVED_FOR_AUTO`,
      description: `A working daily social-schedule cron (app/api/cron/social-schedule/route.ts, "0 8 * * *" in vercel.json) should keep at least ${MIN_RUNWAY_DAYS} days of SCHEDULED runway ahead whenever real backlog exists. This thin a runway with backlog still available suggests the cron stopped running, is failing silently, or CRON_SECRET is misconfigured. Check Vercel's cron invocation history and function logs for /api/cron/social-schedule; a manual "npx tsx --env-file=.env.local scripts/social/schedule.ts --live" run can also confirm it still works and buy time while investigating.`,
      location: "social-schedule cron",
    });
  }

  return {
    summary: `${scheduled.length} SCHEDULED entries (${runwayDays.toFixed(1)} day(s) of runway), ${approvedCount} still APPROVED_FOR_AUTO. ${issues.length > 0 ? "Runway is critically thin." : "Runway looks healthy."}`,
    issues,
    data: { approvedCount, scheduledCount: scheduled.length, runwayDays },
  };
}

export async function executeSocialScheduleHealthAgent() {
  const report = await runAgent("social-schedule-health", run, { escalateCriticalToFailure: true });
  writeReport(report);
  return report;
}

async function main() {
  const report = await executeSocialScheduleHealthAgent();
  console.log(`[social-schedule-health] ${report.summary}`);
  console.log(`[social-schedule-health] run status: ${report.run.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
