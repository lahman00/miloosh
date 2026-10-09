import { describe, expect, it } from "vitest";
import { REQUIRED_GATES, affectedByChangedFiles, newFailureIds, onOrAfter, runGuardian } from "@/lib/growth-agents/guardian";
import { GATE_COMMANDS, collectProductionFacts, combinedOutput, notRun, parseAuditJson, parseProductionDeployments, parseVercelInspect, parseVitestJson, type CommandRunner } from "@/lib/growth-agents/guardian-sources";
import { SHA, gateResult, guardianInputs } from "./fixtures";

describe("gate verdicts", () => {
  it("allows a release only when every required gate passed, the tree is clean and nothing protected is affected", () => {
    const report = runGuardian(guardianInputs());
    expect(report.verdict).toBe("RELEASE_ALLOWED");
    expect(report.reasons).toEqual([]);
    expect(report.gates.map((g) => g.gate)).toEqual([...REQUIRED_GATES]);
  });

  it("never authorises a deployment itself, whatever the verdict", () => {
    for (const inputs of [guardianInputs(), guardianInputs({ gates: [] })]) {
      expect(runGuardian(inputs).deploymentAllowedByGuardian).toBe(false);
    }
  });

  it("treats a gate that was not run as a block (NOT_VERIFIED), not as a pass", () => {
    const report = runGuardian(guardianInputs({ gates: REQUIRED_GATES.filter((g) => g !== "build").map((g) => gateResult(g)) }));
    expect(report.verdict).toBe("NOT_VERIFIED");
    expect(report.gates.find((g) => g.gate === "build")!.status).toBe("NOT_RUN");
    expect(report.reasons.map((r) => r.code)).toEqual(expect.arrayContaining(["GATE_NOT_RUN", "UNRUN_GATES"]));
  });

  it("blocks the release on any failing gate and says which", () => {
    const report = runGuardian(guardianInputs({ gates: REQUIRED_GATES.map((g) => gateResult(g, g === "audit" ? "FAIL" : "PASS", g === "audit" ? ["GHSA-aaaa-bbbb-cccc"] : [])) }));
    expect(report.verdict).toBe("RELEASE_BLOCKED");
    expect(report.reasons).toContainEqual(expect.objectContaining({ code: "GATE_FAILED", gate: "audit" }));
  });

  it("keeps a failure that was already there at the base commit apart from one the change introduced", () => {
    const base = { baseSha: SHA, results: REQUIRED_GATES.map((g) => gateResult(g, g === "tests" ? "FAIL" : "PASS", g === "tests" ? ["a.test.ts > old failure"] : [])) };
    const sameFailure = runGuardian(guardianInputs({ baseline: base, gates: REQUIRED_GATES.map((g) => gateResult(g, g === "tests" ? "FAIL" : "PASS", g === "tests" ? ["a.test.ts > old failure"] : [])) }));
    expect(sameFailure.gates.find((g) => g.gate === "tests")!.relation).toBe("PRE_EXISTING");
    expect(sameFailure.verdict).toBe("RELEASE_BLOCKED"); // a pre-existing failure still blocks a release; it is just not blamed on the change

    const introduced = runGuardian(guardianInputs({ baseline: base, gates: REQUIRED_GATES.map((g) => gateResult(g, g === "tests" ? "FAIL" : "PASS", g === "tests" ? ["a.test.ts > old failure", "b.test.ts > new failure"] : [])) }));
    expect(introduced.gates.find((g) => g.gate === "tests")!.relation).toBe("INTRODUCED");

    const failsNowOnly = runGuardian(guardianInputs({ baseline: { baseSha: SHA, results: REQUIRED_GATES.map((g) => gateResult(g)) }, gates: REQUIRED_GATES.map((g) => gateResult(g, g === "lint" ? "FAIL" : "PASS")) }));
    expect(failsNowOnly.gates.find((g) => g.gate === "lint")!.relation).toBe("INTRODUCED");

    const fixed = runGuardian(guardianInputs({ baseline: base }));
    expect(fixed.gates.find((g) => g.gate === "tests")!.relation).toBe("IMPROVED");
    expect(fixed.verdict).toBe("RELEASE_ALLOWED");
  });

  it("is UNKNOWN about the relation when there is no baseline", () => {
    expect(runGuardian(guardianInputs()).gates.every((g) => g.relation === "UNKNOWN")).toBe(true);
  });

  it("lists the failure identifiers the change added on top of the baseline", () => {
    const base = gateResult("tests", "FAIL", ["a", "b"]);
    expect(newFailureIds(gateResult("tests", "FAIL", ["a", "b", "c"]), base)).toEqual(["c"]);
    expect(newFailureIds(gateResult("tests", "FAIL", ["x"]), undefined)).toEqual(["x"]);
  });
});

describe("what else blocks a release", () => {
  it("blocks on uncommitted changes in the worktree under review", () => {
    const report = runGuardian(guardianInputs({ git: { ...guardianInputs().git, dirtyPaths: ["lib/x.ts"] } }));
    expect(report.verdict).toBe("RELEASE_BLOCKED");
    expect(report.reasons.map((r) => r.code)).toContain("DIRTY_WORKTREE");
  });

  it("blocks when the change can re-render protected, observed or in-flight pages, or a shared template", () => {
    const pages = runGuardian(guardianInputs({ protection: { affectedUrls: ["https://miloosh.com/software/a"], affectedNonEditable: [{ url: "https://miloosh.com/software/a", verdict: "PROTECTED" }], sharedTemplateChanged: false } }));
    expect(pages.verdict).toBe("RELEASE_BLOCKED");
    expect(pages.reasons.map((r) => r.code)).toContain("PROTECTED_PAGES_AFFECTED");
    const template = runGuardian(guardianInputs({ protection: { affectedUrls: [], affectedNonEditable: [], sharedTemplateChanged: true } }));
    expect(template.verdict).toBe("RELEASE_BLOCKED");
  });

  it("blocks a release that would drop work an earlier production deployment shipped", () => {
    const production = { deploymentId: "dpl_x", createdAt: "2026-10-08T11:05:03.000Z", deployedSha: SHA, previousProductionShas: ["1d6746b", "11ba877"], ancestorOfCurrent: { "1d6746b": false, "11ba877": true } };
    const report = runGuardian(guardianInputs({ production }));
    expect(report.verdict).toBe("RELEASE_BLOCKED");
    expect(report.reasons).toContainEqual(expect.objectContaining({ code: "PRODUCTION_LINEAGE_DROPPED" }));
    expect(report.checks.find((c) => c.id === "production:ancestry")!.detail).toMatch(/1d6746b/);
  });

  it("passes the ancestry check when every recent production SHA is an ancestor", () => {
    const production = { deploymentId: "dpl_x", createdAt: null, deployedSha: null, previousProductionShas: ["a"], ancestorOfCurrent: { a: true } };
    expect(runGuardian(guardianInputs({ production })).checks.find((c) => c.id === "production:ancestry")!.status).toBe("PASS");
  });

  it("reports an unread production identity as NOT_VERIFIED without blocking on it", () => {
    const report = runGuardian(guardianInputs());
    expect(report.checks.find((c) => c.id === "production:identity")!.status).toBe("NOT_VERIFIED");
    expect(report.verdict).toBe("RELEASE_ALLOWED");
  });

  it("records other worktrees' unfinished work as information and never touches it", () => {
    const report = runGuardian(guardianInputs({ worktrees: [{ path: "/w/salesforce", branch: "claude/salesforce", head: "abc1234", dirtyPaths: ["data/software/salesforce.json"], aheadOfBase: 2 }] }));
    const check = report.checks.find((c) => c.id === "worktrees:inflight")!;
    expect(check.status).toBe("INFO");
    expect(check.detail).toMatch(/none is read, merged or deployed by the Guardian/);
    expect(report.verdict).toBe("RELEASE_ALLOWED");
  });

  it("flags a rendered-output difference as a warning to inspect and shows a missing comparison as not run", () => {
    expect(runGuardian(guardianInputs({ renderedDiff: { compared: 10, differing: 2, differingSample: ["a.html", "b.html"] } })).checks.find((c) => c.id === "render:diff")!.status).toBe("WARN");
    expect(runGuardian(guardianInputs({ renderedDiff: { compared: 10, differing: 0, differingSample: [] } })).checks.find((c) => c.id === "render:diff")!.status).toBe("PASS");
    expect(runGuardian(guardianInputs()).checks.find((c) => c.id === "render:diff")!.status).toBe("NOT_RUN");
  });
});

describe("mapping changed files to the pages they re-render", () => {
  const resolve = (slug: string) => [`https://miloosh.com/software/${slug}`, `https://miloosh.com/compare/${slug}-vs-other`];
  const shared = (file: string) => file.startsWith("components/");

  it("fans a software record out to its page and comparisons, and flags shared templates", () => {
    const result = affectedByChangedFiles(["data/software/alpha.json", "components/Cta.tsx", "README.md"], resolve, shared);
    expect(result.affectedUrls).toEqual(["https://miloosh.com/compare/alpha-vs-other", "https://miloosh.com/software/alpha"]);
    expect(result.sharedTemplateChanged).toBe(true);
  });

  it("finds nothing for files that do not feed pages", () => {
    expect(affectedByChangedFiles(["lib/growth-agents/director.ts", "tests/x.test.ts", "docs/a.md"], resolve, shared)).toEqual({ affectedUrls: [], sharedTemplateChanged: false });
  });

  it("compares dates for review checks", () => {
    expect(onOrAfter("2026-10-09", "2026-10-09")).toBe(true);
    expect(onOrAfter("2026-10-08", "2026-10-09")).toBe(false);
  });
});

describe("parsers for the real command output (pure, no commands run)", () => {
  it("reads the deployment id and creation time from `vercel inspect`", () => {
    const output = [
      "Fetching deployment \"miloosh.com\" in lahman00s-projects",
      "> Fetched deployment \"miloosh-abc.vercel.app\" in lahman00s-projects [1s]",
      "",
      "  General",
      "",
      "    id      dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn",
      "    name    miloosh",
      "    target  production",
      "    status  ● Ready",
      "    url     https://miloosh-abc.vercel.app",
      "    created Thu Oct 08 2026 14:05:03 GMT+0300 (Israel Daylight Time) [4h ago]",
    ].join("\n");
    const parsed = parseVercelInspect(output);
    expect(parsed.deploymentId).toBe("dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn");
    expect(parsed.target).toBe("production");
    expect(parsed.status).toBe("Ready");
    expect(parsed.createdAt).toBe("2026-10-08T11:05:03.000Z");
  });

  it("reads the real `vercel inspect` report exactly as the CLI prints it (tab-separated, on stderr)", () => {
    const real = [
      "Vercel CLI 58.5.1 (Node.js 24.21.0)",
      'Fetching deployment "miloosh.com" in team',
      '> Fetched deployment "project-abc123-team.vercel.app" in team [541ms]',
      "",
      "  General",
      "",
      "    id\t\tdpl_4AHS358cZHgukiyYtVkwsTZ3W4kn",
      "    name\tflowtemplate",
      "    target\tproduction",
      "    status\t● Ready",
      "    url\t\thttps://project-abc123-team.vercel.app",
      "    created\tThu Oct 08 2026 14:05:03 GMT+0300 (Israel Daylight Time) [13h ago]",
    ].join("\n");
    expect(parseVercelInspect(real)).toEqual({ deploymentId: "dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn", createdAt: "2026-10-08T11:05:03.000Z", target: "production", status: "Ready" });
    expect(combinedOutput({ status: 0, stdout: "", stderr: real })).toContain("dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn");
  });

  it("returns nulls, not guesses, for output it cannot read", () => {
    expect(parseVercelInspect("error: not logged in")).toEqual({ deploymentId: null, createdAt: null, target: null, status: null });
  });

  it("keeps only production deployments from the GitHub deployments response, newest first", () => {
    const parsed = parseProductionDeployments([
      { sha: "aaa", created_at: "2026-10-07T00:00:00Z", environment: "Production" },
      { sha: "bbb", created_at: "2026-10-08T00:00:00Z", environment: "Production" },
      { sha: "ccc", created_at: "2026-10-09T00:00:00Z", environment: "Preview" },
      { nope: true },
    ]);
    expect(parsed.map((d) => d.sha)).toEqual(["bbb", "aaa"]);
    expect(parseProductionDeployments({ message: "Not Found" })).toEqual([]);
  });

  it("reads failing test names from the vitest JSON reporter", () => {
    const parsed = parseVitestJson({
      numFailedTests: 1,
      numPassedTests: 2,
      numTotalTests: 3,
      testResults: [{ name: `${process.cwd()}/tests/a.test.ts`, assertionResults: [{ status: "passed", fullName: "ok" }, { status: "failed", fullName: "suite fails here" }, { status: "passed", fullName: "ok2" }] }],
    });
    expect(parsed).toEqual({ failed: 1, passed: 2, total: 3, failureIds: ["tests/a.test.ts > suite fails here"] });
  });

  it("names a failing test relative to the checkout it ran in, so the same failure has one identifier in any folder", () => {
    const run = (root: string) => parseVitestJson({ numFailedTests: 1, testResults: [{ name: `${root}/tests/lib/a.test.ts`, assertionResults: [{ status: "failed", fullName: "suite fails" }] }] }, root).failureIds;
    expect(run("/Users/me/AI/1. פרוייקטים/Miloosh/site")).toEqual(["tests/lib/a.test.ts > suite fails"]);
    expect(run("/private/tmp/base-80eb1e5")).toEqual(["tests/lib/a.test.ts > suite fails"]);
  });

  it("reads advisory identifiers and severity counts from `npm audit --json`", () => {
    const parsed = parseAuditJson({
      metadata: { vulnerabilities: { critical: 1, high: 2, moderate: 0, low: 0, total: 3 } },
      vulnerabilities: {
        lib1: { via: [{ url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", source: 1 }, "lib2"] },
        lib2: { via: [{ url: "https://github.com/advisories/GHSA-dddd-eeee-ffff" }] },
      },
    });
    expect(parsed.counts.critical).toBe(1);
    expect(parsed.advisoryIds).toEqual(["GHSA-aaaa-bbbb-cccc", "GHSA-dddd-eeee-ffff"]);
  });

  it("uses the repository's own gate commands and never a bypass flag", () => {
    expect(GATE_COMMANDS.map((c) => c.gate)).toEqual([...REQUIRED_GATES]);
    for (const spec of GATE_COMMANDS) {
      expect([spec.file, ...spec.args].join(" ")).not.toMatch(/--force|--no-verify|audit fix|--legacy-peer-deps|--passWithNoTests|-u\b/);
    }
    expect(notRun(GATE_COMMANDS[0]!)).toMatchObject({ status: "NOT_RUN", exitCode: null, ranAt: null });
  });
});

describe("collectProductionFacts reads production without changing it", () => {
  const inspectOutput = "    id\t\tdpl_abc123\n    created\tThu Oct 08 2026 14:05:03 GMT+0300 (Israel Daylight Time) [13h ago]\n";
  const deployments = JSON.stringify([
    { sha: "b".repeat(40), created_at: "2026-10-08T11:07:11Z", environment: "Production" },
    { sha: "a".repeat(40), created_at: "2026-10-06T19:05:12Z", environment: "Production" },
  ]);

  function runner(overrides: Partial<Record<"vercel" | "gh", { status: number | null; stdout?: string; stderr?: string }>> = {}) {
    const calls: Array<{ file: string; args: string[] }> = [];
    const run: CommandRunner = (file, args) => {
      calls.push({ file, args });
      const planned = overrides[file as "vercel" | "gh"];
      if (planned) return { status: planned.status, stdout: planned.stdout ?? "", stderr: planned.stderr ?? "" };
      if (file === "vercel") return { status: 0, stdout: "", stderr: inspectOutput };
      if (file === "gh") return { status: 0, stdout: deployments, stderr: "" };
      throw new Error(`unexpected command ${file}`);
    };
    return { run, calls };
  }

  it("issues exactly one `vercel inspect <domain>` and one `gh api` GET of the deployments list", () => {
    const { run, calls } = runner();
    collectProductionFacts({ repoRoot: process.cwd(), currentSha: "HEAD", domain: "miloosh.com", githubRepo: "lahman00/miloosh", run });
    expect(calls.map((c) => [c.file, c.args[0]])).toEqual([["vercel", "inspect"], ["gh", "api"]]);
    expect(calls[0]!.args).toEqual(["inspect", "miloosh.com"]);
    expect(calls[1]!.args).toEqual(["api", "repos/lahman00/miloosh/deployments?environment=Production&per_page=8"]);
    expect(calls[1]!.args.join(" ")).not.toMatch(/-X|--method|-f\b|-F\b|--input/);
  });

  it("finds the deployment identity even though the Vercel CLI prints it on stderr", () => {
    const facts = collectProductionFacts({ repoRoot: process.cwd(), currentSha: "HEAD", domain: "miloosh.com", githubRepo: null, run: runner().run });
    expect(facts).toMatchObject({ deploymentId: "dpl_abc123", createdAt: "2026-10-08T11:05:03.000Z", deployedSha: null });
  });

  it("reports the newest production SHA, and never reads the history when no repository is named", () => {
    const { run, calls } = runner();
    const facts = collectProductionFacts({ repoRoot: process.cwd(), currentSha: "HEAD", domain: "miloosh.com", githubRepo: "lahman00/miloosh", run });
    expect(facts.deployedSha).toBe("b".repeat(40));
    const none = runner();
    collectProductionFacts({ repoRoot: process.cwd(), currentSha: "HEAD", domain: "miloosh.com", githubRepo: null, run: none.run });
    expect(none.calls.map((c) => c.file)).toEqual(["vercel"]);
    expect(calls).toHaveLength(2);
  });

  it("leaves everything null, never invented, when both commands fail", () => {
    const { run } = runner({ vercel: { status: 1, stderr: "not logged in" }, gh: { status: 1, stderr: "auth required" } });
    expect(collectProductionFacts({ repoRoot: process.cwd(), currentSha: "HEAD", domain: "miloosh.com", githubRepo: "lahman00/miloosh", run })).toEqual({ deploymentId: null, createdAt: null, deployedSha: null, previousProductionShas: [], ancestorOfCurrent: {} });
  });

  it("treats a non-JSON deployments answer as no history rather than crashing", () => {
    const { run } = runner({ gh: { status: 0, stdout: "<html>rate limited</html>" } });
    expect(collectProductionFacts({ repoRoot: process.cwd(), currentSha: "HEAD", domain: "miloosh.com", githubRepo: "lahman00/miloosh", run }).previousProductionShas).toEqual([]);
  });
});
