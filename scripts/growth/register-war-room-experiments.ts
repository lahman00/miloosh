import "../social/_load-env";
import { recordSeoExperimentBatch } from "@/lib/seo-factory/store";
import type { SeoExperiment } from "@/lib/seo-factory/types";
import { GROWTH_WAR_ROOM_BASELINE } from "@/data/growth/growth-war-room-2026-08-21-baseline";
import { currentProtectionSnapshot, assertCurrentMutation } from "@/lib/google-war/current-protection";

/**
 * Growth War Room mission (2026-08-21) — registers the second batch of
 * changed pages (salesforce/tidio/lastpass/confluence/mulesoft) in the
 * canonical seo-factory experiment store, same pattern as
 * scripts/growth/register-traffic-mission-experiments.ts. Idempotent.
 *
 * Usage: npx tsx --env-file=.env.local scripts/growth/register-war-room-experiments.ts
 */

const DEPLOYMENT_TIMESTAMP = new Date().toISOString(); // set at commit time; see the mission report for the exact deployment ID this corresponds to

const DECISION_HEADINGS: Record<string, string> = {
  salesforce: "Decide how much of the go-to-market suite you actually need",
  tidio: "Decide what kind of support operation you're running",
  lastpass: "Decide what matters most: openness, monitoring, or admin control",
  confluence: "Decide how your team actually keeps knowledge current",
  mulesoft: "Decide which part of API management you actually need",
};

function checkpoint(days: 7 | 14 | 28, kind: "DIRECTIONAL" | "PRIMARY", base: string) {
  const due = new Date(new Date(base).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  return { days, dueAt: due, kind, measuredAt: null };
}

const experiments: SeoExperiment[] = GROWTH_WAR_ROOM_BASELINE.rows.map((row) => ({
  id: `seo-exec-2026-08-21-warroom-${row.slug}`,
  page: row.targetUrl,
  intervention: "Product-specific alternatives decision guide and contextual comparison graph",
  recordedAt: DEPLOYMENT_TIMESTAMP,
  reason: `Real GSC evidence showed "${row.query}" ranking position ${row.position} with ${row.impressions} impressions and 0% CTR.`,
  baseline: { impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position },
  measurementWindowDays: 28,
  result: null,
  decision: "MEASURING",
  baselineId: `growth-war-room-2026-08-21-${row.slug}`,
  queryCluster: [row.query],
  diagnosis: `"${row.query}" had real demand and a deep ranking position, with the existing page offering only a generic alternatives list.`,
  exactChange: `Added "${DECISION_HEADINGS[row.slug]}", three product-specific buying dimensions, three alternative routes with comparison links.`,
  evidenceSources: ["data/growth/growth-war-room-2026-08-21-baseline.ts"],
  internalLinksChanged: [],
  deploymentTimestamp: DEPLOYMENT_TIMESTAMP,
  affiliateStatusAtT0: row.affiliateStatusAtCapture,
  checkpoints: [checkpoint(7, "DIRECTIONAL", DEPLOYMENT_TIMESTAMP), checkpoint(14, "DIRECTIONAL", DEPLOYMENT_TIMESTAMP), checkpoint(28, "PRIMARY", DEPLOYMENT_TIMESTAMP)],
}));

async function main() {
  const protection = currentProtectionSnapshot();
  if (!process.argv.includes("--execute")) throw new Error("Explicit --execute required for experiment registration");
  assertCurrentMutation(protection.fingerprint, experiments.map(e => e.page));
  const result = await recordSeoExperimentBatch(experiments);
  console.log(`Registered: ${result.recorded}. Total experiments now: ${result.experiments.length}`);
}

main();
