import fs from "node:fs";
import path from "node:path";
import { FROZEN_COHORTS } from "@/data/growth/frozen-cohorts";
import { cohortRegistry } from "./cohorts";

export type Protection = {
  page: string;
  state: "ACTIVE_EXPERIMENT" | "COOLDOWN" | "RESERVED";
  until: string | null;
  source: string;
  reason: string;
};
export const LEGACY_RESERVED = [
  "pipedrive",
  "airtable",
  "semrush",
  "freshdesk",
  "buffer",
  "ringcentral",
  "help-scout",
  "intercom",
  "front",
];
/**
 * Master Google Domination reconciliation (2026-09-26) -- this used to be a
 * hardcoded, Wave-1-only snapshot (14 treatment + 10 control), duplicating
 * data/growth/frozen-cohorts.ts and missing Wave 2's own 30+12 cohort
 * entirely (a real protection gap: google-war had no idea Wave 2's pages
 * existed, let alone that they were frozen). Both constants now derive
 * from the single canonical registry so a future wave only ever needs to
 * add an entry there. Values are unchanged for Wave 1 -- this is a pure
 * de-duplication, not a behavior change for the existing cohort.
 */
const WAVE1_COHORT = FROZEN_COHORTS.find((c) => c.wave === "indexation-recovery-20260926");
export const CONCURRENT_TREATMENT = [...(WAVE1_COHORT?.treatment ?? [])];
export const CONCURRENT_CONTROL = [...(WAVE1_COHORT?.control ?? [])];
export type ExperimentInput = {
  page: string;
  decision: string;
  recordedAt: string;
  measurementWindowDays: number;
};
export function experimentProtection(
  experiments: ExperimentInput[],
  now: string,
  source: string,
): Protection[] {
  if (!Number.isFinite(Date.parse(now)))
    throw new Error("Invalid protection clock");
  return experiments.flatMap((e) => {
    const end = Date.parse(e.recordedAt) + e.measurementWindowDays * 86_400_000;
    if (!Number.isFinite(end) || e.measurementWindowDays < 0)
      throw new Error(`Invalid experiment date: ${source}`);
    if (e.decision !== "MEASURING" && end <= Date.parse(now)) return [];
    return [
      {
        page: e.page,
        state:
          e.decision === "MEASURING"
            ? ("ACTIVE_EXPERIMENT" as const)
            : ("COOLDOWN" as const),
        until: new Date(end).toISOString(),
        source,
        reason:
          e.decision === "MEASURING"
            ? "Still MEASURING; overdue checkpoint never silently unlocks editing"
            : "Measurement cooldown",
      },
    ];
  });
}
export function reservedProtection(): Protection[] {
  const legacy = LEGACY_RESERVED.map((slug) => ({
    page: `/software/${slug}`,
    state: "RESERVED" as const,
    until: null,
    source: "Legacy conservative protected cohort in gsc-opportunity-miner; not proof of an active experiment",
    reason: "Existing reservation; explicit review required to release",
  }));
  const waves = FROZEN_COHORTS.flatMap((cohort) =>
    [...cohort.treatment, ...cohort.control].map((slug) => ({
      page: `/software/${slug}`,
      state: "RESERVED" as const,
      until: null,
      source: `data/growth/frozen-cohorts.ts, wave "${cohort.wave}"`,
      reason: cohort.reason,
    })),
  );
  const additional = cohortRegistry().flatMap(c => [...c.treatment, ...c.control].map(page => ({
    page, state: "RESERVED" as const, until: null, source: c.source,
    reason: `${c.id}: ${c.intervention}; measurement-only reservation, not proof of deployment`,
  })));
  return [...legacy, ...waves, ...additional].filter((r, i, all) => all.findIndex(p => p.page === r.page && p.source === r.source) === i);
}
export function loadProtection(
  root = process.cwd(),
  now = new Date().toISOString(),
): Protection[] {
  const entries: Protection[] = reservedProtection();
  const docs = path.join(root, "docs");
  const files = fs.existsSync(docs)
    ? fs
        .readdirSync(docs)
        .filter((f) => /experiment.*\.json$/.test(f))
        .map((f) => path.join(docs, f))
    : [];
  const runtime = path.join(root, "var/agents/seo-factory-experiments.json");
  if (fs.existsSync(runtime)) files.push(runtime);
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")); // Corrupt protection must fail closed.
    const experiments = Array.isArray(raw) ? raw : raw.experiments;
    if (
      !Array.isArray(experiments) ||
      experiments.some(
        (e) =>
          !e.page ||
          !e.decision ||
          !e.recordedAt ||
          typeof e.measurementWindowDays !== "number",
      )
    )
      throw new Error(
        `Invalid experiment protection: ${path.relative(root, file)}`,
      );
    entries.push(
      ...experimentProtection(experiments, now, path.relative(root, file)),
    );
  }
  return entries;
}
export function protectionFor(page: string, protections: Protection[]) {
  return protections.filter((p) => p.page === page);
}
export function assertSafeLinkChange(
  source: string,
  target: string,
  protections: Protection[],
) {
  if ([source, target].some((p) => protectionFor(p, protections).length))
    throw new Error(`Protected link change: ${source} -> ${target}`);
}
