import { execFileSync } from "node:child_process";
import { verifyProjectIdentity } from "@/lib/project-guard";

export interface DeploymentRecord {
  id: string; url: string; status: string; environment: string;
  aliases: string[]; sourceSha: string | null;
}

export function verifiedAliases(id: string, reported: string[], assignment: { alias?: string; deploymentId?: string }): string[] {
  // Deployment.alias can remain the build-time list after promotion. The
  // canonical alias record is the authoritative current assignment instead.
  const aliases = reported.filter(alias => alias !== "miloosh.com");
  if (assignment.alias === "miloosh.com" && assignment.deploymentId === id) aliases.push("miloosh.com");
  return aliases;
}

/** Resolve the LIVE alias, never the newest (possibly unpromoted) build.
 * Existing CLI auth stays in Vercel; only non-secret metadata is returned. */
export function getLatestProductionDeployment(): DeploymentRecord {
  const raw = execFileSync("vercel", ["api", "/v13/deployments/miloosh.com", "--raw"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 45000, maxBuffer: 16 * 1024 * 1024,
  });
  const record = JSON.parse(raw);
  const assignment = JSON.parse(execFileSync("vercel", ["api", "/v4/aliases/miloosh.com", "--raw"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 45000, maxBuffer: 1024 * 1024,
  }));
  return {
    id: record.id, url: `https://${record.url}`, status: record.readyState,
    environment: record.target, aliases: verifiedAliases(record.id, record.alias ?? [], assignment),
    sourceSha: record.meta?.githubCommitSha ?? record.gitSource?.sha ?? null,
  };
}

export function deploymentFailures(record: DeploymentRecord, expectedSha: string): string[] {
  const failures: string[] = [];
  if (!/^dpl_[a-zA-Z0-9]+$/.test(record.id ?? "")) failures.push("Missing deployment identity");
  if (record.status !== "READY") failures.push("Live deployment is not READY");
  if (record.environment !== "production") failures.push("Live deployment is not Production");
  if (!record.aliases.includes("miloosh.com")) failures.push("Canonical alias is not assigned to this deployment");
  if (!/^[a-f0-9]{40}$/i.test(expectedSha) || record.sourceSha !== expectedSha) failures.push("Live source SHA does not match the expected commit (or is unknown)");
  return failures;
}

export async function verifyLiveDeployment(expectedCommit?: string) {
  verifyProjectIdentity();
  if (expectedCommit && !/^[a-f0-9]{7,40}$/i.test(expectedCommit)) throw Error("Expected commit must be a Git SHA");
  const expectedSha = execFileSync("git", ["rev-parse", "--verify", `${expectedCommit ?? "HEAD"}^{commit}`], { encoding: "utf8" }).trim();
  const deployment = getLatestProductionDeployment();
  const failures = deploymentFailures(deployment, expectedSha);
  const response = await fetch("https://miloosh.com", {
    method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "MilooshDeploymentGuard/1.0" },
  });
  if (response.status !== 200) failures.push(`Canonical endpoint returned HTTP ${response.status}; redirects/login pages are not a pass`);
  // Detect a concurrent alias promotion during verification.
  const after = getLatestProductionDeployment();
  if (after.id !== deployment.id || after.sourceSha !== deployment.sourceSha) failures.push("Production changed during verification");
  if (!after.aliases.includes("miloosh.com")) failures.push("Canonical alias assignment changed during verification");
  console.log(JSON.stringify({ expectedSha, deployment, canonicalHttpStatus: response.status, failures }, null, 2));
  if (failures.length) throw Error("Deployment guard BLOCKED: " + failures.join("; "));
  console.log("DEPLOYMENT GUARD PASSED: exact source, READY production alias and canonical HTTP 200 verified");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyLiveDeployment(process.argv[2]).catch(() => {
    // Never echo CLI/auth error objects. Unreadable metadata is not a pass.
    console.error("Deployment verification failed or evidence unavailable.");
    process.exitCode = 1;
  });
}
