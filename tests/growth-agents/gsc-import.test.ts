import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GscImportError,
  buildGscEvidence,
  clicksOf,
  findDatesTable,
  findPagesTable,
  findQueriesTable,
  impressionsOf,
  loadGscCapture,
  lookupPage,
  pageQueryEvidence,
  parseCsv,
} from "@/lib/growth-agents/gsc-import";
import { U, addPageQueryTable, csv, makeCapture, makeEvidence, type PageRow } from "./fixtures";

const HIST: PageRow[] = [
  [U("/software/alpha"), 0, 240, 70],
  [U("/software/beta"), 3, 60, 12.4],
];
const RECENT: PageRow[] = [[U("/software/beta"), 1, 8, 9]];

function problemsOf(action: () => unknown): string[] {
  try {
    action();
  } catch (error) {
    if (error instanceof GscImportError) return error.problems;
    throw error;
  }
  return [];
}

describe("parseCsv", () => {
  it("reads quoted fields, doubled quotes, CRLF line ends and a UTF-8 BOM", () => {
    const rows = parseCsv('﻿Top pages,Clicks\r\n"https://miloosh.com/a,b",3\r\n"say ""hi""",4\r\n');
    expect(rows).toEqual([
      ["Top pages", "Clicks"],
      ["https://miloosh.com/a,b", "3"],
      ['say "hi"', "4"],
    ]);
  });
});

describe("buildGscEvidence: a capture is accepted only when it adds up", () => {
  it("builds typed tables with honest denominators", () => {
    const gsc = makeEvidence({ hist: HIST, recent: RECENT });
    const hist = findPagesTable(gsc, "historical")!;
    expect(hist.rowsCaptured).toBe(2);
    expect(hist.rowSum).toEqual({ clicks: 3, impressions: 300 });
    expect(hist.windowDays).toBe(28);
    // The property only had data from 2026-08-07: the rate denominator is 13 observed days, not 28.
    expect(hist.observedDays).toBe(13);
    expect(hist.finalized).toBe(true);
    expect(findPagesTable(gsc, "recent")!.observedDays).toBe(28);
    expect(findDatesTable(gsc, "recent")!.days).toHaveLength(28);
  });

  it("merges the www and apex rows of one page, summing counts and weighting position by impressions", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.files["ph.csv"] = csv("Top pages,Clicks,Impressions,CTR,Position", [
      ["https://miloosh.com/software/alpha", 1, 100, "1%", "10.0"],
      ["https://www.miloosh.com/software/alpha", 1, 300, "0.3%", "20.0"],
    ]);
    capture.manifest.tables[0].rowsReported = 2;
    capture.manifest.tables[0].propertyTotals = { clicks: 2, impressions: 400 };
    const gsc = buildGscEvidence(capture.manifest, capture.files);
    const page = findPagesTable(gsc, "historical")!.pages.get(U("/software/alpha"))!;
    expect(page.variants).toHaveLength(2);
    expect(page.metrics).toMatchObject({ clicks: 2, impressions: 400, position: 17.5 });
    expect(findPagesTable(gsc, "historical")!.pages.size).toBe(1);
  });

  it("rejects rounded display values: 25.6K is not a count", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.files["ph.csv"] = csv("Top pages,Clicks,Impressions,CTR,Position", [[U("/software/alpha"), 0, "25.6K", "0%", "70.0"], [U("/software/beta"), 3, 60, "5%", "12.4"]]);
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/not an exact whole number/);
  });

  it("rejects impossible rows: clicks above impressions, a position for zero impressions, a duplicated URL", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.files["ph.csv"] = csv("Top pages,Clicks,Impressions,CTR,Position", [
      [U("/software/alpha"), 5, 2, "250%", "3.0"],
      [U("/software/beta"), 0, 0, "0%", "9.0"],
      [U("/software/gamma"), 0, 4, "0%", "9.0"],
      [U("/software/gamma"), 0, 5, "0%", "9.0"],
    ]);
    const problems = problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n");
    expect(problems).toMatch(/clicks \(5\) exceed impressions \(2\)/);
    expect(problems).toMatch(/position was reported for zero impressions/);
    expect(problems).toMatch(/URL listed twice/);
  });

  it("rejects a row that is not a Miloosh page", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.files["ph.csv"] = csv("Top pages,Clicks,Impressions,CTR,Position", [["https://example.com/x", 0, 5, "0%", "9.0"], [U("/software/beta"), 3, 60, "5%", "12.4"]]);
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/not a Miloosh page URL/);
  });

  it("rejects overlapping historical and recent windows", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.manifest.tables[1].window = { start: "2026-08-10", end: "2026-09-06" };
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/historical window of "pages-historical" and the recent window of "pages-recent" overlap/);
  });

  it("rejects a table marked complete whose row count differs from the pager total, and the reverse", () => {
    const short = makeCapture({ hist: HIST, recent: RECENT });
    short.manifest.tables[0].rowsReported = 5;
    expect(problemsOf(() => buildGscEvidence(short.manifest, short.files)).join("\n")).toMatch(/marked complete but has 2 rows while the pager reported 5/);
    const lying = makeCapture({ hist: HIST, recent: RECENT });
    lying.manifest.tables[0].complete = false;
    expect(problemsOf(() => buildGscEvidence(lying.manifest, lying.files)).join("\n")).toMatch(/marked incomplete but has 2 of 2 rows/);
  });

  it("reports every problem in one pass instead of the first", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    delete capture.files["pr.csv"];
    capture.manifest.tables[0].rowsReported = 9;
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).length).toBeGreaterThanOrEqual(2);
  });

  it("refuses a table file name that could leave the capture folder", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.manifest.tables[0].file = "../secrets.csv";
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/bare file name/);
  });

  it("treats a private table that was not provided as a warning, and a committed one as an error", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.manifest.tables.push({ id: "queries-historical", role: "historical", kind: "queries", file: "q.csv", window: { start: "2026-07-23", end: "2026-08-19" }, rowsReported: 10, complete: false, visibility: "private" });
    const gsc = buildGscEvidence(capture.manifest, capture.files);
    expect(gsc.warnings.join("\n")).toMatch(/private and was not provided/);
    expect(gsc.tables.some((t) => t.kind === "queries")).toBe(false);
    capture.manifest.tables[capture.manifest.tables.length - 1].visibility = "committed";
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/file q.csv was not provided/);
  });

  it("marks days after the last finalised day as not final and warns about the window", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT, dataThrough: "2026-10-02" });
    const gsc = buildGscEvidence(capture.manifest, capture.files);
    const days = findDatesTable(gsc, "recent")!.days;
    expect(days.filter((d) => !d.final).map((d) => d.date)).toEqual(["2026-10-03", "2026-10-04", "2026-10-05"]);
    expect(findPagesTable(gsc, "recent")!.finalized).toBe(false);
    expect(gsc.warnings.join("\n")).toMatch(/after the last finalised day 2026-10-02/);
  });

  it("accepts only the documented manifest shape", () => {
    expect(problemsOf(() => buildGscEvidence({ schemaVersion: 2 }, {})).length).toBeGreaterThan(0);
    expect(problemsOf(() => buildGscEvidence(null, {})).length).toBeGreaterThan(0);
  });
});

describe("queries tables filtered to one page", () => {
  const ALPHA_PATH = "/software/alpha";
  const rows = [["alpha alternatives", 150], ["alpha vs beta", 60], ["alpha login", 30]] as const;
  const build = (mutate: (capture: ReturnType<typeof makeCapture>) => void = () => {}, spec: Partial<Parameters<typeof addPageQueryTable>[1]> = {}) => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    addPageQueryTable(capture, { path: ALPHA_PATH, rows, declaredImpressions: 240, ...spec });
    mutate(capture);
    return buildGscEvidence(capture.manifest, capture.files);
  };

  it("is attributed to the page whose exact path the filter names, when its impressions agree with the pages table", () => {
    const found = pageQueryEvidence(build(), "historical", U(ALPHA_PATH));
    expect(found.state).toBe("MEASURED");
    if (found.state === "MEASURED") {
      expect(found.table.queries.map((q) => q.query)).toEqual(["alpha alternatives", "alpha vs beta", "alpha login"]);
      expect(found.table.pageFilter).toEqual({ mode: "contains", value: ALPHA_PATH });
      expect(found.note).toMatch(/impressions agree with the pages table \(240\)/);
    }
  });

  it("is not attributed when its impressions disagree with the pages table: the filter may have matched other pages", () => {
    const found = pageQueryEvidence(build(() => {}, { declaredImpressions: 300 }), "historical", U(ALPHA_PATH));
    expect(found.state).toBe("NOT_OBSERVED");
    if (found.state === "NOT_OBSERVED") expect(found.reason).toMatch(/reports 300 impressions but the pages table lists 240/);
  });

  it("is not attributed without a declared total, to a page with a different path, or for another window", () => {
    expect(pageQueryEvidence(build(() => {}, { declaredImpressions: null }), "historical", U(ALPHA_PATH)).state).toBe("NOT_OBSERVED");
    expect(pageQueryEvidence(build(), "historical", U("/software/beta")).state).toBe("NOT_OBSERVED");
    expect(pageQueryEvidence(build(), "recent", U(ALPHA_PATH)).state).toBe("NOT_OBSERVED");
    expect(pageQueryEvidence(build(), "historical", "https://example.com/software/alpha").state).toBe("NOT_OBSERVED");
  });

  it("is not attributed to a page the pages table does not list", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    addPageQueryTable(capture, { path: "/software/unlisted", rows: [["x alternatives", 20]] });
    const found = pageQueryEvidence(buildGscEvidence(capture.manifest, capture.files), "historical", U("/software/unlisted"));
    expect(found).toMatchObject({ state: "NOT_OBSERVED" });
  });

  it("is never mistaken for the property-wide queries table", () => {
    const gsc = build();
    expect(findQueriesTable(gsc, "historical")).toBeNull();
    expect(gsc.tables.filter((t) => t.kind === "queries")).toHaveLength(1);
  });

  it("is rejected on a table that is not a queries table, and must name a path", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    (capture.manifest.tables[0] as Record<string, unknown>).pageFilter = { mode: "contains", value: ALPHA_PATH };
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/a page filter belongs on a queries table/);
    const bad = makeCapture({ hist: HIST, recent: RECENT });
    addPageQueryTable(bad, { path: "software/alpha", rows });
    expect(problemsOf(() => buildGscEvidence(bad.manifest, bad.files)).join("\n")).toMatch(/a path starting with \//);
  });

  it("checks every historical window against every recent window, not just the first table of each kind", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    addPageQueryTable(capture, { path: ALPHA_PATH, rows, declaredImpressions: 240 });
    addPageQueryTable(capture, { path: "/software/beta", rows, declaredImpressions: 300, role: "recent" });
    capture.manifest.tables[capture.manifest.tables.length - 1]!.window = { start: "2026-08-15", end: "2026-09-10" };
    expect(problemsOf(() => buildGscEvidence(capture.manifest, capture.files)).join("\n")).toMatch(/queries: the historical window of "queries-page-software-alpha" and the recent window of "queries-page-software-beta" overlap/);
  });
});

describe("lookupPage: a page that is not listed is never silently zero", () => {
  const listed = U("/software/beta");
  const absent = U("/software/gamma");

  it("returns the measured numbers for a listed page (www and query variants included)", () => {
    const gsc = makeEvidence({ hist: HIST, recent: RECENT });
    const found = lookupPage(gsc, "historical", "https://www.miloosh.com/software/beta?utm_source=x");
    expect(found.state).toBe("MEASURED");
    expect(impressionsOf(found)).toBe(60);
    expect(clicksOf(found)).toBe(3);
  });

  it("reads absence from a complete table as zero only when the manifest justifies it", () => {
    const justified = lookupPage(makeEvidence({ hist: HIST, recent: RECENT }), "recent", absent);
    expect(justified.state).toBe("ABSENT_FROM_COMPLETE_TABLE");
    expect(impressionsOf(justified)).toBe(0);

    const unjustified = lookupPage(makeEvidence({ hist: HIST, recent: RECENT, zeroJustification: false }), "recent", absent);
    expect(unjustified.state).toBe("NOT_OBSERVED");
    expect(impressionsOf(unjustified)).toBeNull();
    expect(clicksOf(unjustified)).toBeNull();
  });

  it("never reads absence from a partial table as zero, even if a justification is written", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT, recentComplete: false, recentRowsReported: 50 });
    capture.manifest.tables[1].zeroIfAbsentJustification = "claimed but the table is partial";
    const gsc = buildGscEvidence(capture.manifest, capture.files);
    const result = lookupPage(gsc, "recent", absent);
    expect(result.state).toBe("NOT_OBSERVED");
    expect(impressionsOf(result)).toBeNull();
  });

  it("accepts an exact-page check that returned no data, but only if it covers the whole window", () => {
    const covering = makeCapture({ hist: HIST, recent: RECENT, zeroJustification: false });
    covering.manifest.exactPageChecks = [{ url: absent, window: { start: "2026-09-08", end: "2026-10-05" }, result: "NO_DATA", checkedAt: "2026-10-08T23:00:00Z", method: "exact-page filter, Web" }];
    expect(lookupPage(buildGscEvidence(covering.manifest, covering.files), "recent", absent).state).toBe("EXACT_EMPTY");

    const narrower = makeCapture({ hist: HIST, recent: RECENT, zeroJustification: false });
    narrower.manifest.exactPageChecks = [{ url: absent, window: { start: "2026-09-20", end: "2026-10-05" }, result: "NO_DATA", checkedAt: "2026-10-08T23:00:00Z", method: "exact-page filter, Web" }];
    expect(lookupPage(buildGscEvidence(narrower.manifest, narrower.files), "recent", absent).state).toBe("NOT_OBSERVED");

    const hasData = makeCapture({ hist: HIST, recent: RECENT, zeroJustification: false });
    hasData.manifest.exactPageChecks = [{ url: absent, window: { start: "2026-09-08", end: "2026-10-05" }, result: "DATA", checkedAt: "2026-10-08T23:00:00Z", method: "exact-page filter, Web" }];
    expect(lookupPage(buildGscEvidence(hasData.manifest, hasData.files), "recent", absent).state).toBe("NOT_OBSERVED");
  });

  it("is UNAVAILABLE for a non-Miloosh URL or a capture without that table", () => {
    const gsc = makeEvidence({ hist: HIST, recent: RECENT });
    expect(lookupPage(gsc, "recent", "https://example.com/x").state).toBe("UNAVAILABLE");
    const withoutRecent = { ...gsc, tables: gsc.tables.filter((t) => !(t.kind === "pages" && t.role === "recent")) };
    expect(lookupPage(withoutRecent, "recent", listed).state).toBe("UNAVAILABLE");
  });
});

describe("loadGscCapture", () => {
  it("builds evidence through an injected reader", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    const reader = (name: string) => (name === "manifest.json" ? JSON.stringify(capture.manifest) : (capture.files[name] ?? (() => { throw new Error(`ENOENT ${name}`); })()));
    expect(findPagesTable(loadGscCapture(reader), "historical")!.pages.size).toBe(2);
  });

  it("reports an unreadable manifest as a capture problem, not a crash", () => {
    expect(problemsOf(() => loadGscCapture(() => "{not json")).join("\n")).toMatch(/manifest.json could not be read as JSON/);
    expect(problemsOf(() => loadGscCapture(() => { throw new Error("ENOENT"); })).join("\n")).toMatch(/manifest.json could not be read/);
  });

  it("ignores a table name that is not a bare file name rather than reading outside the folder", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    capture.manifest.tables[0].file = "../escape.csv";
    const requested: string[] = [];
    const reader = (name: string) => {
      requested.push(name);
      return name === "manifest.json" ? JSON.stringify(capture.manifest) : (capture.files[name] ?? "");
    };
    expect(() => loadGscCapture(reader)).toThrow(GscImportError);
    expect(requested).not.toContain("../escape.csv");
  });
});

// The capture committed with this work: Search Console tables read read-only from the owner's signed-in session on 2026-10-08.
describe("the committed 20261009 Search Console capture", () => {
  const dir = path.join(process.cwd(), "docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009");
  const available = fs.existsSync(path.join(dir, "manifest.json"));
  const gsc = available ? loadGscCapture((name) => fs.readFileSync(path.join(dir, name), "utf8")) : null;

  it.skipIf(!available)("is complete, internally consistent and keeps query-level data private", () => {
    const hist = findPagesTable(gsc!, "historical")!;
    const recent = findPagesTable(gsc!, "recent")!;
    expect(hist.complete && recent.complete).toBe(true);
    expect(hist.rowsCaptured).toBe(hist.rowsReported);
    expect(recent.rowsCaptured).toBe(recent.rowsReported);
    expect(hist.rowSum.clicks).toBe(hist.propertyTotals?.clicks);
    // Fewer canonical pages than listed rows: the www and apex rows of seven pages were merged.
    expect(hist.pages.size).toBeLessThan(hist.rowsCaptured);
    expect([...hist.pages.values()].filter((p) => p.variants.length > 1).length).toBeGreaterThan(0);
    expect(hist.observedDays).toBeLessThan(hist.windowDays);
    expect(gsc!.tables.some((t) => t.kind === "queries")).toBe(false);
    expect(gsc!.warnings.join("\n")).toMatch(/private/);
  });

  it.skipIf(!available)("contains no day after the last finalised day inside a final window", () => {
    const recentDays = findDatesTable(gsc!, "recent")!.days;
    expect(recentDays.every((d) => d.final === (d.date <= gsc!.dataThrough))).toBe(true);
    expect(recentDays.some((d) => !d.final)).toBe(true);
  });

  it.skipIf(!available)("never reports an unlisted page as a measured zero without justification", () => {
    const state = lookupPage(gsc!, "historical", U("/software/definitely-not-a-real-product")).state;
    expect(["ABSENT_FROM_COMPLETE_TABLE", "NOT_OBSERVED"]).toContain(state);
    if (state === "ABSENT_FROM_COMPLETE_TABLE") expect(findPagesTable(gsc!, "historical")!.zeroIfAbsentJustification).toBeTruthy();
  });
});
