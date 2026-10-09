import { compareDates } from "./evidence";

/**
 * Release & Quality Guardian: a pure verdict over facts that adapters read.
 *
 * The Guardian never runs a gate on its own, never edits a gate and never
 * waives one. It receives each gate's recorded result, compares it with the
 * baseline recorded at the base commit, and answers three questions:
 * is a release allowed, what is red, and is each red thing pre-existing or
 * introduced by the change under review. A gate that was not run is NOT_RUN,
 * which blocks a release exactly as a failure does.
 */

export type GateStatus = "PASS" | "FAIL" | "NOT_RUN";

export type GateName = "audit" | "tests" | "validate-data" | "lint" | "typecheck" | "build";

export type GateResult = {
  gate: GateName;
  /** The exact command that was (or would be) run. */
  command: string;
  status: GateStatus;
  exitCode: number | null;
  /** One-line summary read from the command output, never invented. */
  summary: string;
  /** Stable identifiers of what failed (test ids, advisory ids). Used to tell introduced from pre-existing failures. */
  failureIds: string[];
  ranAt: string | null;
};

export type GateBaseline = {
  baseSha: string;
  results: GateResult[];
};

export type CheckStatus = "PASS" | "FAIL" | "WARN" | "NOT_RUN" | "NOT_VERIFIED" | "INFO";

export type GuardianCheck = {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  evidence: string[];
};

export type GitFacts = {
  branch: string | null;
  headSha: string;
  baseSha: string | null;
  /** Dirty paths in THIS worktree (porcelain). */
  dirtyPaths: string[];
  /** Files this branch changed relative to the base. */
  changedFiles: string[];
  commitsAheadOfBase: number | null;
  pushedToRemote: boolean | null;
};

export type WorktreeFacts = {
  path: string;
  branch: string | null;
  head: string;
  dirtyPaths: string[];
  aheadOfBase: number | null;
};

export type ProductionFacts = {
  /** Live deployment id from the platform, read-only. */
  deploymentId: string | null;
  createdAt: string | null;
  /** SHA the platform's git integration recorded for that deployment, when it records one. */
  deployedSha: string | null;
  /** Production SHAs the hosting platform recorded earlier, newest first. */
  previousProductionShas: string[];
  /** Which of the previous production SHAs are ancestors of the SHA now under review. */
  ancestorOfCurrent: Record<string, boolean>;
};

export type ProtectionFacts = {
  /** Page URLs the change would re-render, derived from the changed files. */
  affectedUrls: string[];
  /** Subset that is protected, observed or in flight. */
  affectedNonEditable: Array<{ url: string; verdict: string }>;
  sharedTemplateChanged: boolean;
};

export type GuardianInputs = {
  now: Date;
  git: GitFacts;
  worktrees: WorktreeFacts[];
  gates: GateResult[];
  baseline: GateBaseline | null;
  protection: ProtectionFacts;
  production: ProductionFacts | null;
  /** Rendered-output comparison against the base build: number of differing page files, or null if not compared. */
  renderedDiff: { compared: number; differing: number; differingSample: string[] } | null;
};

export type GuardianReasonCode = "GATE_FAILED" | "GATE_NOT_RUN" | "DIRTY_WORKTREE" | "PROTECTED_PAGES_AFFECTED" | "PRODUCTION_LINEAGE_DROPPED" | "UNRUN_GATES";

export type GuardianReason = { code: GuardianReasonCode; gate?: GateName; detail: string };

export type GuardianReport = {
  verdict: "RELEASE_ALLOWED" | "RELEASE_BLOCKED" | "NOT_VERIFIED";
  generatedAt: string;
  deploymentAllowedByGuardian: false;
  reasons: GuardianReason[];
  checks: GuardianCheck[];
  gates: Array<GateResult & { baselineStatus: GateStatus | null; relation: "INTRODUCED" | "PRE_EXISTING" | "NO_CHANGE" | "IMPROVED" | "UNKNOWN" }>;
};

function relation(current: GateResult, base: GateResult | undefined): GuardianReport["gates"][number]["relation"] {
  if (!base || base.status === "NOT_RUN" || current.status === "NOT_RUN") return "UNKNOWN";
  if (current.status === "PASS" && base.status === "PASS") return "NO_CHANGE";
  if (current.status === "PASS" && base.status === "FAIL") return "IMPROVED";
  if (current.status === "FAIL" && base.status === "PASS") return "INTRODUCED";
  const baseIds = new Set(base.failureIds);
  const newIds = current.failureIds.filter((id) => !baseIds.has(id));
  if (current.failureIds.length === 0 && base.failureIds.length === 0) return "PRE_EXISTING";
  return newIds.length > 0 ? "INTRODUCED" : "PRE_EXISTING";
}

export const REQUIRED_GATES: readonly GateName[] = ["audit", "tests", "validate-data", "lint", "typecheck", "build"];

export function runGuardian(inputs: GuardianInputs): GuardianReport {
  const checks: GuardianCheck[] = [];
  const reasons: GuardianReason[] = [];
  const baseByGate = new Map((inputs.baseline?.results ?? []).map((g) => [g.gate, g]));

  const gates = REQUIRED_GATES.map((name) => {
    const found = inputs.gates.find((g) => g.gate === name) ?? {
      gate: name,
      command: "(not provided)",
      status: "NOT_RUN" as const,
      exitCode: null,
      summary: "this gate was not run",
      failureIds: [],
      ranAt: null,
    };
    const base = baseByGate.get(name);
    return { ...found, baselineStatus: base?.status ?? null, relation: relation(found, base) };
  });

  for (const gate of gates) {
    const status: CheckStatus = gate.status === "PASS" ? "PASS" : gate.status === "FAIL" ? "FAIL" : "NOT_RUN";
    checks.push({
      id: `gate:${gate.gate}`,
      title: `Gate ${gate.gate}`,
      status,
      detail: `${gate.summary}${gate.baselineStatus ? ` Baseline at the base commit: ${gate.baselineStatus}; relation: ${gate.relation}.` : " No baseline was recorded."}`,
      evidence: [gate.command],
    });
    if (gate.status !== "PASS") {
      reasons.push({
        code: gate.status === "FAIL" ? "GATE_FAILED" : "GATE_NOT_RUN",
        gate: gate.gate,
        detail: `Gate ${gate.gate} is ${gate.status}${gate.relation === "INTRODUCED" ? " and the change introduced it" : gate.relation === "PRE_EXISTING" ? " (pre-existing at the base commit)" : ""}.`,
      });
    }
  }

  // Git cleanliness and ownership.
  const git = inputs.git;
  checks.push({
    id: "git:clean",
    title: "This worktree is clean",
    status: git.dirtyPaths.length === 0 ? "PASS" : "FAIL",
    detail: git.dirtyPaths.length === 0 ? "No uncommitted changes in the worktree under review." : `${git.dirtyPaths.length} uncommitted path(s): ${git.dirtyPaths.slice(0, 5).join(", ")}.`,
    evidence: [`git status --porcelain in ${git.branch ?? git.headSha}`],
  });
  if (git.dirtyPaths.length > 0) reasons.push({ code: "DIRTY_WORKTREE", detail: "The worktree under review has uncommitted changes." });
  checks.push({
    id: "git:base",
    title: "A verified base commit exists",
    status: git.baseSha ? "PASS" : "NOT_VERIFIED",
    detail: git.baseSha ? `Branch is ${git.commitsAheadOfBase ?? "?"} commit(s) ahead of ${git.baseSha.slice(0, 7)}.` : "No base commit was provided, so changed files cannot be attributed.",
    evidence: [],
  });

  // Other work in flight.
  const inFlight = inputs.worktrees.filter((w) => w.dirtyPaths.length > 0 || (w.aheadOfBase ?? 0) > 0);
  checks.push({
    id: "worktrees:inflight",
    title: "Other unfinished work is preserved",
    status: "INFO",
    detail: `${inFlight.length} other worktree(s) hold uncommitted or unmerged work; none is read, merged or deployed by the Guardian: ${inFlight.map((w) => w.branch ?? w.head.slice(0, 7)).join(", ") || "none"}.`,
    evidence: inFlight.map((w) => w.path),
  });

  // Protected experiments.
  const p = inputs.protection;
  checks.push({
    id: "protection:unaffected",
    title: "Protected, observed and in-flight pages are unaffected",
    status: p.affectedNonEditable.length === 0 && !p.sharedTemplateChanged ? "PASS" : "FAIL",
    detail:
      p.affectedNonEditable.length === 0 && !p.sharedTemplateChanged
        ? `${p.affectedUrls.length} page(s) would re-render; none is protected, observed or in flight.`
        : `${p.affectedNonEditable.length} affected page(s) are not editable${p.sharedTemplateChanged ? " and a shared template changed" : ""}: ${p.affectedNonEditable.slice(0, 4).map((a) => `${a.url} (${a.verdict})`).join(", ")}.`,
    evidence: [],
  });
  if (p.affectedNonEditable.length > 0 || p.sharedTemplateChanged) reasons.push({ code: "PROTECTED_PAGES_AFFECTED", detail: "The change can alter pages that are protected, in an observation window or in flight." });

  // Rendered output.
  if (inputs.renderedDiff) {
    const r = inputs.renderedDiff;
    checks.push({
      id: "render:diff",
      title: "Rendered output compared with the base build",
      status: r.differing === 0 ? "PASS" : "WARN",
      detail: `${r.compared} page file(s) compared; ${r.differing} differ${r.differing > 0 ? `, for example ${r.differingSample.slice(0, 3).join(", ")}` : ""}.`,
      evidence: [],
    });
  } else {
    checks.push({ id: "render:diff", title: "Rendered output compared with the base build", status: "NOT_RUN", detail: "No build comparison was supplied.", evidence: [] });
  }

  // Production ancestry.
  if (inputs.production) {
    const prod = inputs.production;
    const notAncestors = prod.previousProductionShas.filter((sha) => prod.ancestorOfCurrent[sha] === false);
    checks.push({
      id: "production:identity",
      title: "Current production deployment is identified",
      status: prod.deploymentId ? "PASS" : "NOT_VERIFIED",
      detail: prod.deploymentId ? `Deployment ${prod.deploymentId}${prod.createdAt ? ` created ${prod.createdAt}` : ""}${prod.deployedSha ? ` from ${prod.deployedSha.slice(0, 7)}` : "; the platform recorded no source SHA"}.` : "Production identity was not read.",
      evidence: ["vercel inspect miloosh.com (read-only)"],
    });
    checks.push({
      id: "production:ancestry",
      title: "The change descends from every recent production SHA",
      status: notAncestors.length === 0 ? "PASS" : "FAIL",
      detail:
        notAncestors.length === 0
          ? `All ${prod.previousProductionShas.length} recent production SHA(s) are ancestors of the SHA under review.`
          : `${notAncestors.length} recent production SHA(s) are not ancestors, so releasing would drop what they shipped: ${notAncestors.map((s) => s.slice(0, 7)).join(", ")}.`,
      evidence: ["hosting platform deployment history"],
    });
    if (notAncestors.length > 0) reasons.push({ code: "PRODUCTION_LINEAGE_DROPPED", detail: "Releasing this SHA would drop work that an earlier production deployment shipped." });
  } else {
    checks.push({ id: "production:identity", title: "Current production deployment is identified", status: "NOT_VERIFIED", detail: "Production identity was not read.", evidence: [] });
  }

  const anyNotRun = gates.some((g) => g.status === "NOT_RUN");
  const anyFail = gates.some((g) => g.status === "FAIL");
  const checkFail = checks.some((c) => c.status === "FAIL");
  let verdict: GuardianReport["verdict"];
  if (anyFail || checkFail) verdict = "RELEASE_BLOCKED";
  else if (anyNotRun) verdict = "NOT_VERIFIED";
  else verdict = "RELEASE_ALLOWED";
  if (verdict === "NOT_VERIFIED") reasons.push({ code: "UNRUN_GATES", detail: "At least one required gate was not run; a release cannot be allowed on unrun gates." });

  return {
    verdict,
    generatedAt: inputs.now.toISOString(),
    deploymentAllowedByGuardian: false,
    reasons,
    checks,
    gates,
  };
}

/** Maps changed files to the URLs they re-render. Software records fan out through the supplied resolver; shared templates set a flag. */
export function affectedByChangedFiles(
  changedFiles: readonly string[],
  resolveSoftware: (slug: string) => string[],
  isSharedTemplate: (file: string) => boolean,
): { affectedUrls: string[]; sharedTemplateChanged: boolean } {
  const urls = new Set<string>();
  let shared = false;
  for (const file of changedFiles) {
    const software = /^data\/software\/([a-z0-9-]+)\.json$/.exec(file);
    if (software) for (const url of resolveSoftware(software[1]!)) urls.add(url);
    else if (isSharedTemplate(file)) shared = true;
  }
  return { affectedUrls: [...urls].sort(), sharedTemplateChanged: shared };
}

/** Which gate failures at the current commit were already failing at the base. Pure helper used by the CLI summary. */
export function newFailureIds(current: GateResult, base: GateResult | undefined): string[] {
  const known = new Set(base?.failureIds ?? []);
  return current.failureIds.filter((id) => !known.has(id));
}

/** True when `later` is the same day or after `earlier`. Convenience for review-date checks. */
export function onOrAfter(later: string, earlier: string): boolean {
  return compareDates(later, earlier) >= 0;
}
