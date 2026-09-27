import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PROTECTION_SOURCES, currentProtectionSnapshot, protectionFingerprint, staleProtectionAlert, assertCurrentMutation } from "@/lib/google-war/current-protection";

const fixtures: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "miloosh-protection-test-"));
  fixtures.push(root);
  for (const file of [...PROTECTION_SOURCES, "tsconfig.json"]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(file, path.join(root, file));
  }
  fs.symlinkSync(path.resolve("node_modules"), path.join(root, "node_modules"), "dir");
  return root;
}
afterEach(() => { for (const root of fixtures.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
describe("CURRENT protection is required at mutation boundaries", () => {
  it("reloads changed TS registries in the same parent process; stale snapshot cannot authorize", () => {
    const root = fixture(), before = currentProtectionSnapshot(root);
    expect(assertCurrentMutation(before.fingerprint, ["/software/new-fixture"], root).fingerprint).toBe(before.fingerprint);
    const file = path.join(root, "data/growth/frozen-cohorts.ts");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"whimsical",', '"new-fixture", "whimsical",'));
    const after = currentProtectionSnapshot(root);
    expect(after.entries.some(p => p.page === "/software/new-fixture")).toBe(true);
    expect(staleProtectionAlert(before.fingerprint, after.fingerprint)).toMatchObject({ severity: "HIGH", code: "STALE_PROTECTION_SNAPSHOT" });
    expect(() => assertCurrentMutation(before.fingerprint, ["/software/new-fixture"], root)).toThrow("STALE_PROTECTION_SNAPSHOT");
    expect(() => assertCurrentMutation(after.fingerprint, ["/software/new-fixture"], root)).toThrow("Protected mutation denied");
  });
  it("detects newly added and changed experiment files, even if the report said SAFE_TO_EDIT", () => {
    const root = fixture(), before = currentProtectionSnapshot(root);
    const file = path.join(root, "docs/experiment-new.json");
    fs.writeFileSync(file, JSON.stringify([{ page: "/software/new-fixture", decision: "MEASURING", recordedAt: "2026-01-01T00:00:00Z", measurementWindowDays: 7 }]));
    expect(protectionFingerprint(root)).not.toBe(before.fingerprint);
    expect(() => assertCurrentMutation(before.fingerprint, [], root)).toThrow("STALE_PROTECTION_SNAPSHOT");
    expect(currentProtectionSnapshot(root).entries.some(p => p.page === "/software/new-fixture")).toBe(true);
    fs.writeFileSync(file, "{corrupt");
    expect(() => currentProtectionSnapshot(root)).toThrow();
  });
  it("fails closed for missing canonical input and unknown legacy fingerprints", () => {
    const root = fixture(), before = currentProtectionSnapshot(root);
    expect(staleProtectionAlert(undefined, before.fingerprint)?.severity).toBe("HIGH");
    expect(() => assertCurrentMutation(undefined, [], root)).toThrow("STALE_PROTECTION_SNAPSHOT");
    fs.unlinkSync(path.join(root, PROTECTION_SOURCES[0]));
    expect(() => currentProtectionSnapshot(root)).toThrow();
  });
  it("does not permit returned arrays to poison a later read", () => {
    const root = fixture(), first = currentProtectionSnapshot(root);
    first.entries.length = 0;
    expect(currentProtectionSnapshot(root).entries.length).toBeGreaterThan(0);
    expect(staleProtectionAlert(first.fingerprint, first.fingerprint)).toBeNull();
  });
  it("reloads at cooldown expiry or a backward clock while retaining overdue MEASURING", () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, "docs/experiment-clock.json"), JSON.stringify([
      { page: "/software/cooldown-fixture", decision: "COMPLETE", recordedAt: "2026-01-01T00:00:00Z", measurementWindowDays: 1 },
      { page: "/software/measuring-fixture", decision: "MEASURING", recordedAt: "2026-01-01T00:00:00Z", measurementWindowDays: 1 },
    ]));
    expect(currentProtectionSnapshot(root, "2026-01-01T23:59:59Z").entries.some(p => p.page === "/software/cooldown-fixture")).toBe(true);
    const after = currentProtectionSnapshot(root, "2026-01-02T00:00:00Z");
    expect(after.entries.some(p => p.page === "/software/cooldown-fixture")).toBe(false);
    expect(after.entries.some(p => p.page === "/software/measuring-fixture")).toBe(true);
    expect(currentProtectionSnapshot(root, "2026-01-01T23:59:59Z").entries.some(p => p.page === "/software/cooldown-fixture")).toBe(true);
    expect(() => currentProtectionSnapshot(root, "invalid")).toThrow("Invalid protection clock");
  });
  it("wires public-data writers and cached permission consumers to the boundary", () => {
    for (const file of ["generate-priority-snapshot.ts", "freeze-google-war-baseline.ts", "google-war-receipt.ts", "register-traffic-mission-experiments.ts", "register-war-room-experiments.ts"])
      expect(fs.readFileSync("scripts/growth/" + file, "utf8")).toContain("assertCurrentMutation");
    expect(fs.readFileSync("scripts/growth/google-command-center.ts", "utf8")).toContain("!protectionAlert &&");
    expect(fs.readFileSync("scripts/growth/operations-report.ts", "utf8")).toContain("staleProtectionAlert");
    expect(fs.readFileSync("scripts/growth/protected-precheck.ts", "utf8")).toContain("loadCurrentProtection");
    for (const file of ["commercial-graph-engine.ts", "product-truth-audit.ts", "generic-copy-detector.ts", "commercial-priority-engine.ts"]) {
      const source = fs.readFileSync("scripts/growth/" + file, "utf8");
      expect(source).toContain("readProtectedExperimentSlugs()");
      expect(source).not.toContain('new Set([\n  "pipedrive"');
    }
  });
});
