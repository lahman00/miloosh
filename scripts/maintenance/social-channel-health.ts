import { ADAPTERS } from "@/lib/social/channels/registry";
import { getSocialStrategy } from "@/lib/social/strategy";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { Channel } from "@/lib/social/types";
import type { MaintenanceIssue } from "@/types/maintenance";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Phase 3 —
 * built after finding bluesky and mastodon marked `enabledChannels: true`
 * in data/social/social-strategy.json while having zero real credentials
 * in Vercel production the whole time (confirmed via `vercel env ls` and
 * real queue history: every single production publish attempt on both
 * channels failed with "missing env"). Nothing previously cross-checked
 * the strategy config against real channel configuration automatically —
 * lib/social/channels/registry.ts's getAllChannelHealth exists and is
 * shown on /internal/social, but a human has to actually look at that
 * page. This closes the gap the same way scripts/maintenance/
 * social-links.ts closes it for dead internal links.
 *
 * Deliberately calls each adapter's isConfigured()/missingEnv() directly
 * rather than going through getChannelHealth() — that function always
 * reports "linkedin"/"reddit" as NEEDS_OWNER_AUTH regardless of real
 * config (a dashboard-semantics label: "no simple single automatable
 * API," not a live-broken signal), which would make this checker
 * permanently false-positive on LinkedIn even though its real Buffer
 * transport is confirmed working via actual queue history. Excluded
 * here for a second, independent reason too: LinkedIn's active transport
 * is chosen by LINKEDIN_TRANSPORT, which is Vercel-Sensitive-flagged and
 * redacted to "[SENSITIVE]" in any locally-pulled .env.local (same class
 * of limitation documented for GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT/
 * CRON_SECRET) — this checker cannot correctly resolve LinkedIn's real
 * transport outside of Vercel's own runtime, so it doesn't try; anyone
 * running `npm run maintenance` in a context with the real production
 * values (a Vercel-triggered run, not a local `.env.local` session)
 * would not have this limitation and could safely extend coverage back
 * to LinkedIn.
 *
 * escalateCriticalToFailure: true because an enabled-but-broken channel
 * is our own configuration being wrong, not a fact about the outside
 * world (matches seo.ts's and social-links.ts's precedent).
 */
const NOT_LOCALLY_VERIFIABLE: Channel[] = ["linkedin"];
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";

async function run() {
  const strategy = getSocialStrategy();
  const issues: MaintenanceIssue[] = [];
  let checked = 0;
  let broken = 0;
  let skipped = 0;

  for (const [channel, isEnabled] of Object.entries(strategy.enabledChannels) as [Channel, boolean][]) {
    if (!isEnabled) continue;
    const adapter = ADAPTERS[channel];
    if (NOT_LOCALLY_VERIFIABLE.includes(channel)) {
      skipped++;
      continue;
    }
    // Scheduled GitHub maintenance intentionally lacks Vercel production secrets.
    // Missing env in that runner is therefore not evidence that production is broken.
    if (IS_GITHUB_ACTIONS && !adapter.isConfigured()) {
      skipped++;
      continue;
    }
    checked++;
    if (adapter.isConfigured()) continue;

    broken++;
    const missing = adapter.missingEnv();
    issues.push({
      id: `social-channel-health-${channel}`,
      severity: "critical",
      title: `Channel "${channel}" is enabled in social-strategy.json but missing required configuration`,
      description: `Missing: ${missing.join(", ") || "unknown"}. Every real publish attempt on this channel will fail until this is fixed. Either supply the missing credentials in Vercel production, or set enabledChannels.${channel} to false in data/social/social-strategy.json until it's ready — leaving it "enabled" while broken wastes content-generation effort on variants that can never publish.`,
      location: channel,
    });
  }

  return {
    summary: `Checked ${checked} enabled channel(s) (${skipped} skipped — not verifiable in this runtime, see module header). ${broken > 0 ? `${broken} enabled but not publishable.` : "All locally-verifiable enabled channels are publishable."}`,
    issues,
    data: { checked, broken, skipped },
  };
}

export async function executeSocialChannelHealthAgent() {
  const report = await runAgent("social-channel-health", run, { escalateCriticalToFailure: true });
  writeReport(report);
  return report;
}

async function main() {
  const report = await executeSocialChannelHealthAgent();
  console.log(`[social-channel-health] ${report.summary}`);
  console.log(`[social-channel-health] run status: ${report.run.status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
