import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** Local, fail-closed release check. Does not push, deploy, index or access a
 * merchant. A PASS verifies the candidate artifact, NOT production promotion. */
const steps = [
  ["protected-intake", "npx", ["tsx", "scripts/growth/protected-precheck.ts"]],
  ["typecheck", "npx", ["tsc", "--noEmit"]],
  ["lint", "npm", ["run", "lint"]],
  ["tests", "npm", ["test"]],
  ["static-gate-tests", "npm", ["run", "test:static-gate"]],
  ["data", "npm", ["run", "validate:data"]],
  ["affiliate", "npm", ["run", "affiliate:audit"]],
  ["build", "npm", ["run", "build"]],
  ["static", "python3", ["scripts/deployment/verify-static-release.py", "--dist", ".next-miloosh-qa"]],
  ["query-store", "npx", ["tsx", "scripts/growth/import-query-page.ts"]],
  ["google-war", "npm", ["run", "growth:google-war"]],
  ["command-center", "npx", ["tsx", "scripts/growth/google-command-center.ts", "--strict"]],
  ["browser-smoke", "npm", ["run", "growth:google-browser-qa"]],
  ["diff-check", "git", ["diff", "--check"]],
] as const;
const output = "var/growth/google-command/release";
fs.mkdirSync(output, { recursive: true });
const results = [];
for (const [name, command, args] of steps) {
  const start = new Date().toISOString();
  console.log(`Google release gate: ${name}`);
  const r = spawnSync(command, [...args], { encoding: "utf8", maxBuffer: 30_000_000,
    env: { ...process.env, MILOOSH_QA_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1" } });
  fs.writeFileSync(path.join(output, `${name}.log`), `${r.stdout ?? ""}\n${r.stderr ?? ""}`);
  results.push({ name, start, end: new Date().toISOString(), exitCode: r.status, error: r.error ? "Process failed" : null });
  fs.writeFileSync(path.join(output, "gates.json"), JSON.stringify({ productionChanged: false, results }, null, 2));
  if (r.status !== 0 || r.error) { console.error(`FAILED: ${name}; see ${output}/${name}.log`); process.exit(1); }
}
console.log(`PASS: ${results.length} local gates; production unchanged. Full browser crawl remains a separate post-integration operation.`);
