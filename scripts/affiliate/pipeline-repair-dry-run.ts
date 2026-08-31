import "./_load-env";
import fs from "node:fs";
import path from "node:path";
import { readAffiliatePipeline } from "@/lib/revenue/affiliate-pipeline";
import { AGENTS_DIR } from "@/lib/agents/paths";
import { computeRemediationPlan, formatRemediationReport, KNOWN_STALE_CANDIDATES, type SourceContext } from "@/lib/revenue/affiliate-pipeline-repair-plan";

/**
 * DRY-RUN ONLY. Prints the exact mutation plan for the 9 known-stale pipeline
 * records documented in data/affiliate/PIPELINE_REMEDIATION_MANIFEST_2026-08-29.md.
 * Performs a read-only pipeline read (reusing readAffiliatePipeline(), the same
 * already-read-only function scripts/affiliate/audit.ts uses) and never touches
 * a write path.
 *
 * This script does not import writeAffiliatePipeline, setPipelineStatus,
 * correctOwnerActionReason, or @vercel/blob's `put` — a live mutation is not
 * reachable from this file, not merely unused. See
 * tests/lib/affiliate-pipeline-repair-plan.test.ts's "never imports a
 * write-capable symbol" test, which inspects this file's real source.
 */

const LOCAL_FALLBACK_PATH = path.join(AGENTS_DIR, "affiliate-pipeline.json");

/**
 * Determines which source readAffiliatePipeline() will actually read from —
 * for reporting only; the real fallback decision still lives in
 * lib/revenue/affiliate-pipeline.ts and is not duplicated here. If neither a
 * Blob token nor a local fallback file exists, readAffiliatePipeline() would
 * return [] indistinguishably from "genuinely empty", which the manifest
 * itself already flagged as unsafe to assume — so this case is reported as
 * "unavailable" rather than read at all.
 */
async function resolveSourceContext(): Promise<SourceContext> {
  const hasToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasLocalFallback = fs.existsSync(LOCAL_FALLBACK_PATH);

  if (!hasToken && !hasLocalFallback) {
    return { label: "unavailable", entries: null };
  }

  const entries = await readAffiliatePipeline();
  return { label: hasToken ? "live-blob" : "local-fallback", entries };
}

async function main() {
  const ctx = await resolveSourceContext();
  const report = computeRemediationPlan(ctx, KNOWN_STALE_CANDIDATES);
  for (const line of formatRemediationReport(report)) console.log(line);

  const unresolvedCount = report.records.filter((r) => r.kind === "unresolved").length;
  if (unresolvedCount > 0) {
    console.log(`\n${unresolvedCount} record(s) are UNRESOLVED — see above. Exiting non-zero for CI/owner attention.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { resolveSourceContext };
