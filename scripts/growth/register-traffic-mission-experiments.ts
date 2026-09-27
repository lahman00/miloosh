import "../social/_load-env";
import { recordSeoExperimentBatch } from "@/lib/seo-factory/store";
import type { SeoExperiment } from "@/lib/seo-factory/types";
import { TRAFFIC_MISSION_BASELINE } from "@/data/growth/traffic-mission-2026-08-21-baseline";
import { currentProtectionSnapshot, assertCurrentMutation } from "@/lib/google-war/current-protection";

/**
 * Growth War Room mission (2026-08-21) — Phase 0 finding: the 5 pages
 * changed in the prior Organic Traffic Breakthrough mission
 * (todoist/setmore/clickup/sprout-social/activecampaign) were never
 * registered in the canonical seo-factory experiment store
 * (lib/seo-factory/store.ts's readSeoExperiments/recordSeoExperimentBatch)
 * the way the original 9 protected-cohort experiments were — a real gap
 * that could let a future automated seo-factory run (or a future agent
 * not otherwise told) re-touch these pages before their measurement
 * window closes. This script closes that gap using the exact real
 * baseline data already committed to
 * data/growth/traffic-mission-2026-08-21-baseline.ts, matching the same
 * schema and 7/14/28-day checkpoint cadence as the existing 9.
 *
 * Idempotent: recordSeoExperimentBatch refuses to double-register a page
 * already MEASURING, so re-running this is safe.
 *
 * Usage: npx tsx --env-file=.env.local scripts/growth/register-traffic-mission-experiments.ts
 */

const DEPLOYMENT_TIMESTAMP = "2026-08-21T14:06:01.000Z"; // real commit 882475d authored time

function checkpoint(days: 7 | 14 | 28, kind: "DIRECTIONAL" | "PRIMARY") {
  const due = new Date(new Date(DEPLOYMENT_TIMESTAMP).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  return { days, dueAt: due, kind, measuredAt: null };
}

const PRIMARY_QUERY_BY_SLUG: Record<string, { query: string; row: (typeof TRAFFIC_MISSION_BASELINE.rows)[number] }> = {};
for (const row of TRAFFIC_MISSION_BASELINE.rows) {
  const existing = PRIMARY_QUERY_BY_SLUG[row.slug];
  if (!existing || row.impressions > existing.row.impressions) {
    PRIMARY_QUERY_BY_SLUG[row.slug] = { query: row.query, row };
  }
}

const DECISION_HEADINGS: Record<string, string> = {
  todoist: "Decide how far past personal tasks you need to go",
  setmore: "Match the booking model to how you actually work",
  clickup: "Choose an alternative by how your team actually plans work",
  "sprout-social": "Decide between intelligence, simplicity, and visual planning",
  activecampaign: "Match the alternative to your marketing data and workflow",
};

const experiments: SeoExperiment[] = Object.entries(PRIMARY_QUERY_BY_SLUG).map(([slug, { query, row }]) => ({
  id: `seo-exec-2026-08-21-${slug}`,
  page: `/software/${slug}`,
  intervention: "Product-specific alternatives decision guide and contextual comparison graph",
  recordedAt: DEPLOYMENT_TIMESTAMP,
  reason: `Real GSC evidence showed "${query}" ranking position ${row.position} with ${row.impressions} impressions and 0% CTR — an alternatives-intent query landing on a page with no differentiated decision guidance.`,
  baseline: { impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position },
  measurementWindowDays: 28,
  result: null,
  decision: "MEASURING",
  baselineId: `traffic-mission-2026-08-21-${slug}`,
  queryCluster: TRAFFIC_MISSION_BASELINE.rows.filter((r) => r.slug === slug).map((r) => r.query),
  diagnosis: `"${query}" and related alternatives queries had real demand and a deep ranking position, with the existing page offering only a generic alternatives list.`,
  exactChange: `Added "${DECISION_HEADINGS[slug]}", three product-specific buying dimensions, three alternative routes with comparison links, and contextual inbound links from the alternative-decision-guide component.`,
  evidenceSources: ["data/growth/traffic-mission-2026-08-21-baseline.ts"],
  internalLinksChanged: [], // see git commit 882475d for the exact comparisonSlug list per page
  deploymentTimestamp: DEPLOYMENT_TIMESTAMP,
  affiliateStatusAtT0: slug === "todoist" || slug === "setmore" ? "ACTIVE" : "VIABLE",
  checkpoints: [checkpoint(7, "DIRECTIONAL"), checkpoint(14, "DIRECTIONAL"), checkpoint(28, "PRIMARY")],
}));

async function main() {
  const protection = currentProtectionSnapshot();
  if (!process.argv.includes("--execute")) throw new Error("Explicit --execute required for experiment registration");
  assertCurrentMutation(protection.fingerprint, experiments.map(e => e.page));
  const result = await recordSeoExperimentBatch(experiments);
  console.log(`Registered: ${result.recorded}. Total experiments now: ${result.experiments.length}`);
  if (!result.recorded) {
    console.log("Not recorded — likely already registered (idempotent guard) or an id/page collision. This is expected on a re-run.");
  }
}

main();
