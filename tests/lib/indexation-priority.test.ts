import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndexationPriorityList, loadCachedGscOpportunities, loadPrioritySnapshot, GSC_CACHE_PATH, PRIORITY_SNAPSHOT_PATH } from "@/scripts/growth/indexation-priority";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Priority 2.
 * Real-data smoke tests: every row must correctly disclose whether it's
 * backed by real cached GSC evidence or only an inferred structural
 * proxy -- the whole point of this tool is never letting a proxy signal
 * masquerade as real demand data.
 */
describe("buildIndexationPriorityList", () => {
  it("returns exactly topN rows sorted by score descending", () => {
    const rows = buildIndexationPriorityList(50);
    expect(rows).toHaveLength(50);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.score).toBeLessThanOrEqual(rows[i - 1]!.score);
    }
  });

  it("every CACHED row carries real gscImpressions/gscPosition; every INFERRED row carries neither", () => {
    const rows = buildIndexationPriorityList(50);
    for (const row of rows) {
      if (row.evidenceType === "CACHED") {
        expect(row.gscImpressions).toBeGreaterThanOrEqual(0);
        expect(row.gscPosition).toBeGreaterThan(0);
      } else {
        expect(row.gscImpressions).toBeUndefined();
        expect(row.gscPosition).toBeUndefined();
      }
    }
  });

  it("real cached evidence always outranks a purely inferred page", () => {
    const rows = buildIndexationPriorityList(50);
    const lastCached = [...rows].reverse().find((r) => r.evidenceType === "CACHED");
    const firstInferred = rows.find((r) => r.evidenceType === "INFERRED");
    if (lastCached && firstInferred) {
      const lastCachedIndex = rows.indexOf(lastCached);
      const firstInferredIndex = rows.indexOf(firstInferred);
      expect(lastCachedIndex).toBeLessThan(firstInferredIndex);
    }
  });

  it("semrush (a real page in the committed priority snapshot) appears with its real cached evidence", () => {
    const rows = buildIndexationPriorityList(50);
    const semrush = rows.find((r) => r.url === "/software/semrush");
    expect(semrush?.evidenceType).toBe("CACHED");
    expect(semrush?.gscImpressions).toBeGreaterThan(0);
    expect(semrush?.gscPosition).toBeGreaterThan(0);
  });
});

/**
 * MILOOSH CLAUDE OVERNIGHT WAR MISSION (2026-08-22/23), P0 — production
 * determinism. buildIndexationPriorityList (and, through it, the
 * homepage's "Explore" / "Featured comparisons" sections) must render
 * identically regardless of what happens to exist in the local/gitignored
 * var/ directory on whichever machine builds or deploys it. Proves this
 * directly rather than just asserting it in a comment: the same call
 * produces byte-identical results whether var/agents exists or not.
 */
describe("buildIndexationPriorityList — deterministic regardless of local var/agents state", () => {
  const AGENTS_DIR = path.join(process.cwd(), "var", "agents");
  const BACKUP_DIR = path.join(process.cwd(), "var", "agents-test-backup-indexation");

  it("produces identical output with var/agents present vs. entirely absent", () => {
    const before = buildIndexationPriorityList(50);

    const hadAgentsDir = fs.existsSync(AGENTS_DIR);
    if (hadAgentsDir) fs.renameSync(AGENTS_DIR, BACKUP_DIR);
    try {
      const withoutVarAgents = buildIndexationPriorityList(50);
      expect(withoutVarAgents).toEqual(before);
    } finally {
      if (hadAgentsDir) fs.renameSync(BACKUP_DIR, AGENTS_DIR);
    }
  });
});

/**
 * PUBLIC-SAFE evidence loader regression suite. This is the boundary that
 * actually matters for public rendering now (buildIndexationPriorityList
 * reads loadPrioritySnapshot, backed by the committed data/seo/priority-
 * snapshot.json — never var/). Same fail-safe posture proven for the old
 * var/-backed loader below: missing/malformed file or entries degrade to
 * an empty map, never a crash, never fabricated rows — even though this
 * file is committed and "missing" shouldn't normally happen, a bad merge
 * or manual edit must not be able to break the build or public rendering.
 */
describe("priority snapshot loading — missing/invalid committed file must never crash or fabricate data", () => {
  let backup: string | null = null;

  beforeEach(() => {
    backup = fs.existsSync(PRIORITY_SNAPSHOT_PATH) ? fs.readFileSync(PRIORITY_SNAPSHOT_PATH, "utf-8") : null;
  });

  afterEach(() => {
    if (backup !== null) {
      fs.writeFileSync(PRIORITY_SNAPSHOT_PATH, backup);
    } else {
      fs.rmSync(PRIORITY_SNAPSHOT_PATH, { force: true });
    }
  });

  it("a missing snapshot file does not crash and yields zero cached evidence", () => {
    fs.rmSync(PRIORITY_SNAPSHOT_PATH, { force: true });
    expect(() => loadPrioritySnapshot()).not.toThrow();
    expect(loadPrioritySnapshot().size).toBe(0);

    const rows = buildIndexationPriorityList(50);
    expect(rows).toHaveLength(50);
    expect(rows.every((r) => r.evidenceType === "INFERRED")).toBe(true);
    expect(rows.every((r) => r.gscImpressions === undefined && r.gscPosition === undefined)).toBe(true);
  });

  it("a present, well-formed snapshot file is parsed correctly", () => {
    fs.mkdirSync(path.dirname(PRIORITY_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(PRIORITY_SNAPSHOT_PATH, JSON.stringify({ rows: [{ url: "/software/postmark", impressions: 6, clicks: 0, ctr: 0, position: 10 }] }));
    const map = loadPrioritySnapshot();
    expect(map.get("/software/postmark")).toEqual({ url: "/software/postmark", impressions: 6, clicks: 0, ctr: 0, position: 10 });
  });

  it("invalid JSON in the snapshot file fails safely — no crash, no fabricated rows", () => {
    fs.mkdirSync(path.dirname(PRIORITY_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(PRIORITY_SNAPSHOT_PATH, "{not valid json");
    expect(() => loadPrioritySnapshot()).not.toThrow();
    expect(loadPrioritySnapshot().size).toBe(0);
  });

  it("a wrong-shape snapshot file (valid JSON, unexpected structure) fails safely", () => {
    fs.mkdirSync(path.dirname(PRIORITY_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(PRIORITY_SNAPSHOT_PATH, JSON.stringify({ somethingElse: true }));
    expect(loadPrioritySnapshot().size).toBe(0);
  });

  it("malformed rows within an otherwise-valid array are silently dropped, not fabricated into shape", () => {
    fs.mkdirSync(path.dirname(PRIORITY_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(
      PRIORITY_SNAPSHOT_PATH,
      JSON.stringify({ rows: [{ url: "/software/postmark", impressions: 6, clicks: 0, ctr: 0, position: 10 }, { url: "/software/broken" }, "not-even-an-object"] })
    );
    const map = loadPrioritySnapshot();
    expect(map.size).toBe(1);
    expect(map.has("/software/postmark")).toBe(true);
    expect(map.has("/software/broken")).toBe(false);
  });
});

/**
 * EMERGENCY BUILD FIX (2026-08-22) regression suite. The real production
 * incident: this file used to `import gscOpportunityMining from
 * "@/var/agents/gsc-opportunity-mining.json"` at compile time -- but
 * /var/ is gitignored (agent working state, never committed by design),
 * so the file only ever existed in this local session's filesystem. Fixed
 * by loading at RUNTIME via fs.readFileSync. loadCachedGscOpportunities()
 * is no longer used by buildIndexationPriorityList (see the loader above
 * for what public rendering actually depends on now) but remains real,
 * live, analysis-only tooling -- kept working and regression-tested here.
 */
describe("GSC cache loading (analysis-only, var/) — missing/invalid file must never crash or fabricate data", () => {
  let backup: string | null = null;

  beforeEach(() => {
    backup = fs.existsSync(GSC_CACHE_PATH) ? fs.readFileSync(GSC_CACHE_PATH, "utf-8") : null;
  });

  afterEach(() => {
    if (backup !== null) {
      fs.writeFileSync(GSC_CACHE_PATH, backup);
    } else {
      fs.rmSync(GSC_CACHE_PATH, { force: true });
    }
  });

  it("a missing cache file does not crash and yields zero cached evidence", () => {
    fs.rmSync(GSC_CACHE_PATH, { force: true });
    expect(() => loadCachedGscOpportunities()).not.toThrow();
    expect(loadCachedGscOpportunities().size).toBe(0);
  });

  it("a present, well-formed cache file is parsed correctly", () => {
    fs.mkdirSync(path.dirname(GSC_CACHE_PATH), { recursive: true });
    fs.writeFileSync(GSC_CACHE_PATH, JSON.stringify({ allOpportunities: [{ targetSlug: "postmark", baselineImpressions: 6, baselinePosition: 10 }] }));
    const map = loadCachedGscOpportunities();
    expect(map.get("postmark")).toEqual({ targetSlug: "postmark", baselineImpressions: 6, baselinePosition: 10 });
  });

  it("invalid JSON in the cache file fails safely — no crash, no fabricated rows", () => {
    fs.mkdirSync(path.dirname(GSC_CACHE_PATH), { recursive: true });
    fs.writeFileSync(GSC_CACHE_PATH, "{not valid json");
    expect(() => loadCachedGscOpportunities()).not.toThrow();
    expect(loadCachedGscOpportunities().size).toBe(0);
  });

  it("a wrong-shape cache file (valid JSON, unexpected structure) fails safely", () => {
    fs.mkdirSync(path.dirname(GSC_CACHE_PATH), { recursive: true });
    fs.writeFileSync(GSC_CACHE_PATH, JSON.stringify({ somethingElse: true }));
    expect(loadCachedGscOpportunities().size).toBe(0);
  });

  it("malformed entries within an otherwise-valid array are silently dropped, not fabricated into shape", () => {
    fs.mkdirSync(path.dirname(GSC_CACHE_PATH), { recursive: true });
    fs.writeFileSync(GSC_CACHE_PATH, JSON.stringify({ allOpportunities: [{ targetSlug: "postmark", baselineImpressions: 6, baselinePosition: 10 }, { targetSlug: "broken-entry" }, "not-even-an-object"] }));
    const map = loadCachedGscOpportunities();
    expect(map.size).toBe(1);
    expect(map.has("postmark")).toBe(true);
    expect(map.has("broken-entry")).toBe(false);
  });
});
