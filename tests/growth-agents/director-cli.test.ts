import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GROWTH_AGENT_SCHEMA_VERSION } from "@/lib/growth-agents/contracts";
import { candidatesCsv, loadEvidence, monetizationLookup, runDirectorCli, type CliOptions, type Ports } from "@/lib/growth-agents/director-cli";
import { REQUIRED_GATES } from "@/lib/growth-agents/guardian";
import { parseArgs } from "../../scripts/growth/growth-director";
import { NOW, SHA, U, gateResult, makeCapture, makeInventory, makeProtection, makeWorld, partnerFacts, signal, type PageRow } from "./fixtures";

const GSC_DIR = "/capture";
const PRIVATE_DIR = "/private-capture";
const OUT_DIR = "/out";

const HIST: PageRow[] = [
  [U("/software/alpha"), 0, 240, 70],
  [U("/software/beta"), 0, 300, 75],
  [U("/software/gamma"), 0, 80, 60],
  [U("/compare/alpha-vs-beta"), 0, 40, 12],
  [U("/"), 1, 20, 5],
];
const RECENT: PageRow[] = [[U("/"), 0, 4, 5]];

function captureFiles(dir = GSC_DIR): Record<string, string> {
  const capture = makeCapture({ hist: HIST, recent: RECENT });
  return { [`${dir}/manifest.json`]: JSON.stringify(capture.manifest), ...Object.fromEntries(Object.entries(capture.files).map(([name, text]) => [`${dir}/${name}`, text])) };
}

const blockedRail = { railId: "rail-blocked", railLabel: "Blocked rail", readiness: "OWNER_ACTION_REQUIRED" as const, ownerActionPackId: "pack-blocked" };

function makePorts(files: Record<string, string>, overrides: Partial<Ports> = {}) {
  const calls = { writes: [] as Array<[string, string]>, directories: [] as string[], production: 0, gates: 0, reads: [] as string[] };
  const inventory = makeInventory();
  const ports: Ports = {
    readText: (p) => {
      calls.reads.push(p);
      if (p in files) return files[p]!;
      throw new Error(`ENOENT: ${p}`);
    },
    writeText: (p, content) => void calls.writes.push([p, content]),
    makeDirectory: (d) => void calls.directories.push(d),
    headSha: () => SHA,
    loadInventory: () => inventory,
    loadProtection: () => ({ snapshot: makeProtection(), divergentWorktrees: [] }),
    loadPartners: () => [partnerFacts("alpha", { comparisonPageUrls: [U("/compare/alpha-vs-beta")] }), partnerFacts("gamma", { payout: blockedRail, revenueReady: false })],
    programStatus: () => ({ status: null, note: null }),
    ownerPackTitles: () => ({ "pack-blocked": "Finish payout setup for owner@example.com via https://partner.example/portal" }),
    gitFacts: () => ({ branch: "claude/test", headSha: SHA, baseSha: SHA, dirtyPaths: [], changedFiles: [], commitsAheadOfBase: 0, pushedToRemote: null }),
    worktreeFacts: () => [],
    productionFacts: () => {
      calls.production += 1;
      return { deploymentId: "dpl_x", createdAt: "2026-10-08T11:05:03.000Z", deployedSha: SHA, previousProductionShas: [], ancestorOfCurrent: {} };
    },
    runGates: () => {
      calls.gates += 1;
      return REQUIRED_GATES.map((gate) => gateResult(gate));
    },
    isSharedTemplate: () => false,
    ...overrides,
  };
  return { ports, calls };
}

function options(overrides: Partial<CliOptions> = {}): CliOptions {
  return {
    repoRoot: "/repo",
    now: NOW,
    gscDir: GSC_DIR,
    gscPrivateDir: null,
    extrasFile: null,
    eventsFile: null,
    baselineFile: null,
    gatesFile: null,
    renderedDiffFile: null,
    runGates: false,
    checkProduction: false,
    productionOverride: null,
    releaseDate: null,
    baseSha: SHA,
    outDir: null,
    strict: false,
    ...overrides,
  };
}

describe("read-only by default: nothing is mutated unless --out is given", () => {
  it("writes no file and creates no directory in the default run", () => {
    const { ports, calls } = makePorts(captureFiles());
    const result = runDirectorCli(options(), ports);
    expect(calls.writes).toEqual([]);
    expect(calls.directories).toEqual([]);
    expect(result.written).toEqual([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^# דוח מנהל הצמיחה של Miloosh/);
  });

  it("does not run a gate or query the hosting platform unless asked", () => {
    const { ports, calls } = makePorts(captureFiles());
    runDirectorCli(options(), ports);
    expect(calls.gates).toBe(0);
    expect(calls.production).toBe(0);
  });

  it("runs the gates only with --run-gates and reads production only with --check-production", () => {
    const { ports, calls } = makePorts(captureFiles());
    const result = runDirectorCli(options({ runGates: true, checkProduction: true }), ports);
    expect(calls.gates).toBe(1);
    expect(calls.production).toBe(1);
    expect(result.guardian!.verdict).toBe("RELEASE_ALLOWED");
    expect(result.director.evidenceBasis.production).toMatchObject({ deploymentId: "dpl_x" });
  });

  it("passes a recorded rendered-output comparison to the Guardian, and says NOT_RUN without one", () => {
    const without = runDirectorCli(options(), makePorts(captureFiles()).ports);
    expect(without.guardian!.checks.find((c) => c.id === "render:diff")!.status).toBe("NOT_RUN");
    const same = runDirectorCli(options({ renderedDiffFile: "/diff.json" }), makePorts({ ...captureFiles(), "/diff.json": JSON.stringify({ compared: 1775, differing: 0, differingSample: [] }) }).ports);
    expect(same.guardian!.checks.find((c) => c.id === "render:diff")).toMatchObject({ status: "PASS", detail: expect.stringMatching(/1775 page file\(s\) compared; 0 differ/) });
    const changed = runDirectorCli(options({ renderedDiffFile: "/diff.json" }), makePorts({ ...captureFiles(), "/diff.json": JSON.stringify({ compared: 10, differing: 2, differingSample: ["software/a.html", "software/b.html"] }) }).ports);
    expect(changed.guardian!.checks.find((c) => c.id === "render:diff")!.status).toBe("WARN");
    const broken = runDirectorCli(options({ renderedDiffFile: "/diff.json" }), makePorts({ ...captureFiles(), "/diff.json": "{nope" }).ports);
    expect(broken.guardian!.checks.find((c) => c.id === "render:diff")!.status).toBe("NOT_RUN");
  });

  it("reads recorded gate results from a file instead of running anything", () => {
    const gates = REQUIRED_GATES.map((gate) => gateResult(gate, gate === "tests" ? "FAIL" : "PASS", gate === "tests" ? ["a > b"] : []));
    const { ports, calls } = makePorts({ ...captureFiles(), "/gates.json": JSON.stringify(gates) });
    const result = runDirectorCli(options({ gatesFile: "/gates.json" }), ports);
    expect(calls.gates).toBe(0);
    expect(result.guardian!.verdict).toBe("RELEASE_BLOCKED");
  });

  it("writes exactly the three report files, and only inside the requested directory", () => {
    const { ports, calls } = makePorts(captureFiles());
    const result = runDirectorCli(options({ outDir: OUT_DIR }), ports);
    expect(calls.directories).toEqual([OUT_DIR]);
    expect(calls.writes.map(([p]) => p).sort()).toEqual([`${OUT_DIR}/candidates.csv`, `${OUT_DIR}/director-report.he.md`, `${OUT_DIR}/director-report.json`]);
    expect(result.written).toHaveLength(3);
    const json = JSON.parse(calls.writes.find(([p]) => p.endsWith(".json"))![1]);
    expect(json.schemaVersion).toBe(GROWTH_AGENT_SCHEMA_VERSION);
    expect(json.director.mode).toBe("READ_ONLY");
    expect(json.guardian.deploymentAllowedByGuardian).toBe(false);
  });

  it("keeps the JSON compact and the CSV complete: all candidates in the CSV, at most 30 in the JSON", () => {
    const many: PageRow[] = Array.from({ length: 40 }, (_, i) => [U(`/software/p${i}`), 0, 100 + i, 50]);
    const capture = makeCapture({ hist: many, recent: RECENT });
    const files = { [`${GSC_DIR}/manifest.json`]: JSON.stringify(capture.manifest), ...Object.fromEntries(Object.entries(capture.files).map(([n, t]) => [`${GSC_DIR}/${n}`, t])) };
    const { ports, calls } = makePorts(files);
    runDirectorCli(options({ outDir: OUT_DIR }), ports);
    const json = JSON.parse(calls.writes.find(([p]) => p.endsWith(".json"))![1]);
    const csv = calls.writes.find(([p]) => p.endsWith(".csv"))![1];
    expect(json.google.candidates).toHaveLength(30);
    expect(json.google.candidatesOmittedFromJson).toBe(10);
    expect(csv.trim().split("\n")).toHaveLength(41);
  });

  it("redacts emails and non-Miloosh URLs from every output", () => {
    const { ports, calls } = makePorts(captureFiles());
    const result = runDirectorCli(options({ outDir: OUT_DIR }), ports);
    const everything = [result.stdout, ...calls.writes.map(([, content]) => content)].join("\n");
    expect(everything).not.toMatch(/owner@example\.com/);
    expect(everything).not.toMatch(/partner\.example/);
    expect(everything).toMatch(/<email-redacted>/);
    for (const url of everything.match(/https?:\/\/[^\s"')\]]+/g) ?? []) expect(url).toMatch(/^https:\/\/(www\.)?miloosh\.com/);
  });

  it("never reads a path the options did not name", () => {
    const { ports, calls } = makePorts(captureFiles());
    runDirectorCli(options(), ports);
    expect(calls.reads.every((p) => p.startsWith(`${GSC_DIR}/`))).toBe(true);
  });
});

describe("missing or broken evidence", () => {
  it("returns a NEEDS_DATA report without throwing when no capture is given, and exits 0 unless --strict", () => {
    const { ports } = makePorts({});
    const loose = runDirectorCli(options({ gscDir: null }), ports);
    expect(loose.google.status).toBe("NEEDS_DATA");
    expect(loose.exitCode).toBe(0);
    expect(loose.hebrew).toMatch(/אין נתוני Search Console, ולכן לא חושב שום דירוג/);
    expect(loose.director.shortlist).toEqual([]);
    const strict = runDirectorCli(options({ gscDir: null, strict: true }), ports);
    expect(strict.exitCode).toBe(3);
  });

  it("reports an invalid capture as missing input, with the exact problem, and does not guess", () => {
    const files = captureFiles();
    files[`${GSC_DIR}/ph.csv`] = "Top pages,Clicks,Impressions\nhttps://miloosh.com/software/alpha,0,25.6K\n";
    const result = runDirectorCli(options(), makePorts(files).ports);
    expect(result.google.status).toBe("NEEDS_DATA");
    expect(result.google.warnings.join("\n")).toMatch(/not an exact whole number/);
    expect(result.google.missingInputs.map((m) => m.input)).toContain("Search Console capture");
  });

  it("reads private tables from the private directory when the committed folder lacks them, and warns when neither has them", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.manifest.tables.push({ id: "queries-historical", role: "historical", kind: "queries", file: "q.csv", window: { start: "2026-07-23", end: "2026-08-19" }, rowsReported: 1, complete: true, visibility: "private" });
    const base = { [`${GSC_DIR}/manifest.json`]: JSON.stringify(capture.manifest), ...Object.fromEntries(Object.entries(capture.files).map(([n, t]) => [`${GSC_DIR}/${n}`, t])) };
    const without = runDirectorCli(options(), makePorts(base).ports);
    expect(without.google.status).toBe("OK");
    expect(without.google.warnings.join("\n")).toMatch(/private and was not provided/);
    const withPrivate = runDirectorCli(options({ gscPrivateDir: PRIVATE_DIR }), makePorts({ ...base, [`${PRIVATE_DIR}/q.csv`]: "Top queries,Clicks,Impressions,CTR,Position\nalpha pricing,0,10,0%,5.0\n" }).ports);
    expect(withPrivate.google.warnings.join("\n")).not.toMatch(/private and was not provided/);
  });

  it("marks the funnel UNAVAILABLE, not zero, when the events file cannot be read", () => {
    const result = runDirectorCli(options({ eventsFile: "/events.json" }), makePorts({ ...captureFiles(), "/events.json": "{not json" }).ports);
    expect(result.affiliate.funnel.state).toBe("UNAVAILABLE");
    const noFile = runDirectorCli(options(), makePorts(captureFiles()).ports);
    expect(noFile.affiliate.funnel.state).toBe("UNAVAILABLE");
  });

  it("measures the funnel from an events file when one is provided", () => {
    const events = [{ type: "page_view", visitorId: "v_h1", sessionId: "s_h1", timestamp: "2026-09-20T10:00:00Z", path: "/software/alpha" }];
    const result = runDirectorCli(options({ eventsFile: "/events.json" }), makePorts({ ...captureFiles(), "/events.json": JSON.stringify(events) }).ports);
    expect(result.affiliate.funnel.state).toBe("MEASURED");
  });

  it("applies per-page evidence from an extras file", () => {
    const url = U("/software/alpha");
    const extras = [{ url, live: { state: "MEASURED", provenance: { source: "t", locator: "l", capturedAt: "2026-10-08T00:00:00Z" }, value: { status: 200, canonical: url, robotsMeta: null, xRobotsTag: null, indexable: true } } }];
    const result = runDirectorCli(options({ extrasFile: "/extras.json" }), makePorts({ ...captureFiles(), "/extras.json": JSON.stringify(extras) }).ports);
    expect(result.google.candidates.find((c) => c.url === url)!.gates.find((g) => g.id === "LIVE_TECHNICAL")!.status).toBe("PASS");
  });

  it("combines several entries for one URL, so a live check and a query read can sit in separate files' worth of entries", () => {
    const url = U("/software/alpha");
    const live = { state: "MEASURED", provenance: { source: "t", locator: "l", capturedAt: "2026-10-08T00:00:00Z" }, value: { status: 200, canonical: url, robotsMeta: null, xRobotsTag: null, indexable: true } };
    const intent = { state: "MEASURED", provenance: { source: "t", locator: "l", capturedAt: "2026-10-08T00:00:00Z" }, value: { queries: [{ query: "alpha vs beta", impressions: 4 }], commercial: true } };
    const extras = [{ url, live }, { url, intent }];
    const result = runDirectorCli(options({ extrasFile: "/extras.json" }), makePorts({ ...captureFiles(), "/extras.json": JSON.stringify(extras) }).ports);
    const gates = result.google.candidates.find((c) => c.url === url)!.gates;
    expect(gates.find((g) => g.id === "LIVE_TECHNICAL")!.status).toBe("PASS");
    expect(gates.find((g) => g.id === "BUYER_INTENT")!.status).toBe("PASS");
  });

  it("turns a changed shared template into a Guardian block, and a changed protected page into a blocked change", () => {
    const { ports } = makePorts(captureFiles(), {
      gitFacts: () => ({ branch: "b", headSha: SHA, baseSha: SHA, dirtyPaths: [], changedFiles: ["data/software/alpha.json", "components/Cta.tsx"], commitsAheadOfBase: 1, pushedToRemote: null }),
      isSharedTemplate: (f) => f.startsWith("components/"),
      loadProtection: () => ({ snapshot: makeProtection([signal({ urls: [U("/software/alpha")] })]), divergentWorktrees: [] }),
    });
    const result = runDirectorCli(options({ gatesFile: null }), ports);
    expect(result.guardian!.checks.find((c) => c.id === "protection:unaffected")!.status).toBe("FAIL");
    expect(result.guardian!.reasons.map((r) => r.code)).toContain("PROTECTED_PAGES_AFFECTED");
  });

  it("loads evidence through the ports only", () => {
    const { ports } = makePorts(captureFiles());
    const loaded = loadEvidence(options(), ports);
    expect(loaded.gsc).not.toBeNull();
    expect(loaded.problems).toEqual([]);
    expect(loaded.indexation!.sitemap.state).toBe("NOT_MEASURED");
  });
});

describe("the monetization lookup the CLI hands to the Google agent", () => {
  const inventory = makeInventory({ comparisons: [["alpha", "beta"]], otherCtas: { beta: ["alpha"] } });

  it("counts the product itself and every other product its decision guide or buyer checklist shows", () => {
    const lookup = monetizationLookup(inventory, [partnerFacts("alpha")]);
    expect(lookup(U("/software/alpha"))).toMatchObject({ verified: true });
    expect(lookup(U("/software/beta"))).toMatchObject({ verified: true });
    expect(lookup(U("/software/beta")).detail).toMatch(/shown as another option: alpha/);
    expect(lookup(U("/compare/alpha-vs-beta"))).toMatchObject({ verified: true });
  });

  it("says no when neither the product nor another product it shows has an active partner", () => {
    const lookup = monetizationLookup(inventory, [partnerFacts("alpha")]);
    expect(lookup(U("/software/gamma"))).toMatchObject({ verified: false });
    expect(lookup(U("/software/delta")).detail).toMatch(/no other product it shows a call to action for/);
  });

  it("does not call a partner path verified unless its link, technical path and ledger agree", () => {
    for (const broken of [{ technicalPathReady: false }, { issuedLinkPresent: false }, { ledgerAgrees: false }]) {
      const lookup = monetizationLookup(inventory, [partnerFacts("alpha", broken)]);
      expect(lookup(U("/software/alpha")), JSON.stringify(broken)).toMatchObject({ verified: false });
    }
  });

  it("is unknown, not false, for a page it cannot place or a page type with no product", () => {
    const lookup = monetizationLookup(inventory, [partnerFacts("alpha")]);
    expect(lookup(U("/software/not-in-inventory")).verified).toBeNull();
    expect(lookup(U("/")).verified).toBeNull();
  });
});

describe("candidates.csv", () => {
  it("has one row per evaluated page plus a header, and quotes cells that contain commas or quotes", () => {
    const world = makeWorld();
    const csv = candidatesCsv(world.google);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(world.google.candidates.length + 1);
    expect(lines[0]).toMatch(/^url,kind,historical_impressions/);
    const tricky = { ...world.google, candidates: [{ ...world.google.candidates[0]!, url: 'https://miloosh.com/software/a,"b"' }] };
    expect(candidatesCsv(tricky)).toContain('"https://miloosh.com/software/a,""b"""');
  });
});

describe("command-line parsing", () => {
  const root = "/repo";

  it("resolves relative paths against the repository root and reads flags with and without values", () => {
    const parsed = parseArgs(["--gsc-dir", "docs/cap", "--out", "docs/out", "--strict", "--run-gates", "--now", "2026-10-09T00:00:00Z", "--base-sha", "abc1234"], root);
    if ("help" in parsed) throw new Error("unexpected help");
    expect(parsed).toMatchObject({ gscDir: "/repo/docs/cap", outDir: "/repo/docs/out", strict: true, runGates: true, checkProduction: false, baseSha: "abc1234" });
    expect(parsed.now.toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });

  it("defaults to a run that writes nothing", () => {
    const parsed = parseArgs([], root);
    if ("help" in parsed) throw new Error("unexpected help");
    expect(parsed).toMatchObject({ outDir: null, runGates: false, checkProduction: false, strict: false });
  });

  it("rejects unknown options, stray arguments and an invalid date", () => {
    expect(() => parseArgs(["--deploy"], root)).toThrow(/Unknown option --deploy/);
    expect(() => parseArgs(["--push", "origin"], root)).toThrow(/Unknown option --push/);
    expect(() => parseArgs(["foo"], root)).toThrow(/Unexpected argument/);
    expect(() => parseArgs(["--now", "yesterday"], root)).toThrow(/--now must be an ISO timestamp/);
  });

  it("has no option that deploys, pushes, merges, requests indexing, sends or edits an account", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/growth/growth-director.ts"), "utf8");
    const options = [...source.matchAll(/--([a-z-]+)/g)].map((m) => m[1]!);
    for (const option of new Set(options)) expect(option, option).not.toMatch(/deploy|push|merge|publish|index|send|submit|apply|write-account|force/);
  });

  it("returns help without running anything", () => {
    expect(parseArgs(["--help"], root)).toEqual({ help: true });
  });
});

describe("the real entry point (this workspace's path contains spaces and non-ASCII characters)", () => {
  const script = path.join(process.cwd(), "scripts/growth/growth-director.ts");

  it("prints usage and exits 0 with --help, proving the entry guard fires for such a path", () => {
    const out = execFileSync("npx", ["tsx", script, "--help"], { cwd: process.cwd(), encoding: "utf8", timeout: 60_000 });
    expect(out).toMatch(/Usage: npm run growth:director/);
    expect(out).toMatch(/Without it nothing is written/);
  }, 90_000);

  it("is registered as an npm script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["growth:director"]).toBe("tsx scripts/growth/growth-director.ts");
  });
});
