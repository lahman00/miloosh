import fs from "node:fs";
import path from "node:path";
import { readLatestSeoFactoryRun } from "@/lib/seo-factory/store";

/**
 * MILOOSH CLAUDE OVERNIGHT WAR MISSION (2026-08-22/23), P0 — production
 * determinism. Root cause of the bug this replaces: the homepage's
 * "popular" ranking (app/page.tsx) read var/agents/gsc-opportunity-
 * mining.json at runtime -- a local, gitignored file. That file is safe
 * from crashing the BUILD (fixed in an earlier P0, c348417), but it still
 * meant public rendering could silently differ depending on which machine
 * ran `vercel deploy` and what happened to be sitting in that machine's
 * local var/ directory -- confirmed empirically: the deployed homepage
 * showed real-evidence rankings only because this agent's local laptop
 * had that file, not because of anything committed to git. A truly clean
 * checkout (or Vercel's own git-integration, or a different contributor's
 * machine) would silently render different "popular" picks with no error
 * and no visible signal that anything was environment-dependent.
 *
 * This script is the fix's ANALYSIS/GENERATION half: it reads the real,
 * fresh SEO Factory run (lib/seo-factory/store.ts's readLatestSeoFactoryRun,
 * backed by Vercel Blob in production, real authenticated GSC data as of
 * this mission 2026-08-22: run generatedAt 2026-08-21T22:03:28Z, 28-day
 * window 2026-07-22..2026-08-18, 2,564 real query+page rows) and writes a
 * small, reviewed, GIT-COMMITTED snapshot containing only the minimum
 * fields public ranking needs: URL + impressions + clicks + CTR +
 * position, aggregated per URL. No queries, no score breakdowns, no
 * affiliate/money fields -- those exist in the full SEO Factory run for
 * internal analysis only and have no legitimate reason to influence or
 * appear in public-facing ranking data.
 *
 * This is a manually-run, manually-reviewed generator, not a build step
 * or a cron -- exactly per the mission's target architecture ("create a
 * deliberately reviewed committed snapshot with explicit provenance").
 * Re-run it and review the diff whenever a materially fresher SEO Factory
 * run is worth adopting; do not wire it into an automatic pipeline that
 * commits without a human/agent actually looking at the change.
 */

export interface PrioritySnapshotRow {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface PrioritySnapshot {
  schemaVersion: 1;
  generatedAt: string;
  sourceRunId: string;
  sourceRunGeneratedAt: string;
  windowStartDate: string;
  windowEndDate: string;
  note: string;
  rows: PrioritySnapshotRow[];
}

export const PRIORITY_SNAPSHOT_PATH = path.join(process.cwd(), "data", "seo", "priority-snapshot.json");

async function main() {
  const run = await readLatestSeoFactoryRun();
  if (!run) {
    console.error("No SEO Factory run available (Blob store empty/unreachable and no local fallback present). Nothing to generate -- leaving any existing committed snapshot untouched.");
    process.exit(1);
  }

  const byUrl = new Map<string, { impressions: number; clicks: number; weightedPosition: number }>();
  for (const opp of run.opportunities) {
    if (!opp.targetUrl) continue;
    const existing = byUrl.get(opp.targetUrl) ?? { impressions: 0, clicks: 0, weightedPosition: 0 };
    existing.impressions += opp.gsc.impressions;
    existing.clicks += opp.gsc.clicks;
    existing.weightedPosition += opp.gsc.position * opp.gsc.impressions;
    byUrl.set(opp.targetUrl, existing);
  }

  const rows: PrioritySnapshotRow[] = [...byUrl.entries()]
    .map(([url, agg]) => ({
      url,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? Math.round((agg.clicks / agg.impressions) * 10000) / 10000 : 0,
      position: agg.impressions > 0 ? Math.round((agg.weightedPosition / agg.impressions) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const snapshot: PrioritySnapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceRunId: run.id,
    sourceRunGeneratedAt: run.generatedAt,
    windowStartDate: run.window.startDate,
    windowEndDate: run.window.endDate,
    note: "Reviewed, git-committed snapshot derived from a real authenticated Google Search Console pull (via lib/seo-factory). Aggregated per URL (impressions/clicks summed, position impression-weighted) from run.opportunities, which itself caps at the top 100 highest-scoring query+page rows -- this is a real but partial view of the full pull (2,564 raw rows), not exhaustive. Regenerate with scripts/growth/generate-priority-snapshot.ts and review the diff before committing a refresh.",
    rows,
  };

  fs.writeFileSync(PRIORITY_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote ${rows.length} rows to ${PRIORITY_SNAPSHOT_PATH}`);
  console.log(`Source run: ${run.id} (generated ${run.generatedAt}, window ${run.window.startDate}..${run.window.endDate})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
