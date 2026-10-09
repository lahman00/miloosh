import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DECISION_MONEY_PAGES } from "@/data/growth/decision-money-pages";
import { CONTROL_COHORT, TREATMENT_COHORT } from "@/data/experiments/comparison-quality-cohort";
import { FIRST_REVENUE_CONTENT_UPDATED_AT, FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { readProtectedExperimentSlugs } from "@/scripts/growth/gsc-opportunity-miner";
import { addDays, compareDates } from "./evidence";
import {
  buildProtectionSnapshot,
  type ProtectionSignal,
  type ProtectionSnapshot,
  type ProtectionSourceStatus,
  type SharedInputInFlight,
} from "./protection";
import { comparisonUrl, softwareUrl } from "./urls";

/**
 * Read-only adapter that turns the repository's experiment registries and git state into a ProtectionSnapshot.
 *
 * It never writes. Git is invoked with optional locks disabled so that reading another worktree cannot
 * refresh its index. Every source reports `ok: false` instead of throwing, which makes the affected
 * verdicts UNKNOWN rather than silently EDITABLE.
 */

/** Operating choice from the Growth OS measurement contract: directional review at 14 and 28 days. */
export const OBSERVATION_WINDOW_DAYS = 28;

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["--no-optional-locks", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function headSha(repoRoot: string): string {
  return git(repoRoot, ["rev-parse", "HEAD"]).trim();
}

/** Slugs whose experiment record in docs/work-revenue-experiment-receipt-*.json is still MEASURING. */
export function readMeasuringReceipts(root: string): Array<{ slug: string; recordedAt: string | null; windowDays: number | null; file: string }> {
  const docsDir = path.join(root, "docs");
  if (!fs.existsSync(docsDir)) return [];
  const out: Array<{ slug: string; recordedAt: string | null; windowDays: number | null; file: string }> = [];
  for (const file of fs.readdirSync(docsDir).filter((name) => /^work-revenue-experiment-receipt-.*\.json$/.test(name)).sort()) {
    const receipt = JSON.parse(fs.readFileSync(path.join(docsDir, file), "utf8")) as {
      experiments?: Array<{ page?: string; decision?: string; recordedAt?: string; measurementWindowDays?: number }>;
    };
    for (const experiment of receipt.experiments ?? []) {
      if (experiment.decision !== "MEASURING" || !experiment.page?.startsWith("/software/")) continue;
      out.push({
        slug: experiment.page.slice("/software/".length),
        recordedAt: experiment.recordedAt ?? null,
        windowDays: typeof experiment.measurementWindowDays === "number" ? experiment.measurementWindowDays : null,
        file: `docs/${file}`,
      });
    }
  }
  return out;
}

export type RegistrySignals = { signals: ProtectionSignal[]; sources: ProtectionSourceStatus[] };

/** Signals from the in-repo registries. `today` is the report date (YYYY-MM-DD). */
export function collectRegistrySignals(root: string, today: string): RegistrySignals {
  const signals: ProtectionSignal[] = [];
  const sources: ProtectionSourceStatus[] = [];

  let receipts: ReturnType<typeof readMeasuringReceipts> = [];
  try {
    receipts = readMeasuringReceipts(root);
    for (const receipt of receipts) {
      const end = receipt.recordedAt && receipt.windowDays ? addDays(receipt.recordedAt.slice(0, 10), receipt.windowDays) : null;
      const elapsed = end !== null && compareDates(end, today) < 0;
      signals.push({
        source: "measuring-receipts",
        kind: "PROTECTED",
        urls: [softwareUrl(receipt.slug)],
        detail: `Experiment record is still MEASURING${end ? ` (declared window ended ${end}${elapsed ? "; the record has not been closed, so the owner must close it before the page is released" : ""})` : ""}.`,
        evidence: receipt.file,
        ...(elapsed ? { needsClosure: true } : {}),
      });
    }
    sources.push({ id: "measuring-receipts", ok: true, count: receipts.length, locator: "docs/work-revenue-experiment-receipt-*.json" });
  } catch (error) {
    sources.push({ id: "measuring-receipts", ok: false, count: 0, locator: "docs/work-revenue-experiment-receipt-*.json", note: errorText(error) });
  }

  try {
    const firstRevenue = new Set<string>(FIRST_REVENUE_PAGES.map((page) => page.slug));
    const receiptSlugs = new Set(receipts.map((r) => r.slug));
    const union = readProtectedExperimentSlugs(root);
    const legacy = [...union].filter((slug) => !receiptSlugs.has(slug) && !firstRevenue.has(slug)).sort();
    for (const slug of legacy) {
      signals.push({
        source: "legacy-cohort",
        kind: "PROTECTED",
        urls: [softwareUrl(slug)],
        detail: "Member of the legacy protected experiment cohort in scripts/growth/gsc-opportunity-miner.ts.",
        evidence: "scripts/growth/gsc-opportunity-miner.ts",
      });
    }
    sources.push({ id: "legacy-cohort", ok: true, count: legacy.length, locator: "scripts/growth/gsc-opportunity-miner.ts#readProtectedExperimentSlugs" });
  } catch (error) {
    sources.push({ id: "legacy-cohort", ok: false, count: 0, locator: "scripts/growth/gsc-opportunity-miner.ts", note: errorText(error) });
  }

  try {
    for (const page of FIRST_REVENUE_PAGES) {
      signals.push({
        source: "first-revenue-cohort",
        kind: "PROTECTED",
        urls: [softwareUrl(page.slug)],
        detail: `First-revenue cohort page (content updated ${FIRST_REVENUE_CONTENT_UPDATED_AT}); the owner treats this cohort as the active conversion campaign.`,
        evidence: "data/revenue/first-revenue-cohort.ts",
      });
    }
    sources.push({ id: "first-revenue-cohort", ok: true, count: FIRST_REVENUE_PAGES.length, locator: "data/revenue/first-revenue-cohort.ts" });
  } catch (error) {
    sources.push({ id: "first-revenue-cohort", ok: false, count: 0, locator: "data/revenue/first-revenue-cohort.ts", note: errorText(error) });
  }

  try {
    const cohort = [...TREATMENT_COHORT, ...CONTROL_COHORT];
    for (const slug of cohort) {
      signals.push({
        source: "comparison-quality-cohort",
        kind: "PROTECTED",
        urls: [comparisonUrl(slug)],
        detail: `Treatment or control page of the comparison-quality experiment started 2026-08-22; editing either side invalidates it.`,
        evidence: "data/experiments/comparison-quality-cohort.ts",
      });
    }
    sources.push({ id: "comparison-quality-cohort", ok: true, count: cohort.length, locator: "data/experiments/comparison-quality-cohort.ts" });
  } catch (error) {
    sources.push({ id: "comparison-quality-cohort", ok: false, count: 0, locator: "data/experiments/comparison-quality-cohort.ts", note: errorText(error) });
  }

  try {
    let counted = 0;
    for (const page of DECISION_MONEY_PAGES) {
      const until = addDays(page.updatedAt, OBSERVATION_WINDOW_DAYS);
      if (compareDates(until, today) < 0) continue;
      counted += 1;
      signals.push({
        source: "decision-money-pages",
        kind: "OBSERVATION_WINDOW",
        urls: [comparisonUrl(page.comparison)],
        detail: `Decision-stage comparison last updated ${page.updatedAt}; ${OBSERVATION_WINDOW_DAYS}-day review window runs to ${until}.`,
        evidence: "data/growth/decision-money-pages.ts",
        until,
      });
    }
    sources.push({ id: "decision-money-pages", ok: true, count: counted, locator: "data/growth/decision-money-pages.ts" });
  } catch (error) {
    sources.push({ id: "decision-money-pages", ok: false, count: 0, locator: "data/growth/decision-money-pages.ts", note: errorText(error) });
  }

  return { signals, sources };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const SOFTWARE_FILE = /^data\/software\/([a-z0-9-]+)\.json$/;

/** Files whose change can alter many pages at once. A hit in another unfinished change is a shared-input conflict. */
const SHARED_INPUT_PATTERNS: RegExp[] = [
  /^app\/(software|compare|category|guides)\/.*page\.tsx$/,
  /^app\/\[guide\]\/page\.tsx$/,
  /^app\/sitemap\.ts$/,
  /^app\/layout\.tsx$/,
  /^components\//,
  /^lib\/(generators|comparison|category|related|structured-data|affiliate|indexing-quality|faq|freshness|pricing-freshness)\.ts$/,
  /^data\/software\/(schema|types|index)\.ts$/,
  /^data\/seo\/(serp-overrides|alternative-guides|gsc-sitemap-comparison-cohort)\.ts$/,
  /^data\/comparisons\.ts$/,
  /^data\/affiliate\//,
];

export function isSharedInputFile(file: string): boolean {
  return SHARED_INPUT_PATTERNS.some((pattern) => pattern.test(file));
}

function listFiles(output: string): string[] {
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

/**
 * Paths from `git status --porcelain` (v1). The two leading status columns are significant, so lines are
 * never trimmed before the path is cut out; renames report the new path; quoted paths lose their quotes.
 */
export function parsePorcelainPaths(output: string): string[] {
  const paths: string[] = [];
  for (const line of output.split("\n")) {
    if (line.length < 4) continue;
    let file = line.slice(3).replace(/\r$/, "");
    const arrow = file.indexOf(" -> ");
    if (arrow >= 0) file = file.slice(arrow + 4);
    paths.push(file.replace(/^"|"$/g, ""));
  }
  return paths;
}

type WorktreeInfo = { path: string; head: string; branch: string | null };

export function listWorktrees(repoRoot: string): WorktreeInfo[] {
  const blocks = git(repoRoot, ["worktree", "list", "--porcelain"]).split(/\n\n+/);
  const out: WorktreeInfo[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const worktree = lines.find((line) => line.startsWith("worktree "))?.slice("worktree ".length);
    const head = lines.find((line) => line.startsWith("HEAD "))?.slice("HEAD ".length);
    const branch = lines.find((line) => line.startsWith("branch "))?.slice("branch refs/heads/".length) ?? null;
    if (worktree && head) out.push({ path: worktree, head, branch });
  }
  return out;
}

/** Product slugs named inside added lines of a unified diff, restricted to known slugs. */
export function slugsInAddedLines(diff: string, knownSlugs: ReadonlySet<string>): string[] {
  const found = new Set<string>();
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    for (const match of line.matchAll(/["']([a-z0-9]+(?:-[a-z0-9]+)*)["']/g)) {
      if (knownSlugs.has(match[1]!)) found.add(match[1]!);
    }
  }
  return [...found].sort();
}

export type GitSignalOptions = {
  repoRoot: string;
  /** Commit the report's checkout is based on (production source). */
  baseSha: string;
  /** Report date, YYYY-MM-DD. */
  today: string;
  /** This checkout's own worktree path, excluded from the in-flight scan. */
  ownWorktreePath: string;
  knownComparisonSlugs: ReadonlySet<string>;
  /** Worktrees whose diff against the base touches more than this many files are reported as divergent lineages, not claimed page by page. */
  divergentFileLimit?: number;
};

export type GitSignals = {
  signals: ProtectionSignal[];
  sources: ProtectionSourceStatus[];
  sharedInputsInFlight: SharedInputInFlight[];
  divergentWorktrees: Array<{ path: string; branch: string | null; head: string; changedFiles: number }>;
};

/** Observation windows from recent commits (ancestors of the base) and in-flight claims from other worktrees. */
export function collectGitSignals(options: GitSignalOptions): GitSignals {
  const { repoRoot, baseSha, today } = options;
  const signals: ProtectionSignal[] = [];
  const sources: ProtectionSourceStatus[] = [];
  const sharedInputsInFlight: SharedInputInFlight[] = [];
  const divergentWorktrees: GitSignals["divergentWorktrees"] = [];
  const since = addDays(today, -OBSERVATION_WINDOW_DAYS);

  try {
    const raw = git(repoRoot, ["log", baseSha, `--since=${since}T00:00:00Z`, "--format=@@COMMIT@@%H%x09%cI", "--name-only", "--", "data/software"]);
    let sha = "";
    let date = "";
    const seen = new Map<string, { sha: string; date: string }>();
    for (const line of raw.split("\n")) {
      if (line.startsWith("@@COMMIT@@")) {
        const [h, d] = line.slice("@@COMMIT@@".length).split("\t");
        sha = h ?? "";
        date = (d ?? "").slice(0, 10);
        continue;
      }
      const match = SOFTWARE_FILE.exec(line.trim());
      if (!match || !sha) continue;
      const slug = match[1]!;
      const previous = seen.get(slug);
      if (!previous || compareDates(date, previous.date) > 0) seen.set(slug, { sha, date });
    }
    for (const [slug, info] of [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const until = addDays(info.date, OBSERVATION_WINDOW_DAYS);
      signals.push({
        source: "release-observation",
        kind: "OBSERVATION_WINDOW",
        urls: [softwareUrl(slug)],
        detail: `Product record changed in commit ${info.sha.slice(0, 7)} on ${info.date}, which is part of the production source. The review window runs to ${until} at the earliest; the formal clock starts only at the first observed Google recrawl.`,
        evidence: `git log ${baseSha.slice(0, 7)} -- data/software/${slug}.json`,
        until,
      });
    }
    let overrideCount = 0;
    try {
      const overrideLog = git(repoRoot, ["log", baseSha, `--since=${since}T00:00:00Z`, "--format=@@COMMIT@@%H%x09%cI", "-p", "--", "data/seo/serp-overrides.ts"]);
      for (const block of overrideLog.split(/^@@COMMIT@@/m).filter(Boolean)) {
        const [header = "", ...rest] = block.split("\n");
        const [commit = "", committed = ""] = header.split("\t");
        const date = committed.slice(0, 10);
        if (!commit || !date) continue;
        for (const slug of slugsInAddedLines(rest.join("\n"), options.knownComparisonSlugs)) {
          const until = addDays(date, OBSERVATION_WINDOW_DAYS);
          overrideCount += 1;
          signals.push({
            source: "release-observation",
            kind: "OBSERVATION_WINDOW",
            urls: [comparisonUrl(slug)],
            detail: `Comparison SERP override added or changed in commit ${commit.slice(0, 7)} on ${date}, which is part of the production source. The review window runs to ${until} at the earliest; the formal clock starts only at the first observed Google recrawl.`,
            evidence: `git log ${baseSha.slice(0, 7)} -p -- data/seo/serp-overrides.ts`,
            until,
          });
        }
      }
    } catch {
      // A failure here only narrows attribution; the software-record scan above stays valid.
    }
    sources.push({
      id: "release-observation",
      ok: true,
      count: seen.size + overrideCount,
      locator: `git log ${baseSha.slice(0, 7)} --since=${since} -- data/software data/seo/serp-overrides.ts`,
      note: "Attributes software records and comparison SERP overrides by file; guide, alternative-guide and shared-template changes are not attributed to individual pages.",
    });
  } catch (error) {
    sources.push({ id: "release-observation", ok: false, count: 0, locator: "git log -- data/software", note: errorText(error) });
  }

  try {
    const limit = options.divergentFileLimit ?? 200;
    const worktrees = listWorktrees(repoRoot).filter((w) => path.resolve(w.path) !== path.resolve(options.ownWorktreePath));
    let claimed = 0;
    for (const worktree of worktrees) {
      const label = worktree.branch ?? worktree.head.slice(0, 7);
      let committed: string[] = [];
      let dirty: string[] = [];
      try {
        committed = listFiles(git(repoRoot, ["diff", "--name-only", `${baseSha}...${worktree.head}`]));
      } catch {
        committed = [];
      }
      try {
        dirty = parsePorcelainPaths(git(worktree.path, ["status", "--porcelain", "--untracked-files=all"]));
      } catch {
        dirty = [];
      }
      if (committed.length > limit) {
        divergentWorktrees.push({ path: worktree.path, branch: worktree.branch, head: worktree.head, changedFiles: committed.length });
        continue;
      }
      const files = [...new Set([...committed, ...dirty])].sort();
      for (const file of files) {
        const match = SOFTWARE_FILE.exec(file);
        const evidence = `worktree ${path.basename(worktree.path)} (${label})`;
        if (match) {
          claimed += 1;
          signals.push({
            source: "in-flight-work",
            kind: "IN_FLIGHT",
            urls: [softwareUrl(match[1]!)],
            detail: `Unfinished change to ${file} exists in another worktree and must not be released or overwritten.`,
            evidence,
          });
        } else if (isSharedInputFile(file)) {
          sharedInputsInFlight.push({ file, evidence });
        }
      }
      if (committed.includes("data/seo/serp-overrides.ts") || dirty.includes("data/seo/serp-overrides.ts")) {
        try {
          const diff = git(repoRoot, ["diff", `${baseSha}...${worktree.head}`, "--", "data/seo/serp-overrides.ts"]);
          for (const slug of slugsInAddedLines(diff, options.knownComparisonSlugs)) {
            claimed += 1;
            signals.push({
              source: "in-flight-work",
              kind: "IN_FLIGHT",
              urls: [comparisonUrl(slug)],
              detail: "Unfinished change to the comparison's SERP override exists in another worktree.",
              evidence: `worktree ${path.basename(worktree.path)} (${label})`,
            });
          }
        } catch {
          // The shared-input entry above already records the conflict at file level.
        }
      }
    }
    sources.push({
      id: "in-flight-work",
      ok: true,
      count: claimed,
      locator: "git worktree list --porcelain; git diff --name-only <base>...<head>; git status --porcelain",
      note: divergentWorktrees.length > 0 ? `${divergentWorktrees.length} divergent worktree(s) skipped page by page (more than ${limit} changed files).` : undefined,
    });
  } catch (error) {
    sources.push({ id: "in-flight-work", ok: false, count: 0, locator: "git worktree list --porcelain", note: errorText(error) });
  }

  return { signals, sources, sharedInputsInFlight, divergentWorktrees };
}

export function loadProtectionSnapshot(options: GitSignalOptions & { checkoutSha: string; generatedAt: string }): {
  snapshot: ProtectionSnapshot;
  divergentWorktrees: GitSignals["divergentWorktrees"];
} {
  const registry = collectRegistrySignals(options.repoRoot, options.today);
  const gitSignals = collectGitSignals(options);
  return {
    snapshot: buildProtectionSnapshot({
      checkoutSha: options.checkoutSha,
      generatedAt: options.generatedAt,
      sources: [...registry.sources, ...gitSignals.sources],
      signals: [...registry.signals, ...gitSignals.signals],
      sharedInputsInFlight: gitSignals.sharedInputsInFlight,
    }),
    divergentWorktrees: gitSignals.divergentWorktrees,
  };
}
