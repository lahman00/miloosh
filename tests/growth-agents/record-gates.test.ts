import path from "node:path";
import { describe, expect, it } from "vitest";
import { main, parseArgs, pathWarning, type RecordGatesDeps } from "../../scripts/growth/record-gates";
import { GATE_COMMANDS } from "@/lib/growth-agents/guardian-sources";
import { SHA, gateResult, recordedGateRun } from "./fixtures";

const ROOT = "/repo";

function makeDeps(overrides: Partial<RecordGatesDeps> = {}) {
  const calls = { recorded: [] as string[], writes: [] as Array<[string, string]>, logs: [] as string[] };
  const deps: RecordGatesDeps = {
    record: (checkout, onGate) => {
      calls.recorded.push(checkout);
      const record = recordedGateRun();
      for (const result of record.results) onGate(result);
      return record;
    },
    writeText: (file, content) => void calls.writes.push([file, content]),
    exists: () => false,
    log: (line) => void calls.logs.push(line),
    ...overrides,
  };
  return { deps, calls };
}

describe("growth:record-gates arguments", () => {
  it("needs --out and resolves both paths against the repository root", () => {
    expect(() => parseArgs([], ROOT)).toThrow(/--out is required/);
    expect(parseArgs(["--out", "gates.json"], ROOT)).toEqual({ checkout: path.resolve(ROOT, "."), out: path.resolve(ROOT, "gates.json") });
    expect(parseArgs(["--out", "/x/gates.json", "--checkout", "../other"], ROOT)).toEqual({ checkout: path.resolve(ROOT, "../other"), out: "/x/gates.json" });
  });

  it("rejects unknown options and stray arguments, and answers --help", () => {
    expect(() => parseArgs(["--out", "a", "--force"], ROOT)).toThrow(/Unknown option --force/);
    expect(() => parseArgs(["--out", "a", "stray"], ROOT)).toThrow(/Unexpected argument: stray/);
    expect(parseArgs(["--help"], ROOT)).toEqual({ help: true });
  });
});

describe("growth:record-gates", () => {
  it("records the gates of the given checkout and writes the record to the one file it was given", () => {
    const { deps, calls } = makeDeps();
    expect(main(["--out", "/out/gates.json", "--checkout", "/work/cand"], ROOT, deps)).toBe(0);
    expect(calls.recorded).toEqual(["/work/cand"]);
    expect(calls.writes).toHaveLength(1);
    expect(calls.writes[0]![0]).toBe("/out/gates.json");
    const written = JSON.parse(calls.writes[0]![1]);
    expect(written).toMatchObject({ schemaVersion: 1, sha: SHA, dirty: false });
    expect(written.results).toHaveLength(6);
    expect(calls.logs.filter((l) => /^[a-z-]+: (PASS|FAIL)/.test(l))).toHaveLength(6);
    expect(calls.logs.at(-1)).toMatch(/recorded 6 gate result\(s\) for 80eb1e5 in a clean checkout/);
  });

  it("never overwrites an existing record, and runs nothing in that case", () => {
    const { deps, calls } = makeDeps({ exists: () => true });
    expect(main(["--out", "/out/gates.json"], ROOT, deps)).toBe(2);
    expect(calls.recorded).toEqual([]);
    expect(calls.writes).toEqual([]);
  });

  it("exits 0 for a failing gate (a result, not an error) and says plainly when the checkout was not clean", () => {
    const record = recordedGateRun({ dirty: true }, ["tests"]);
    const { deps, calls } = makeDeps({ record: () => record });
    expect(main(["--out", "/out/gates.json"], ROOT, deps)).toBe(0);
    expect(calls.logs.at(-1)).toMatch(/was NOT clean, so the Guardian will not trust this record/);
  });

  it("exits 2 with a message for invalid arguments and prints usage for --help", () => {
    const { deps, calls } = makeDeps();
    expect(main([], ROOT, deps)).toBe(2);
    expect(main(["--help"], ROOT, deps)).toBe(0);
    expect(calls.recorded).toEqual([]);
  });

  it("warns when the checkout path has spaces or non-ASCII characters, because the repository's own entry-point guards mis-detect them", () => {
    expect(pathWarning("/private/tmp/work/cand-d0d26a8")).toBeNull();
    expect(pathWarning("/Users/me/AI/1. פרוייקטים/Miloosh/site")).toMatch(/spaces or non-ASCII/);
    expect(pathWarning("/Users/me/My Projects/site")).toMatch(/spaces or non-ASCII/);
    const { deps, calls } = makeDeps();
    main(["--out", "/out/g.json", "--checkout", "/Users/me/My Projects/site"], ROOT, deps);
    expect(calls.logs[0]).toMatch(/^NOTE: The checkout path contains spaces/);
  });

  it("covers exactly the repository's own gate commands", () => {
    expect(GATE_COMMANDS.map((g) => g.gate)).toEqual(recordedGateRun().results.map((r) => r.gate));
    expect(gateResult("lint").gate).toBe("lint");
  });
});
