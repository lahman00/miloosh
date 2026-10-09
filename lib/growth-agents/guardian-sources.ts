import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import {
  type GateName,
  type GateResult,
  type GitFacts,
  type ProductionFacts,
  type WorktreeFacts,
} from "./guardian";
import { listWorktrees, parsePorcelainPaths } from "./protection-sources";

/**
 * Read-only adapters for the Release & Quality Guardian.
 *
 * Reading git and the hosting platform changes nothing. Running a gate does
 * write build output (`.next`) and, for vitest, files under `var/`; those are
 * gitignored and are only produced when the caller passes --run-gates. No
 * function here edits a gate's configuration, installs a package, deploys,
 * pushes or merges.
 */

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["--no-optional-locks", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitOrNull(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

export function collectGitFacts(repoRoot: string, baseSha: string | null): GitFacts {
  const headSha = git(repoRoot, ["rev-parse", "HEAD"]).trim();
  const branch = gitOrNull(repoRoot, ["branch", "--show-current"])?.trim() || null;
  const dirtyPaths = parsePorcelainPaths(git(repoRoot, ["status", "--porcelain", "--untracked-files=all"]));
  const committed = baseSha ? (gitOrNull(repoRoot, ["diff", "--name-only", `${baseSha}...HEAD`]) ?? "").split("\n").filter(Boolean) : [];
  const changedFiles = [...new Set([...committed, ...dirtyPaths])].sort();
  const ahead = baseSha ? gitOrNull(repoRoot, ["rev-list", "--count", `${baseSha}..HEAD`]) : null;
  return {
    branch,
    headSha,
    baseSha,
    dirtyPaths,
    changedFiles,
    commitsAheadOfBase: ahead === null ? null : Number(ahead.trim()),
    pushedToRemote: null,
  };
}

export function collectWorktreeFacts(repoRoot: string, baseSha: string | null, ownPath: string): WorktreeFacts[] {
  return listWorktrees(repoRoot)
    .filter((w) => path.resolve(w.path) !== path.resolve(ownPath))
    .map((w) => {
      const dirty = gitOrNull(w.path, ["status", "--porcelain", "--untracked-files=all"]);
      const ahead = baseSha ? gitOrNull(repoRoot, ["rev-list", "--count", `${baseSha}..${w.head}`]) : null;
      return {
        path: w.path,
        branch: w.branch,
        head: w.head,
        dirtyPaths: dirty === null ? [] : parsePorcelainPaths(dirty),
        aheadOfBase: ahead === null ? null : Number(ahead.trim()),
      };
    });
}

/** Parses `vercel inspect <domain>` text for the deployment id and creation time. Pure; the command output is passed in. */
export function parseVercelInspect(output: string): { deploymentId: string | null; createdAt: string | null; target: string | null; status: string | null } {
  const id = /\bid\s+(dpl_[A-Za-z0-9]+)/.exec(output)?.[1] ?? null;
  const target = /\btarget\s+(\w+)/.exec(output)?.[1] ?? null;
  const status = /\bstatus\s+\S*\s*(\w+)/.exec(output)?.[1] ?? null;
  const created = /\bcreated\s+(.+?)\s+\[/.exec(output)?.[1] ?? null;
  const parsed = created ? Date.parse(created.replace(/\s*\(.*\)\s*$/, "")) : NaN;
  return { deploymentId: id, createdAt: Number.isNaN(parsed) ? null : new Date(parsed).toISOString(), target, status };
}

/** Production SHAs from the GitHub Deployments API response (newest first). Pure. */
export function parseProductionDeployments(json: unknown): Array<{ sha: string; createdAt: string }> {
  if (!Array.isArray(json)) return [];
  return json
    .filter((d): d is { sha: string; created_at: string; environment?: string } => typeof d === "object" && d !== null && typeof (d as { sha?: unknown }).sha === "string" && typeof (d as { created_at?: unknown }).created_at === "string")
    .filter((d) => (d.environment ?? "Production").toLowerCase().startsWith("production"))
    .map((d) => ({ sha: d.sha, createdAt: d.created_at }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isAncestor(repoRoot: string, maybeAncestor: string, descendant: string): boolean | null {
  if (gitOrNull(repoRoot, ["cat-file", "-e", `${maybeAncestor}^{commit}`]) === null) return null;
  try {
    execFileSync("git", ["--no-optional-locks", "merge-base", "--is-ancestor", maybeAncestor, descendant], { cwd: repoRoot, stdio: "ignore", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
    return true;
  } catch (error) {
    const status = (error as { status?: number }).status;
    return status === 1 ? false : null;
  }
}

export type CommandResult = { status: number | null; stdout: string; stderr: string };
export type CommandRunner = (file: string, args: string[], options: { cwd: string; timeoutMs: number }) => CommandResult;

const runCommand: CommandRunner = (file, args, options) => {
  const result = spawnSync(file, args, { cwd: options.cwd, encoding: "utf8", timeout: options.timeoutMs, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
};

/** The Vercel CLI writes its report to stderr and leaves stdout empty, so both streams are read. */
export const combinedOutput = (result: CommandResult): string => `${result.stdout}\n${result.stderr}`;

/**
 * Read-only production facts. Network: one `vercel inspect` and one GitHub Deployments read, both GET-equivalent.
 * `run` is injectable so tests can prove which commands are issued and how their output is read.
 */
export function collectProductionFacts(options: { repoRoot: string; currentSha: string; domain: string; githubRepo: string | null; recentLimit?: number; run?: CommandRunner }): ProductionFacts {
  const run = options.run ?? runCommand;
  let inspect = { deploymentId: null as string | null, createdAt: null as string | null };
  const inspected = run("vercel", ["inspect", options.domain], { cwd: options.repoRoot, timeoutMs: 90_000 });
  if (inspected.status === 0) inspect = parseVercelInspect(combinedOutput(inspected));
  // Left null otherwise: the Guardian reports production identity as NOT_VERIFIED.
  let deployments: Array<{ sha: string; createdAt: string }> = [];
  if (options.githubRepo) {
    const listed = run("gh", ["api", `repos/${options.githubRepo}/deployments?environment=Production&per_page=${options.recentLimit ?? 8}`], { cwd: options.repoRoot, timeoutMs: 60_000 });
    if (listed.status === 0) {
      try {
        deployments = parseProductionDeployments(JSON.parse(listed.stdout));
      } catch {
        deployments = [];
      }
    }
  }
  const previous = [...new Set(deployments.map((d) => d.sha))];
  const ancestorOfCurrent: Record<string, boolean> = {};
  for (const sha of previous) {
    const result = isAncestor(options.repoRoot, sha, options.currentSha);
    if (result !== null) ancestorOfCurrent[sha] = result;
  }
  return {
    deploymentId: inspect.deploymentId,
    createdAt: inspect.createdAt,
    deployedSha: deployments[0]?.sha ?? null,
    previousProductionShas: previous.filter((sha) => sha in ancestorOfCurrent),
    ancestorOfCurrent,
  };
}

// ---- Gate runners and parsers --------------------------------------------------------------

/** `checkout` is the folder the tests ran in: failure identifiers are relative to it, so the same failure has the same identifier in any folder. */
export function parseVitestJson(json: unknown, checkout: string = process.cwd()): { failed: number; passed: number; total: number; failureIds: string[] } {
  const root = json as { numFailedTests?: number; numPassedTests?: number; numTotalTests?: number; testResults?: Array<{ name?: string; assertionResults?: Array<{ fullName?: string; ancestorTitles?: string[]; title?: string; status?: string }> }> };
  const failureIds: string[] = [];
  for (const file of root.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status !== "failed") continue;
      const label = assertion.fullName ?? [...(assertion.ancestorTitles ?? []), assertion.title ?? ""].join(" > ");
      const base = file.name ? path.relative(checkout, file.name) : "unknown-file";
      failureIds.push(`${base} > ${label}`);
    }
  }
  return { failed: root.numFailedTests ?? failureIds.length, passed: root.numPassedTests ?? 0, total: root.numTotalTests ?? 0, failureIds: failureIds.sort() };
}

export function parseAuditJson(json: unknown): { counts: Record<string, number>; advisoryIds: string[] } {
  const root = json as { metadata?: { vulnerabilities?: Record<string, number> }; vulnerabilities?: Record<string, { via?: Array<string | { url?: string; source?: number }> }> };
  const ids = new Set<string>();
  for (const vulnerability of Object.values(root.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via === "object" && via.url) {
        const ghsa = /GHSA-[a-z0-9-]+/i.exec(via.url)?.[0];
        if (ghsa) ids.add(ghsa);
      }
    }
  }
  return { counts: root.metadata?.vulnerabilities ?? {}, advisoryIds: [...ids].sort() };
}

type CommandSpec = { gate: GateName; command: string; file: string; args: string[] };

export const GATE_COMMANDS: readonly CommandSpec[] = [
  { gate: "audit", command: "npm audit --audit-level=moderate --json", file: "npm", args: ["audit", "--audit-level=moderate", "--json"] },
  { gate: "tests", command: "npx vitest run --reporter=json", file: "npx", args: ["vitest", "run", "--reporter=json"] },
  { gate: "validate-data", command: "npm run validate:data", file: "npm", args: ["run", "validate:data"] },
  { gate: "lint", command: "npm run lint", file: "npm", args: ["run", "lint"] },
  { gate: "typecheck", command: "npx tsc --noEmit", file: "npx", args: ["tsc", "--noEmit"] },
  { gate: "build", command: "npm run build", file: "npm", args: ["run", "build"] },
];

/** Runs one gate. Never edits configuration, never passes --force, never retries. */
export function runGate(repoRoot: string, spec: CommandSpec, now: () => Date = () => new Date()): GateResult {
  const started = now();
  const run = spawnSync(spec.file, spec.args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, env: { ...process.env, CI: "1" } });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  const exitCode = run.status;
  const base = { gate: spec.gate, command: spec.command, exitCode, ranAt: started.toISOString() };
  const status = exitCode === 0 ? ("PASS" as const) : ("FAIL" as const);
  try {
    if (spec.gate === "tests") {
      const parsed = parseVitestJson(JSON.parse(stdout.slice(stdout.indexOf("{"))), repoRoot);
      return { ...base, status, summary: `${parsed.passed} passed, ${parsed.failed} failed of ${parsed.total} tests.`, failureIds: parsed.failureIds };
    }
    if (spec.gate === "audit") {
      const parsed = parseAuditJson(JSON.parse(stdout));
      const c = parsed.counts;
      return { ...base, status, summary: `Advisories: ${c.critical ?? 0} critical, ${c.high ?? 0} high, ${c.moderate ?? 0} moderate, ${c.low ?? 0} low.`, failureIds: parsed.advisoryIds };
    }
  } catch {
    return { ...base, status, summary: "The command's JSON output could not be parsed; the exit code is authoritative.", failureIds: [] };
  }
  const tail = (stdout + stderr).trim().split("\n").slice(-1)[0] ?? "";
  const tsErrors = spec.gate === "typecheck" ? (stdout.match(/error TS\d+/g) ?? []).length : 0;
  return { ...base, status, summary: spec.gate === "typecheck" ? `${tsErrors} TypeScript error(s).` : tail.slice(0, 160) || `exit code ${exitCode}`, failureIds: [] };
}

export function notRun(spec: CommandSpec): GateResult {
  return { gate: spec.gate, command: spec.command, status: "NOT_RUN", exitCode: null, summary: "not run in this invocation (pass --run-gates to execute the repository's real gate)", failureIds: [], ranAt: null };
}
