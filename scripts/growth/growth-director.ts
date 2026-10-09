import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { OWNER_ACTION_PACKS } from "@/data/affiliate/owner-action-packs";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { EXPECTED_REPO_SLUG } from "@/lib/project-guard";
import { runDirectorCli, type CliOptions, type Ports } from "@/lib/growth-agents/director-cli";
import { GATE_COMMANDS, collectGitFacts, collectProductionFacts, collectWorktreeFacts, runGate } from "@/lib/growth-agents/guardian-sources";
import { loadSiteInventory } from "@/lib/growth-agents/inventory-loader";
import { loadPartnerFacts } from "@/lib/growth-agents/partners";
import { headSha, isSharedInputFile, loadProtectionSnapshot } from "@/lib/growth-agents/protection-sources";
import { redactText } from "@/lib/growth-agents/redact";

/**
 * `npm run growth:director` — the Miloosh Growth Director, read-only by default.
 *
 * It reads a Search Console capture directory, the repository registries and
 * git, runs the Google Recovery, Affiliate Revenue and Release Guardian agents
 * and prints one Hebrew report. It writes files only when --out is given, runs
 * the repository's real gates only with --run-gates, and queries the hosting
 * platform and GitHub (read-only) only with --check-production. It never
 * deploys, pushes, merges, submits a URL to Google or contacts a partner.
 */

const USAGE = `Usage: npm run growth:director -- [options]

  --gsc-dir <dir>            Search Console capture directory (manifest.json + tables). Required for a real run.
  --gsc-private-dir <dir>    Private tables kept outside git (search queries).
  --now <ISO timestamp>      Report time (default: now).
  --base-sha <sha>           Production source commit used for observation windows and in-flight work.
  --release-date <YYYY-MM-DD>  Date of the latest production release.
  --production-id <id> --production-created <ISO> --production-sha <sha>   Owner-recorded production facts.
  --extras-file <json>       Per-page evidence (live checks, intent, vendor-confirmed gaps).
  --events-file <json>       First-party analytics events (array) for the funnel; otherwise the funnel is UNAVAILABLE.
  --gates-file <json>        Recorded gate results.   --baseline-file <json>   Gate results at the base commit.
  --rendered-diff-file <json>  Result of growth:rendered-diff comparing the base build with this change.
  --run-gates                Run audit, tests, validate:data, lint, tsc and build (slow; writes .next and var/).
  --check-production         Read the live deployment (vercel inspect) and GitHub deployment history (read-only).
  --out <dir>                Write director-report.json, director-report.he.md and candidates.csv here. Without it nothing is written.
  --strict                   Exit 3 when required evidence is missing.
  --help
`;

export function parseArgs(argv: string[], repoRoot: string): CliOptions | { help: true } {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(arg.slice(2), next);
      i += 1;
    } else flags.set(arg.slice(2), true);
  }
  if (flags.has("help")) return { help: true };
  const value = (name: string): string | null => {
    const v = flags.get(name);
    return typeof v === "string" ? v : null;
  };
  const known = new Set(["gsc-dir", "gsc-private-dir", "now", "base-sha", "release-date", "production-id", "production-created", "production-sha", "extras-file", "events-file", "gates-file", "baseline-file", "rendered-diff-file", "run-gates", "check-production", "out", "strict", "help"]);
  for (const key of flags.keys()) if (!known.has(key)) throw new Error(`Unknown option --${key}\n${USAGE}`);
  const now = value("now") ? new Date(value("now")!) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("--now must be an ISO timestamp");
  const resolve = (p: string | null) => (p ? path.resolve(repoRoot, p) : null);
  const productionId = value("production-id");
  const productionCreated = value("production-created");
  const productionSha = value("production-sha");
  return {
    repoRoot,
    now,
    gscDir: resolve(value("gsc-dir")),
    gscPrivateDir: resolve(value("gsc-private-dir")),
    extrasFile: resolve(value("extras-file")),
    eventsFile: resolve(value("events-file")),
    baselineFile: resolve(value("baseline-file")),
    gatesFile: resolve(value("gates-file")),
    renderedDiffFile: resolve(value("rendered-diff-file")),
    runGates: flags.get("run-gates") === true,
    checkProduction: flags.get("check-production") === true,
    productionOverride: productionId || productionCreated || productionSha ? { deploymentId: productionId, createdAt: productionCreated, sha: productionSha } : null,
    releaseDate: value("release-date"),
    baseSha: value("base-sha"),
    outDir: resolve(value("out")),
    strict: flags.get("strict") === true,
  };
}

export function realPorts(repoRoot: string): Ports {
  return {
    readText: (p) => fs.readFileSync(p, "utf8"),
    writeText: (p, content) => fs.writeFileSync(p, content, "utf8"),
    makeDirectory: (dir) => fs.mkdirSync(dir, { recursive: true }),
    headSha,
    loadInventory: (sha, now) => loadSiteInventory({ checkoutSha: sha, now }),
    loadProtection: (sha, baseSha, today, now, inventory) =>
      loadProtectionSnapshot({
        repoRoot,
        baseSha,
        today,
        ownWorktreePath: repoRoot,
        knownComparisonSlugs: new Set(inventory.comparisons.keys()),
        checkoutSha: sha,
        generatedAt: now.toISOString(),
      }),
    loadPartners: loadPartnerFacts,
    programStatus: (slug) => {
      const relationship = CURRENT_AFFILIATE_LEDGER.find((r) => r.productSlugs.includes(slug));
      return { status: relationship?.status ?? null, note: relationship?.ownerBlocker ? redactText(relationship.ownerBlocker).slice(0, 200) : null };
    },
    ownerPackTitles: () => Object.fromEntries(OWNER_ACTION_PACKS.map((pack) => [pack.id, redactText(pack.title)])),
    gitFacts: collectGitFacts,
    worktreeFacts: collectWorktreeFacts,
    productionFacts: (root, sha) => collectProductionFacts({ repoRoot: root, currentSha: sha, domain: "miloosh.com", githubRepo: EXPECTED_REPO_SLUG }),
    runGates: (root) => GATE_COMMANDS.map((spec) => runGate(root, spec)),
    isSharedTemplate: isSharedInputFile,
  };
}

export function main(argv: string[], repoRoot = process.cwd()): number {
  let options: ReturnType<typeof parseArgs>;
  try {
    options = parseArgs(argv, repoRoot);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  if ("help" in options) {
    console.log(USAGE);
    return 0;
  }
  const result = runDirectorCli(options, realPorts(repoRoot));
  process.stdout.write(result.stdout);
  for (const file of result.written) console.error(`written: ${path.relative(repoRoot, file)}`);
  return result.exitCode;
}

// The guard compares real file URLs: the naive `file://${process.argv[1]}` form never matches a path
// containing spaces or non-ASCII characters (this workspace's path has both) and would silently do nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
