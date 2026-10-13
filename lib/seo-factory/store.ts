import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR } from "@/lib/agents/paths";
import type { SeoExperiment, SeoExperimentBaseline, SeoFactoryRun } from "@/lib/seo-factory/types";
import { experimentIsCoolingDown } from "@/lib/seo-factory/policy";

const LATEST_BLOB = "seo-factory/latest-run.json";
const EXPERIMENTS_BLOB = "seo-factory/experiments.json";
const LOCAL_LATEST = path.join(AGENTS_DIR, "seo-factory-latest.json");
const LOCAL_EXPERIMENTS = path.join(AGENTS_DIR, "seo-factory-experiments.json");
const BASELINES_BLOB = "seo-factory/experiment-baselines.json";
const LOCAL_BASELINES = path.join(AGENTS_DIR, "seo-factory-experiment-baselines.json");

function hasBlob(): boolean { return Boolean(process.env.BLOB_READ_WRITE_TOKEN); }
function readLocal<T>(file: string, fallback: T): T { try { return JSON.parse(fs.readFileSync(file, "utf-8")) as T; } catch { return fallback; } }
function writeLocal(file: string, value: unknown): void { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); }

async function readBlob<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return fallback;
    return JSON.parse(await new Response(result.stream).text()) as T;
  } catch { return fallback; }
}

async function writeBlob(pathname: string, value: unknown): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(pathname, JSON.stringify(value), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
}

export async function readLatestSeoFactoryRun(): Promise<SeoFactoryRun | null> {
  return hasBlob() ? readBlob(LATEST_BLOB, null) : readLocal(LOCAL_LATEST, null);
}

export async function writeSeoFactoryRun(run: SeoFactoryRun): Promise<void> {
  await assertMutationAllowed();
  if (!hasBlob()) { writeLocal(LOCAL_LATEST, run); return; }
  await writeBlob(`seo-factory/runs/${run.id}.json`, run);
  await writeBlob(LATEST_BLOB, run);
}

export async function readSeoExperiments(): Promise<SeoExperiment[]> {
  return hasBlob() ? readBlob(EXPERIMENTS_BLOB, []) : readLocal(LOCAL_EXPERIMENTS, []);
}

export async function writeSeoExperiments(experiments: SeoExperiment[]): Promise<void> {
  await assertMutationAllowed();
  if (!hasBlob()) { writeLocal(LOCAL_EXPERIMENTS, experiments); return; }
  await writeBlob(EXPERIMENTS_BLOB, experiments);
}

export async function recordSeoExperiment(experiment: SeoExperiment): Promise<{ recorded: boolean; experiments: SeoExperiment[] }> {
  await assertMutationAllowed();
  const existing = await readSeoExperiments();
  const prior = existing.filter((item) => item.page === experiment.page).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  if (prior && (prior.decision === "MEASURING" || experimentIsCoolingDown(prior.recordedAt, prior.measurementWindowDays))) {
    return { recorded: false, experiments: existing };
  }
  const updated = [...existing, experiment];
  await writeSeoExperiments(updated);
  return { recorded: true, experiments: updated };
}

export async function recordSeoExperimentBatch(experiments: SeoExperiment[]): Promise<{ recorded: boolean; experiments: SeoExperiment[] }> {
  await assertMutationAllowed();
  const existing = await readSeoExperiments();
  const ids = new Set(existing.map((item) => item.id));
  const measuringPages = new Set(existing.filter((item) => item.decision === "MEASURING").map((item) => item.page));
  const batchIds = new Set<string>();
  const batchPages = new Set<string>();
  const invalid = experiments.some((item) => ids.has(item.id) || measuringPages.has(item.page) || batchIds.has(item.id) || batchPages.has(item.page) || (batchIds.add(item.id), batchPages.add(item.page), false));
  if (invalid) return { recorded: false, experiments: existing };
  const updated = [...existing, ...experiments];
  await writeSeoExperiments(updated);
  return { recorded: true, experiments: updated };
}

export async function readSeoExperimentBaselines(): Promise<SeoExperimentBaseline[]> {
  return hasBlob() ? readBlob(BASELINES_BLOB, []) : readLocal(LOCAL_BASELINES, []);
}

export async function recordSeoExperimentBaselines(baselines: SeoExperimentBaseline[]): Promise<{ recorded: boolean; baselines: SeoExperimentBaseline[] }> {
  await assertMutationAllowed();
  const existing = await readSeoExperimentBaselines();
  const ids = new Set(existing.map((item) => item.id));
  if (baselines.some((item) => ids.has(item.id))) return { recorded: false, baselines: existing };
  const updated = [...existing, ...baselines];
  if (!hasBlob()) writeLocal(LOCAL_BASELINES, updated);
  else await writeBlob(BASELINES_BLOB, updated);
  return { recorded: true, baselines: updated };
}

export async function claimSeoFactoryRun(day: string): Promise<boolean> {
  await assertMutationAllowed();
  if (!hasBlob()) return true;
  try {
    const { put } = await import("@vercel/blob");
    await put(`seo-factory/claims/${day}.json`, JSON.stringify({ day, claimedAt: new Date().toISOString() }), { access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: "application/json" });
    return true;
  } catch { return false; }
}

export async function releaseSeoFactoryRunClaim(day: string): Promise<void> {
  await assertMutationAllowed();
  if (!hasBlob()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(`seo-factory/claims/${day}.json`);
  } catch {
    // A stuck claim is safer than overlapping analysis. The next UTC day resets it.
  }
}
