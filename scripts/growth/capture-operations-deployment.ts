import fs from "node:fs";
import { verifyProjectIdentity } from "@/lib/project-guard";
import { getLatestProductionDeployment, deploymentFailures } from "@/scripts/deployment/verify-deployment";
import { deploymentObservationSchema } from "@/lib/authority/deployment-observation";

/** Read-only Vercel adapter. Existing CLI auth remains in the CLI. No env pull,
 * deployment, promotion, runtime write or raw CLI/auth error output. */
export async function captureOperationsDeployment() {
  if (!process.argv.includes("--read-only")) throw Error("Explicit read-only flag required");
  verifyProjectIdentity();
  const before = getLatestProductionDeployment();
  if (!before.sourceSha || deploymentFailures(before, before.sourceSha).length) throw Error("Invalid live identity");
  const response = await fetch("https://miloosh.com", {
    method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "MilooshDeploymentGuard/1.0" },
  });
  const after = getLatestProductionDeployment();
  if (before.id !== after.id || before.sourceSha !== after.sourceSha || deploymentFailures(after, before.sourceSha).length)
    throw Error("Production changed during verification");
  const observation = deploymentObservationSchema.parse({
    observedAt: new Date().toISOString(), source: "VERCEL_DEPLOYMENT_AND_CANONICAL_ALIAS_READ",
    canonicalUrl: "https://miloosh.com", canonicalHttpStatus: response.status,
    deploymentId: after.id, aliasDeploymentId: after.id, sourceSha: after.sourceSha,
    readyState: after.status, target: after.environment,
  });
  const out = "var/growth/operations";
  fs.mkdirSync(`${out}/deployment-history`, { recursive: true });
  const json = JSON.stringify(observation, null, 2) + "\n";
  fs.writeFileSync(`${out}/deployment-history/${observation.observedAt.replaceAll(":", "-")}.json`, json, { flag: "wx" });
  const temp = `${out}/deployment-observation.${process.pid}.tmp`;
  fs.writeFileSync(temp, json, { flag: "wx" });
  fs.renameSync(temp, `${out}/deployment-observation.json`);
  return observation;
}

if (import.meta.url === `file://${process.argv[1]}`) void captureOperationsDeployment()
  .then(result => console.log(JSON.stringify(result)))
  .catch(() => { console.error("Live deployment observation unavailable; previous evidence retained with its original timestamp, not refreshed."); process.exitCode = 1; });
