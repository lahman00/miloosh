import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getAllSoftware } from "@/data/software";
import { flagEvidence } from "@/lib/decision-room/maintenance";

/**
 * npm run growth:evidence-maintenance -- [--today YYYY-MM-DD] [--out dir]
 * Read-only. Lists dated or ambiguous vendor facts that need a human re-read. Does not edit data or pages.
 */
export function run(): number {
  const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? undefined : process.argv[i + 1]; };
  const today = arg("today") ?? new Date().toISOString().slice(0, 10);
  const all = getAllSoftware();
  const flags = flagEvidence(all, today);
  const byFlag = new Map<string, number>();
  for (const f of flags) byFlag.set(f.flag, (byFlag.get(f.flag) ?? 0) + 1);
  const summary = { today, products: all.length, withVerifiedPricing: all.filter((s) => s.pricing?.status === "verified").length, flaggedProducts: new Set(flags.map((f) => f.slug)).size, flags: Object.fromEntries(byFlag) };
  const out = arg("out");
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    fs.writeFileSync(path.join(out, "evidence-review-queue.csv"), ["slug,flag,detail", ...flags.map((f) => [f.slug, f.flag, f.detail].map(cell).join(","))].join("\n") + "\n");
    fs.writeFileSync(path.join(out, "evidence-review-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  }
  console.log(JSON.stringify(summary, null, 2));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(run());
