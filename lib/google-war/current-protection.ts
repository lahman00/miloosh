import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import type { Protection } from "./protection";

// CLI boundary only. A new interpreter reads canonical TS registries, not the
// importing process's module cache or a historical Google War report.
export const PROTECTION_SOURCES = ["lib/google-war/protection.ts", "lib/google-war/cohorts.ts",
  "data/growth/frozen-cohorts.ts", "data/experiments/comparison-quality-cohort.ts",
  "data/comparisons.ts", "data/comparison-waves/catalog-expansion-2026-09.ts", "docs/growth/receipts/20260926-ranking-war/changes.json",
  "docs/growth/receipts/20260926-ranking-war/controls.json",
  "docs/growth/receipts/20260926-google-war-phase2/comparison-treatment.json"];
export function protectionFingerprint(root = process.cwd()) {
  const experiments = fs.readdirSync(path.join(root, "docs")).filter(f => /experiment.*\.json$/.test(f)).map(f => "docs/" + f);
  const runtime = "var/agents/seo-factory-experiments.json";
  const files = [...PROTECTION_SOURCES, ...experiments, ...(fs.existsSync(path.join(root, runtime)) ? [runtime] : [])].sort();
  const hash = createHash("sha256");
  for (const file of files) hash.update(file + "\0").update(fs.readFileSync(path.join(root, file))).update("\0");
  return hash.digest("hex"); // Missing/corrupt input never means unprotected.
}
const protectionSchema = z.array(z.object({ page: z.string().startsWith("/"),
  state: z.enum(["ACTIVE_EXPERIMENT", "COOLDOWN", "RESERVED"]), until: z.string().nullable(), source: z.string(), reason: z.string() }));
let lastRead: { root: string; fingerprint: string; checkedAt: string; entries: Protection[] } | undefined;
export function currentProtectionSnapshot(root = process.cwd(), now = new Date().toISOString()) {
  if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid protection clock");
  const fingerprint = protectionFingerprint(root);
  // Hash ALL inputs on every call, including added/removed runtime experiments.
  // Reuse parsed entries only for byte-identical inputs, a forward clock, and
  // no cooldown crossing. Repeated catalog checks must not launch hundreds of
  // interpreters on a busy machine. Any file change or expiry forces a reload.
  if (lastRead?.root === root && lastRead.fingerprint === fingerprint &&
    Date.parse(now) >= Date.parse(lastRead.checkedAt) &&
    !lastRead.entries.some(e => e.state === "COOLDOWN" && e.until !== null && Date.parse(e.until) <= Date.parse(now))) {
    return { fingerprint, checkedAt: now, entries: structuredClone(lastRead.entries) };
  }
  const raw = execFileSync(process.execPath, ["--import", "tsx", "--eval",
    "const {loadProtection}=require('./lib/google-war/protection.ts');process.stdout.write(JSON.stringify(loadProtection(process.cwd(),process.argv[1])))", now],
  { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 2_000_000, stdio: ["ignore", "pipe", "pipe"] });
  const entries = protectionSchema.parse(JSON.parse(raw));
  if (fingerprint !== protectionFingerprint(root)) throw new Error("Protection registry changed during read; mutation denied");
  lastRead = { root, fingerprint, checkedAt: now, entries: structuredClone(entries) };
  return { fingerprint, checkedAt: now, entries };
}
export function loadCurrentProtection(root = process.cwd(), now = new Date().toISOString()): Protection[] {
  return currentProtectionSnapshot(root, now).entries;
}
export function staleProtectionAlert(cached: unknown, current: string) {
  return cached === current ? null : { code: "STALE_PROTECTION_SNAPSHOT", severity: "HIGH" as const,
    target: "protection-registry", reason: "Cached protection is missing or differs from CURRENT canonical inputs. Mutation authorization denied; refresh the report." };
}
/** Call directly before synchronous writes. Snapshot is evidence, never authority. */
export function assertCurrentMutation(cached: unknown, pages: string[], root = process.cwd()) {
  const current = currentProtectionSnapshot(root);
  if (staleProtectionAlert(cached, current.fingerprint)) throw new Error("STALE_PROTECTION_SNAPSHOT: mutation denied");
  for (const page of pages) if (current.entries.some(p => p.page === page)) throw new Error("Protected mutation denied: " + page);
  return current;
}
