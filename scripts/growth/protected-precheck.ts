import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { loadProtection } from "@/lib/google-war/protection";
import { protectedChangeFindings } from "@/lib/authority/operations";
import deployment from "@/docs/growth/receipts/20260927-production-release/deployment.json";

// Read-only integration preview; never checkout, merge, stash, deploy or override.
const option = (flag: string, fallback: string) => process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : fallback;
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
try {
  const base = git("rev-parse", "--verify", option("--base", deployment.sourceSha) + "^{commit}");
  const candidate = option("--candidate", "");
  const head = candidate ? git("rev-parse", "--verify", candidate + "^{commit}") : git("rev-parse", "HEAD");
  const comparisonBase = candidate ? git("merge-base", base, head) : base;
  const files = [...new Set([
    ...git("diff", "--name-only", comparisonBase, head).split("\n"),
    ...(!candidate ? git("diff", "--name-only", "HEAD").split("\n") : []),
    ...(!candidate ? git("ls-files", "--others", "--exclude-standard").split("\n") : []),
  ].filter(Boolean))];
  const findings = protectedChangeFindings(files, loadProtection());
  const result = { checkedAt: new Date().toISOString(), base, comparisonBase, candidate: head, files, findings,
    status: findings.length ? "BLOCKED_PROTECTED_REVIEW" : "PASS",
    note: "Known protected/direct and shared paths only; not an OS lock. Full rendered artifact comparison remains required. No approval bypass.", productionChanged: false };
  fs.mkdirSync("var/growth/operations", { recursive: true });
  fs.writeFileSync("var/growth/operations/" + (candidate ? "integration-preview" : "protected-precheck") + ".json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (findings.length) process.exitCode = 1;
} catch { console.error("Protected precheck failed closed; no changes made"); process.exitCode = 1; }
