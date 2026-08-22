import fs from "node:fs";
import path from "node:path";
import { getAllSoftware, getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug, getComparisonsInvolving } from "@/data/comparisons";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Priority 2 —
 * "Google trusts 50 excellent Miloosh pages before Google indexes 1,500
 * mediocre ones." Every row is explicitly labeled by evidence type, per
 * instruction:
 *
 *   CURRENT  — would require a fresh GSC pull; never available this
 *              session (access remains blocked).
 *   CACHED   — real GSC evidence from data/seo/priority-snapshot.json, a
 *              deliberately reviewed, GIT-COMMITTED snapshot (see
 *              scripts/growth/generate-priority-snapshot.ts). Real, but a
 *              point-in-time snapshot rather than a live pull — check its
 *              own generatedAt/sourceRunGeneratedAt fields for exact
 *              freshness.
 *   INFERRED — no direct demand evidence exists for this specific page;
 *              scored only on structural proxies (comparison-graph
 *              connectivity, freshness). Never presented as if it were
 *              real demand data.
 *
 * MILOOSH CLAUDE OVERNIGHT WAR MISSION (2026-08-22/23), P0 — this used to
 * read var/agents/gsc-opportunity-mining.json, a local/gitignored file.
 * That degraded safely (never crashed a build, per the 2026-08-22 P0 fix,
 * c348417) but public rendering (the homepage's "popular" picks, via
 * buildIndexationPriorityList) still silently depended on whatever
 * happened to be sitting in the DEPLOYING MACHINE's local var/ directory —
 * confirmed empirically: this agent's own `vercel deploy` uploaded its
 * local var/ cache directly, bypassing git, so a truly clean checkout (or
 * a different contributor's machine) would have rendered different
 * content with no error and no visible signal anything was environment-
 * dependent. Fixed by moving the CACHED evidence source for public
 * rendering to a real, committed file instead — same bytes, every build,
 * every machine, reviewable in a git diff. loadCachedGscOpportunities()
 * below (the old var/-backed loader) is kept only as analysis-only
 * tooling, never called by buildIndexationPriorityList anymore.
 *
 * Scoring is deliberately simple and auditable (no learned weights, no
 * black box): real evidence always outranks inferred evidence, and within
 * each tier, more connectivity + fresher data wins.
 */

type GscOpportunity = { targetSlug: string; baselineImpressions: number; baselinePosition: number };

export const GSC_CACHE_PATH = path.join(process.cwd(), "var", "agents", "gsc-opportunity-mining.json");

function isGscOpportunity(value: unknown): value is GscOpportunity {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.targetSlug === "string" && typeof v.baselineImpressions === "number" && typeof v.baselinePosition === "number";
}

/**
 * ANALYSIS-ONLY. Reads the local/gitignored agent cache — never called by
 * buildIndexationPriorityList (see PRIORITY_SNAPSHOT_PATH below for the
 * public-safe committed equivalent). Kept for scripts that specifically
 * want to compare a fresh local pull against the committed snapshot.
 * Never throws, never fabricates: a missing file, a malformed file, or a
 * file whose shape doesn't match what's expected all resolve to the same
 * safe outcome — an empty map.
 */
export function loadCachedGscOpportunities(): Map<string, GscOpportunity> {
  try {
    const raw = fs.readFileSync(GSC_CACHE_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const list = parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).allOpportunities)
      ? (parsed as { allOpportunities: unknown[] }).allOpportunities
      : [];
    const valid = list.filter(isGscOpportunity);
    return new Map(valid.map((o) => [o.targetSlug, o]));
  } catch {
    return new Map();
  }
}

type PrioritySnapshotRow = { url: string; impressions: number; clicks: number; ctr: number; position: number };

export const PRIORITY_SNAPSHOT_PATH = path.join(process.cwd(), "data", "seo", "priority-snapshot.json");

function isPrioritySnapshotRow(value: unknown): value is PrioritySnapshotRow {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.url === "string" && typeof v.impressions === "number" && typeof v.clicks === "number" && typeof v.position === "number";
}

/**
 * PUBLIC-SAFE. Reads the committed data/seo/priority-snapshot.json — real
 * GSC evidence, but deterministic (same file everywhere) rather than a
 * live/ephemeral read. This is the evidence source buildIndexationPriorityList
 * actually uses for CACHED rows. Same fail-safe posture as the loader
 * above: missing/malformed file or entries degrade to an empty map /
 * dropped rows, never a crash, never fabricated data — even though this
 * file IS committed (so "missing" shouldn't normally happen), a future
 * bad edit or merge conflict must not be able to break the build or
 * public rendering either.
 */
export function loadPrioritySnapshot(): Map<string, PrioritySnapshotRow> {
  try {
    const raw = fs.readFileSync(PRIORITY_SNAPSHOT_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const list = parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).rows) ? (parsed as { rows: unknown[] }).rows : [];
    const valid = list.filter(isPrioritySnapshotRow);
    return new Map(valid.map((r) => [r.url, r]));
  } catch {
    return new Map();
  }
}

export interface IndexationPriorityRow {
  url: string;
  kind: "software" | "comparison";
  evidenceType: "CACHED" | "INFERRED";
  gscImpressions?: number;
  gscClicks?: number;
  gscCtr?: number;
  gscPosition?: number;
  connectivity: number;
  accessedAt: string;
  score: number;
}

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000);
}

export function buildIndexationPriorityList(topN = 50): IndexationPriorityRow[] {
  const snapshotByUrl = loadPrioritySnapshot();
  const rows: IndexationPriorityRow[] = [];

  for (const software of getAllSoftware()) {
    const url = `/software/${software.slug}`;
    const gsc = snapshotByUrl.get(url);
    const connectivity = getComparisonsInvolving(software.slug).length;
    const freshnessScore = Math.max(0, 30 - daysSince(software.accessedAt)); // real signal within a 30-day window; older data contributes nothing extra, never penalized below 0
    const score = gsc ? gsc.impressions * 10 + (100 - Math.min(100, gsc.position)) + connectivity + freshnessScore : connectivity * 2 + freshnessScore;
    rows.push({
      url,
      kind: "software",
      evidenceType: gsc ? "CACHED" : "INFERRED",
      ...(gsc ? { gscImpressions: gsc.impressions, gscClicks: gsc.clicks, gscCtr: gsc.ctr, gscPosition: gsc.position } : {}),
      connectivity,
      accessedAt: software.accessedAt,
      score: Math.round(score * 10) / 10,
    });
  }

  for (const [aSlug, bSlug] of PUBLISHED_COMPARISONS) {
    const slug = getComparisonSlug(aSlug, bSlug);
    const url = `/compare/${slug}`;
    const gsc = snapshotByUrl.get(url);
    const softwareA = getSoftware(aSlug);
    const softwareB = getSoftware(bSlug);
    if (!softwareA || !softwareB) continue;
    const connectivity = getComparisonsInvolving(aSlug).length + getComparisonsInvolving(bSlug).length;
    const accessedAt = [softwareA.accessedAt, softwareB.accessedAt].sort().at(-1)!;
    const freshnessScore = Math.max(0, 30 - daysSince(accessedAt));
    const score = gsc ? gsc.impressions * 10 + (100 - Math.min(100, gsc.position)) + connectivity * 0.5 + freshnessScore : connectivity * 0.5 + freshnessScore;
    rows.push({
      url,
      kind: "comparison",
      evidenceType: gsc ? "CACHED" : "INFERRED",
      ...(gsc ? { gscImpressions: gsc.impressions, gscClicks: gsc.clicks, gscCtr: gsc.ctr, gscPosition: gsc.position } : {}),
      connectivity,
      accessedAt,
      score: Math.round(score * 10) / 10,
    });
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, topN);
}

async function main() {
  const snapshotAvailable = loadPrioritySnapshot().size > 0;
  const rows = buildIndexationPriorityList(50);
  const cachedCount = rows.filter((r) => r.evidenceType === "CACHED").length;
  console.log("========================================================================================");
  if (!snapshotAvailable) {
    console.log(` NOTE: ${PRIORITY_SNAPSHOT_PATH} is missing, empty, or invalid on this run — every row below is INFERRED (structural proxies only, no real GSC demand evidence). Regenerate it with scripts/growth/generate-priority-snapshot.ts.`);
  }
  console.log(` TOP 50 PAGES TO STRENGTHEN FOR INDEXATION TRUST (${cachedCount} backed by real committed GSC evidence, ${rows.length - cachedCount} inferred from structural proxies only)`);
  console.log("========================================================================================");
  for (const r of rows) {
    const evidence = r.evidenceType === "CACHED" ? `CACHED: ${r.gscImpressions} impr / ${r.gscClicks} clicks @ pos ${r.gscPosition?.toFixed(1)}` : "INFERRED (no direct demand evidence)";
    console.log(`   ${r.url.padEnd(45)} score ${r.score.toString().padStart(6)} | ${evidence}`);
  }
  console.log("========================================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
