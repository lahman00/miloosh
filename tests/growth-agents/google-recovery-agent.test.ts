import { describe, expect, it } from "vitest";
import { buildGscEvidence } from "@/lib/growth-agents/gsc-import";
import { buildIndexationEvidence } from "@/lib/growth-agents/indexation";
import { DEFAULT_RECOVERY_CONFIG, compareEvaluations, runGoogleRecoveryAgent, type GoogleRecoveryInputs, type PageExtras } from "@/lib/growth-agents/google-recovery-agent";
import { measured } from "@/lib/growth-agents/evidence";
import { NOW, PROV, U, addPageQueryTable, fullExtras, makeCapture, makeEvidence, makeIndexation, makeInventory, makeProtection, makeSoftware, makeWorld, signal, spread, type PageRow } from "./fixtures";

const ALPHA = U("/software/alpha");
const BETA = U("/software/beta");
const GAMMA = U("/software/gamma");
const AB = U("/compare/alpha-vs-beta");

const HIST: PageRow[] = [
  [ALPHA, 0, 240, 70],
  [BETA, 0, 300, 75],
  [GAMMA, 0, 80, 60],
  [AB, 0, 40, 12],
  [U("/compare/beta-vs-gamma"), 0, 30, 30],
  [U("/software/delta"), 0, 6, 8],
  [U("/"), 1, 20, 5],
];
const RECENT: PageRow[] = [[U("/"), 0, 4, 5]];

const verified = () => ({ verified: true as const, detail: "active partner, resolved link" });
const noPartner = () => ({ verified: false as const, detail: "no active partner" });

function run(overrides: Partial<GoogleRecoveryInputs> = {}, hist: PageRow[] = HIST, recent: PageRow[] = RECENT) {
  const inventory = makeInventory();
  return runGoogleRecoveryAgent({
    now: NOW,
    gsc: makeEvidence({ hist, recent }),
    protection: makeProtection(),
    inventory,
    indexation: null,
    monetization: verified,
    ...overrides,
  });
}

/** Every confirmed fact for every page, so only protection decides whether a page is eligible. */
function allExtras(urls: string[]): ReadonlyMap<string, PageExtras> {
  return new Map(urls.map((url) => [url, fullExtras(url)]));
}

const ALL_URLS = HIST.map((r) => r[0]).filter((u) => u !== U("/"));

describe("missing Search Console input", () => {
  it("returns NEEDS_DATA, says how to provide the capture, and computes nothing", () => {
    const report = run({ gsc: null });
    expect(report.status).toBe("NEEDS_DATA");
    expect(report.missingInputs.map((m) => m.input)).toContain("Search Console performance capture");
    expect(report.missingInputs[0]!.howToProvide).toMatch(/manifest\.json/);
    expect(report.candidates).toEqual([]);
    expect(report.shortlist).toEqual([]);
    expect(report.families).toEqual([]);
    expect(report.windows.historical).toBeNull();
    expect(report.windows.recent).toBeNull();
    expect(report.nextAction.kind).toBe("NEEDS_DATA");
    // Nothing is reported as zero: the report contains no numeric demand at all.
    expect(JSON.stringify(report)).not.toMatch(/"impressions":\s*0\b/);
  });

  it("names every missing input, including a missing protection snapshot or site inventory", () => {
    const report = run({ gsc: null, protection: null, inventory: null });
    const names = report.missingInputs.map((m) => m.input);
    expect(names).toEqual(expect.arrayContaining(["Search Console performance capture", "protection snapshot", "site inventory"]));
  });

  it("refuses to run on a capture that lacks the recent (or historical) pages table", () => {
    const gsc = makeEvidence({ hist: HIST, recent: RECENT });
    const withoutRecent = { ...gsc, tables: gsc.tables.filter((t) => !(t.kind === "pages" && t.role === "recent")) };
    const report = run({ gsc: withoutRecent });
    expect(report.status).toBe("NEEDS_DATA");
    expect(report.missingInputs.map((m) => m.input)).toContain("recent Pages table");
    const withoutHistorical = { ...gsc, tables: gsc.tables.filter((t) => !(t.kind === "pages" && t.role === "historical")) };
    expect(run({ gsc: withoutHistorical }).missingInputs.map((m) => m.input)).toContain("historical Pages table");
  });

  it("does not treat missing protection data as clearance", () => {
    const report = run({ protection: makeProtection([], ["legacy-cohort"]) });
    const alpha = report.candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.protection.verdict).toBe("UNKNOWN");
    expect(alpha.eligible).toBe(false);
    expect(alpha.blockers.map((b) => b.code)).toContain("PROTECTION_UNKNOWN");
  });
});

describe("protected-page exclusion", () => {
  it("never makes a protected experiment page eligible, even when every other gate passes", () => {
    const report = run({
      extras: allExtras(ALL_URLS),
      indexation: makeIndexation(ALL_URLS),
      protection: makeProtection([signal({ urls: [ALPHA], detail: "legacy experiment" })]),
    });
    const alpha = report.candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.protection.verdict).toBe("PROTECTED");
    expect(alpha.eligible).toBe(false);
    expect(alpha.eligibleEditorial).toBe(false);
    expect(alpha.gates.find((g) => g.id === "PROTECTION_CLEAR")!.status).toBe("FAIL");
    expect(alpha.blockers.map((b) => b.code)).toContain("PROTECTED_EXPERIMENT");
    expect(report.nextAction.url).not.toBe(ALPHA);
    expect(report.shortlist.every((c) => c.url !== ALPHA || !c.eligible)).toBe(true);
  });

  it("also blocks a page whose shared data would re-render a protected page (derived pages)", () => {
    // /compare/alpha-vs-beta is built from alpha's record: protecting alpha blocks the comparison.
    const report = run({
      extras: allExtras(ALL_URLS),
      indexation: makeIndexation(ALL_URLS),
      protection: makeProtection([signal({ urls: [ALPHA] })]),
    });
    const comparison = report.candidates.find((c) => c.url === AB)!;
    expect(comparison.protection.verdict).toBe("EDITABLE");
    expect(comparison.derived.blocking.map((b) => b.url)).toContain(ALPHA);
    expect(comparison.gates.find((g) => g.id === "DERIVED_PAGES_CLEAR")!.status).toBe("FAIL");
    expect(comparison.eligible).toBe(false);
    expect(comparison.blockers.map((b) => b.code)).toContain("DERIVED_PAGE_BLOCKED");
    // A page with no protected dependency stays eligible.
    expect(report.candidates.find((c) => c.url === BETA)!.eligible).toBe(true);
  });

  it("does not offer any handoff when every ranked page is held", () => {
    const report = run({
      extras: allExtras(ALL_URLS),
      indexation: makeIndexation(ALL_URLS),
      protection: makeProtection([signal({ urls: ALL_URLS })]),
    });
    expect(report.candidates.some((c) => c.eligible)).toBe(false);
    expect(report.nextAction.kind).toBe("OWNER_DECISION");
    expect(report.nextAction.summary).toMatch(/only the owner can lift/);
  });

  it("waits, with the end date of the earliest window, when the only holds are observation windows", () => {
    // No comparisons, so no page depends on another; every product page is inside a window.
    const inventory = makeInventory({ comparisons: [] });
    const urls = [ALPHA, BETA, GAMMA, U("/software/delta")];
    const hist: PageRow[] = HIST.filter((r) => urls.includes(r[0]) || r[0] === U("/"));
    const report = run(
      {
        inventory,
        extras: allExtras(urls),
        indexation: makeIndexation(urls),
        protection: makeProtection([
          signal({ urls: [ALPHA, BETA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-11-02" }),
          signal({ urls: [GAMMA, U("/software/delta")], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-21" }),
        ]),
      },
      hist,
    );
    expect(report.nextAction.kind).toBe("WAIT_FOR_OBSERVATION");
    expect(report.nextAction.eligibleAfter).toBe("2026-10-21");
    expect(report.candidates.find((c) => c.url === ALPHA)!.protection.eligibleAfter).toBe("2026-11-02");
  });
});

describe("stale or incomplete measurements are never turned into numbers", () => {
  it("leaves a page that is absent from a partial recent table as NOT_OBSERVED, with no loss figure", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT, recentComplete: false, recentRowsReported: 40 });
    const report = run({ gsc: buildGscEvidence(capture.manifest, capture.files) });
    const alpha = report.candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.recent.state).toBe("NOT_OBSERVED");
    expect(alpha.recent.impressions).toBeNull();
    expect(alpha.dailyImpressionLoss).toBeNull();
    expect(alpha.declinePercent).toBeNull();
    expect(alpha.demandClass).toBe("UNKNOWN");
    expect(alpha.gates.find((g) => g.id === "DEMAND_MEASURED")!.status).toBe("UNKNOWN");
    expect(alpha.gates.find((g) => g.id === "POSITIVE_LOSS")!.status).toBe("UNKNOWN");
    expect(alpha.blockers.map((b) => b.code)).toContain("RECENT_DEMAND_NOT_VERIFIED");
    expect(alpha.eligible).toBe(false);
  });

  it("leaves a page absent from a complete table as NOT_OBSERVED when the manifest gives no justification", () => {
    const report = run({ gsc: makeEvidence({ hist: HIST, recent: RECENT, zeroJustification: false }) });
    expect(report.candidates.every((c) => c.recent.state === "NOT_OBSERVED" || c.recent.state === "MEASURED")).toBe(true);
    expect(report.candidates.find((c) => c.url === ALPHA)!.recent.impressions).toBeNull();
  });

  it("reads a justified absence as a labelled zero, not as a plain measurement", () => {
    const alpha = run().candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.recent.state).toBe("ZERO_BY_COMPLETE_TABLE");
    expect(alpha.recent.impressions).toBe(0);
    expect(alpha.recent.note).toMatch(/Table read in full/);
  });

  it("does not report property impressions when the daily series has gaps", () => {
    const gappy = spread(100, 0, "2026-09-08", 28).filter((_, i) => i !== 5);
    const gsc = makeEvidence({ hist: HIST, recent: RECENT, recentDaily: gappy });
    const report = run({ gsc });
    expect(report.windows.recent!.impressions).toBeNull();
    expect(report.windows.recent!.impressionsBasis).toBe("NOT_MEASURED");
    expect(report.barriers.map((b) => b.id)).not.toContain("CURRENT_DEMAND");
  });

  it("counts only finalised days: a window whose last days are not final has no property total", () => {
    const capture = makeCapture({ hist: HIST, recent: RECENT, dataThrough: "2026-10-02" });
    const gsc = buildGscEvidence(capture.manifest, capture.files);
    const report = run({ gsc });
    expect(report.windows.recent!.finalized).toBe(false);
    expect(report.windows.recent!.impressions).toBeNull();
    expect(report.warnings.join("\n")).toMatch(/not final/);
    expect(report.daily!.peak!.date <= "2026-10-02").toBe(true);
  });

  it("divides the historical window by the days that actually had data (13), not by the 28-day window", () => {
    const report = run();
    expect(report.windows.historical!.windowDays).toBe(28);
    expect(report.windows.historical!.observedDays).toBe(13);
    const alpha = report.candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.historical.impressionsPerDay).toBeCloseTo(240 / 13, 2);
    // The skill-calculator convention (whole-window denominator) is reported alongside, never instead.
    expect(alpha.dailyImpressionLossWindowBasis).toBeCloseTo(240 / 28, 2);
  });

  it("marks a coverage report that predates the release, and says so in the barrier", () => {
    const indexation = buildIndexationEvidence(
      (file) =>
        file === "page-indexing.json"
          ? { schemaVersion: 1, kind: "page-indexing", property: "sc-domain:miloosh.com", capturedAt: "2026-10-08T22:00:00Z", reportLastUpdated: "2026-10-05", source: "fixture", indexedPages: 10, notIndexedPages: 90, reasons: [], notes: [] }
          : null,
      "fixture",
    );
    const report = run({ indexation, releaseDate: "2026-10-08" });
    expect(report.indexation.coverageReportOlderThanRelease).toBe(true);
    expect(report.barriers.find((b) => b.id === "INDEXATION_BACKLOG")!.statement).toMatch(/last updated on 2026-10-05/);
  });

  it("does not claim a post-release crawl without a sampled crawl date", () => {
    const report = run({ indexation: makeIndexation([ALPHA], { lastCrawl: null }), releaseDate: "2026-10-08" });
    expect(report.indexation.postReleaseCrawl).toMatchObject({ sampled: 0, crawledAfterRelease: 0 });
    expect(report.barriers.find((b) => b.id === "NO_POST_RELEASE_CRAWL_OBSERVED")!.statement).toMatch(/not known/);
  });
});

describe("how much of what Google showed is locked", () => {
  it("counts the protection verdict of every page the historical table lists, home and unpublished pages included", () => {
    const report = run({
      protection: makeProtection([
        signal({ urls: [ALPHA] }),
        signal({ urls: [BETA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-11-01" }),
        signal({ urls: [GAMMA], kind: "IN_FLIGHT", source: "in-flight-work" }),
      ]),
    });
    expect(report.protectionSummary).toEqual({ pagesChecked: 7, verdicts: { EDITABLE: 4, PROTECTED: 1, OBSERVATION_WINDOW: 1, IN_FLIGHT: 1, UNKNOWN: 0 } });
  });

  it("counts unread protection sources as UNKNOWN, never as editable", () => {
    expect(run({ protection: makeProtection([], ["legacy-cohort"]) }).protectionSummary!.verdicts).toMatchObject({ EDITABLE: 0, UNKNOWN: 7 });
  });

  it("is absent when there is no capture", () => {
    expect(run({ gsc: null }).protectionSummary).toBeNull();
  });
});

describe("candidate selection", () => {
  it("applies the impression floor, and lets a page that ranked qualify at a lower floor", () => {
    const hist: PageRow[] = [
      [ALPHA, 0, 19, 70], // below the floor, not ranked
      [BETA, 0, 6, 8], // ranked: position <= 20 with >= 5 impressions
      [GAMMA, 0, 6, 40], // same impressions, not ranked
      [U("/software/delta"), 0, 20, 70], // exactly at the floor
    ];
    const urls = run({}, hist).candidates.map((c) => c.url);
    expect(urls).toContain(BETA);
    expect(urls).toContain(U("/software/delta"));
    expect(urls).not.toContain(ALPHA);
    expect(urls).not.toContain(GAMMA);
  });

  it("never treats the home page, legal pages or unknown routes as recovery candidates", () => {
    const hist: PageRow[] = [[U("/"), 5, 500, 3], [U("/privacy"), 0, 300, 4], [U("/mystery"), 0, 300, 4], [ALPHA, 0, 40, 50]];
    const report = run({}, hist);
    expect(report.candidates.map((c) => c.url)).toEqual([ALPHA]);
    expect(report.families.map((f) => f.family)).toEqual(expect.arrayContaining(["home", "other", "software"]));
  });

  it("lists a page Google once showed that the code no longer publishes as a technical triage item", () => {
    const hist: PageRow[] = [...HIST, [U("/software/retired-tool"), 0, 90, 20]];
    const report = run({}, hist);
    const retired = report.candidates.find((c) => c.url === U("/software/retired-tool"))!;
    expect(retired.inventory.published).toBe(false);
    expect(retired.gates.find((g) => g.id === "PUBLISHED")!.status).toBe("FAIL");
    expect(retired.blockers.map((b) => b.code)).toContain("NOT_PUBLISHED_BY_CODE");
    expect(report.technicalTriage.map((t) => t.url)).toContain(U("/software/retired-tool"));
    // Below the candidate floor, an unpublished URL is still a technical fact worth listing.
    const small = run({}, [...HIST, [U("/software/tiny-retired"), 0, 3, 50]]);
    expect(small.technicalTriage.map((t) => t.url)).toContain(U("/software/tiny-retired"));
    expect(small.candidates.map((c) => c.url)).not.toContain(U("/software/tiny-retired"));
  });

  it("lists an unpublished page once, even when it qualifies as a candidate through the ranked-page rule", () => {
    // 6 impressions at position 8: below the floor but ranked, so it is evaluated as a candidate and is also below the floor.
    const hist: PageRow[] = [...HIST, [U("/software/retired-ranked"), 0, 6, 8]];
    const triage = run({}, hist).technicalTriage.filter((t) => t.url === U("/software/retired-ranked"));
    expect(triage).toHaveLength(1);
    const urls = run({}, hist).technicalTriage.map((t) => t.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("requires a positive measured loss", () => {
    const hist: PageRow[] = [[ALPHA, 0, 60, 70]];
    const recent: PageRow[] = [[ALPHA, 0, 3000, 70]];
    const alpha = run({}, hist, recent).candidates[0]!;
    expect(alpha.dailyImpressionLoss).toBeLessThan(0);
    expect(alpha.gates.find((g) => g.id === "POSITIVE_LOSS")!.status).toBe("FAIL");
    expect(alpha.blockers.map((b) => b.code)).toContain("NO_POSITIVE_DEMAND_LOSS");
    expect(alpha.eligible).toBe(false);
  });
});

describe("eligibility and the single next action", () => {
  it("hands a fully evidenced, editable page with a verified partner to the page upgrader", () => {
    const report = run({ extras: allExtras(ALL_URLS), indexation: makeIndexation(ALL_URLS) });
    const top = report.candidates[0]!;
    expect(top.url).toBe(BETA);
    expect(top.eligible).toBe(true);
    expect(top.gates.every((g) => g.status === "PASS")).toBe(true);
    expect(report.nextAction).toMatchObject({ kind: "HANDOFF_TO_PAGE_UPGRADER", url: BETA });
  });

  it("separates visibility-only work (no partner) from revenue work and asks the owner to choose", () => {
    const report = run({ monetization: noPartner, extras: allExtras(ALL_URLS), indexation: makeIndexation(ALL_URLS) });
    const top = report.candidates[0]!;
    expect(top.eligible).toBe(false);
    expect(top.eligibleEditorial).toBe(true);
    expect(top.blockers.map((b) => b.code)).toContain("NO_ACTIVE_PARTNER");
    expect(report.nextAction.kind).toBe("OWNER_DECISION");
    expect(report.nextAction.summary).toMatch(/visibility-only/);
  });

  it("asks for read-only evidence, naming the exact inputs, when only facts are missing", () => {
    const report = run();
    expect(report.nextAction.kind).toBe("COLLECT_EVIDENCE");
    expect(report.nextAction.steps.join(" ")).toMatch(/URL Inspection/);
    expect(report.nextAction.steps.join(" ")).toMatch(/Fetch the live URL/);
  });

  it("does not hand off a page whose live response is broken, or whose queries are not commercial", () => {
    const extras = new Map(allExtras(ALL_URLS));
    const broken = fullExtras(BETA);
    extras.set(BETA, { ...broken, live: { state: "MEASURED", provenance: { source: "t", locator: "l", capturedAt: "2026-10-08T00:00:00Z" }, value: { status: 200, canonical: U("/software/other"), robotsMeta: "noindex", xRobotsTag: null, indexable: false } } });
    extras.set(ALPHA, { ...fullExtras(ALPHA), intent: { state: "MEASURED", provenance: { source: "t", locator: "l", capturedAt: "2026-10-08T00:00:00Z" }, value: { queries: [{ query: "alpha login", impressions: 9 }], commercial: false } } });
    const report = run({ extras, indexation: makeIndexation(ALL_URLS) });
    const beta = report.candidates.find((c) => c.url === BETA)!;
    const alpha = report.candidates.find((c) => c.url === ALPHA)!;
    expect(beta.eligible).toBe(false);
    expect(beta.blockers.map((b) => b.code)).toContain("LIVE_TECHNICAL_DEFECT");
    expect(alpha.eligible).toBe(false);
    expect(alpha.blockers.map((b) => b.code)).toContain("BUYER_INTENT_NOT_CONFIRMED");
  });

  it("does not claim a content gap that was not checked against the vendor", () => {
    const extras = new Map(allExtras(ALL_URLS));
    extras.set(BETA, { ...fullExtras(BETA), contentGapConfirmedAgainstVendor: false });
    const beta = run({ extras, indexation: makeIndexation(ALL_URLS) }).candidates.find((c) => c.url === BETA)!;
    expect(beta.gates.find((g) => g.id === "CONTENT_GAP")!.status).toBe("UNKNOWN");
    expect(beta.eligible).toBe(false);
  });

  it("keeps a sampled last-crawl date separate from a coverage reading", () => {
    const indexation = buildIndexationEvidence(
      (file) =>
        file === "page-indexing.json"
          ? { schemaVersion: 1, kind: "page-indexing", property: "sc-domain:miloosh.com", capturedAt: "2026-10-08T22:00:00Z", reportLastUpdated: "2026-10-05", source: "fixture", indexedPages: 1, notIndexedPages: 1, reasons: [{ label: "Crawled - currently not indexed", source: "Google systems", pages: 1, validation: { state: "NOT_STARTED" }, sampleLastCrawled: [{ url: ALPHA, lastCrawled: "2026-09-01" }] }], notes: [] }
          : null,
      "fixture",
    );
    const alpha = run({ indexation }).candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.gates.find((g) => g.id === "GOOGLE_COVERAGE")!.status).toBe("UNKNOWN");
    expect(alpha.coverage).toMatchObject({ state: "NOT_VERIFIED", lastCrawl: "2026-09-01" });
  });
});

describe("buyer intent comes from the searches the page itself earned", () => {
  const withQueries = (rows: ReadonlyArray<readonly [string, number]>, spec: Partial<Parameters<typeof addPageQueryTable>[1]> = {}, extras?: ReadonlyMap<string, PageExtras>) => {
    const capture = makeCapture({ hist: HIST, recent: RECENT });
    addPageQueryTable(capture, { path: "/software/alpha", rows, declaredImpressions: 240, ...spec });
    return run({ gsc: buildGscEvidence(capture.manifest, capture.files), ...(extras ? { extras } : {}) }).candidates.find((c) => c.url === ALPHA)!;
  };
  const gate = (e: ReturnType<typeof withQueries>) => e.gates.find((g) => g.id === "BUYER_INTENT")!;

  it("passes, and states the facts, when most listed impressions are decision-stage searches", () => {
    const alpha = withQueries([["alpha alternatives", 150], ["alpha vs beta", 60], ["alpha login", 30]]);
    expect(gate(alpha).status).toBe("PASS");
    expect(gate(alpha).detail).toMatch(/2 of 3 listed queries \(210 of 240 listed impressions, 88%\) ask to compare, replace or price a product/);
    expect(alpha.intent).toMatchObject({ source: "GSC_QUERY_TABLE", commercial: true, listedQueries: 3, listedImpressions: 240, decisionQueries: 2, decisionShare: 0.875 });
  });

  it("fails, as not resolvable, when most listed searches are not purchase decisions", () => {
    const alpha = withQueries([["alpha login", 150], ["alpha api docs", 60], ["alpha alternatives", 30]]);
    expect(gate(alpha).status).toBe("FAIL");
    expect(alpha.blockers).toContainEqual(expect.objectContaining({ code: "BUYER_INTENT_NOT_CONFIRMED", resolvableBy: "NOT_RESOLVABLE" }));
    expect(alpha.eligible).toBe(false);
  });

  it("stays UNKNOWN when too few impressions are listed to classify", () => {
    const alpha = withQueries([["alpha alternatives", 4]], { declaredImpressions: 240 });
    expect(gate(alpha).status).toBe("UNKNOWN");
    expect(gate(alpha).detail).toMatch(/Too few impressions are listed/);
  });

  it("is UNKNOWN, with the reason, when the filtered table cannot be attributed to the page", () => {
    const alpha = withQueries([["alpha alternatives", 150], ["alpha vs beta", 60]], { declaredImpressions: 999 });
    expect(gate(alpha).status).toBe("UNKNOWN");
    expect(gate(alpha).detail).toMatch(/reports 999 impressions but the pages table lists 240/);
    expect(alpha.intent).toBeNull();
  });

  it("is UNKNOWN when no queries table was captured for the page", () => {
    const alpha = run().candidates.find((c) => c.url === ALPHA)!;
    expect(gate(alpha).status).toBe("UNKNOWN");
    expect(gate(alpha).detail).toMatch(/no historical queries table filtered to \/software\/alpha was captured/);
  });

  it("lets explicit per-page evidence override the table", () => {
    const explicit = new Map<string, PageExtras>([[ALPHA, { intent: measured({ queries: [{ query: "alpha login", impressions: 5 }], commercial: false }, PROV) }]]);
    const alpha = withQueries([["alpha alternatives", 150], ["alpha vs beta", 60]], {}, explicit);
    expect(alpha.intent?.source).toBe("EXPLICIT");
    expect(gate(alpha).status).toBe("FAIL");
  });
});

describe("the rendered page is the ground truth for the monetisation path", () => {
  const rendered = (partnerSlugs: string[], count = partnerSlugs.length) => measured({ sponsoredLinkCount: count, partnerSlugs, unmatchedAnchorTexts: [] }, PROV);
  const expecting = (...slugs: string[]) => () => ({ verified: true as const, detail: "registry: partner call to action with a resolved link", expectedPartnerSlugs: slugs });
  const gateOf = (extras: PageExtras, lookup: ReturnType<typeof expecting>) =>
    run({ extras: new Map([[ALPHA, extras]]), monetization: lookup }).candidates.find((c) => c.url === ALPHA)!;

  it("passes, and says what the page shows, when an expected partner is on the rendered page", () => {
    const alpha = gateOf({ rendered: rendered(["alpha", "gamma"]) }, expecting("alpha"));
    const gate = alpha.gates.find((g) => g.id === "MONETIZATION_PATH")!;
    expect(gate.status).toBe("PASS");
    expect(gate.detail).toMatch(/rendered page shows sponsored links for: alpha, gamma/);
    expect(alpha.renderedCtas).toEqual({ sponsoredLinkCount: 2, partnerSlugs: ["alpha", "gamma"] });
  });

  it("stays UNKNOWN, and asks for a code change, when the registry expects a partner the rendered page does not show", () => {
    const alpha = gateOf({ rendered: rendered(["gamma"], 1) }, expecting("alpha"));
    const gate = alpha.gates.find((g) => g.id === "MONETIZATION_PATH")!;
    expect(gate.status).toBe("UNKNOWN");
    expect(gate.detail).toMatch(/shows no sponsored link for alpha \(it shows gamma\)/);
    expect(alpha.blockers).toContainEqual(expect.objectContaining({ code: "MONETIZATION_NOT_VERIFIED", resolvableBy: "CODE_CHANGE" }));
    expect(alpha.eligible).toBe(false);
  });

  it("treats a page that shows no sponsored link at all as a mismatch, not a pass", () => {
    const gate = gateOf({ rendered: rendered([], 0) }, expecting("alpha")).gates.find((g) => g.id === "MONETIZATION_PATH")!;
    expect(gate.status).toBe("UNKNOWN");
    expect(gate.detail).toMatch(/it shows none/);
  });

  it("is satisfied when at least one of several expected partners is shown", () => {
    expect(gateOf({ rendered: rendered(["gamma"]) }, expecting("alpha", "gamma")).gates.find((g) => g.id === "MONETIZATION_PATH")!.status).toBe("PASS");
  });

  it("changes nothing when the page was not read: the registry alone decides, as before", () => {
    const alpha = gateOf({}, expecting("alpha"));
    expect(alpha.gates.find((g) => g.id === "MONETIZATION_PATH")!.status).toBe("PASS");
    expect(alpha.renderedCtas).toBeNull();
  });

  it("does not let a rendered link turn a missing registry partner into a pass", () => {
    const alpha = run({ extras: new Map([[ALPHA, { rendered: rendered(["alpha"]) }]]), monetization: noPartner }).candidates.find((c) => c.url === ALPHA)!;
    expect(alpha.gates.find((g) => g.id === "MONETIZATION_PATH")!.status).toBe("FAIL");
  });
});

describe("deterministic prioritisation", () => {
  it("returns the same candidates in the same order whatever order the table rows arrive in", () => {
    const forward = run({}, HIST);
    const reversed = run({}, [...HIST].reverse());
    const shuffled = run({}, [HIST[3]!, HIST[0]!, HIST[6]!, HIST[5]!, HIST[1]!, HIST[4]!, HIST[2]!]);
    const order = (r: typeof forward) => r.candidates.map((c) => c.url);
    expect(order(reversed)).toEqual(order(forward));
    expect(order(shuffled)).toEqual(order(forward));
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
    expect(JSON.stringify(shuffled)).toBe(JSON.stringify(forward));
  });

  it("is a pure function of its inputs: two runs give identical reports", () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it("breaks exact ties by URL, never by input order", () => {
    const hist: PageRow[] = [[GAMMA, 0, 130, 70], [ALPHA, 0, 130, 70]];
    const urls = run({}, hist).candidates.map((c) => c.url);
    expect(urls).toEqual([ALPHA, GAMMA]);
  });

  it("orders by eligibility first, then current demand, then daily loss", () => {
    const base = run().candidates;
    const a = { ...base[0]! };
    const b = { ...base[1]! };
    expect(compareEvaluations({ ...a, eligible: true }, { ...b, eligible: false })).toBeLessThan(0);
    expect(compareEvaluations({ ...a, demandClass: "CURRENT_VERIFIED" }, { ...b, demandClass: "HISTORICAL_ONLY" })).toBeLessThan(0);
    expect(compareEvaluations({ ...a, dailyImpressionLoss: 5 }, { ...b, dailyImpressionLoss: 9 })).toBeGreaterThan(0);
    expect(compareEvaluations({ ...a, dailyImpressionLoss: null }, { ...b, dailyImpressionLoss: -3 })).toBeGreaterThan(0);
  });

  it("compares two evaluations that tie on every measured field by URL alone", () => {
    const [first] = run().candidates;
    const tieA = { ...first!, url: U("/software/aaa") };
    const tieB = { ...first!, url: U("/software/bbb") };
    expect(compareEvaluations(tieA, tieB)).toBeLessThan(0);
    expect(compareEvaluations(tieB, tieA)).toBeGreaterThan(0);
    expect(compareEvaluations(tieA, tieA)).toBe(0);
  });

  it("limits the shortlist to the configured size without changing the ranking", () => {
    const report = run({ config: { shortlistSize: 2 } });
    expect(report.shortlist).toHaveLength(2);
    expect(report.shortlist.map((c) => c.url)).toEqual(report.candidates.slice(0, 2).map((c) => c.url));
    expect(DEFAULT_RECOVERY_CONFIG.shortlistSize).toBe(5);
  });
});

describe("what the agent refuses to claim", () => {
  it("marks cannibalization NOT_MEASURED and keyword difficulty NOT_VERIFIED on every run", () => {
    for (const report of [run(), run({ gsc: null })]) {
      expect(report.cannibalization.status).toBe("NOT_MEASURED");
      expect(report.keywordDifficulty.status).toBe("NOT_VERIFIED");
    }
  });

  it("reports the daily peak and largest one-day fall only from finalised days", () => {
    const daily: Array<readonly [string, number, number]> = [["2026-08-07", 0, 400], ["2026-08-08", 0, 380], ["2026-08-09", 0, 60], ["2026-08-10", 0, 50]];
    const hist: PageRow[] = [[ALPHA, 0, 890, 70]];
    const gsc = makeEvidence({ hist, recent: RECENT, histDaily: daily });
    const observed = run({ gsc }, hist).daily!;
    expect(observed.peak).toEqual({ date: "2026-08-07", impressions: 400 });
    expect(observed.largestDrop).toMatchObject({ from: "2026-08-08", to: "2026-08-09", fromImpressions: 380, toImpressions: 60 });
    expect(observed.note).toMatch(/no cause is asserted/);
  });

  it("ignores a huge day that Google has not finalised when it reports the peak and the largest fall", () => {
    const hist: PageRow[] = [[ALPHA, 0, 440, 70]];
    const capture = makeCapture({ hist, recent: RECENT, dataThrough: "2026-10-02", recentDaily: spread(28, 0, "2026-09-08", 28).map(([d, c, n]) => (d === "2026-10-04" ? ([d, c, 5000] as const) : ([d, c, n] as const))) });
    const observed = run({ gsc: buildGscEvidence(capture.manifest, capture.files) }, hist).daily!;
    expect(observed.peak!.impressions).toBeLessThan(5000);
    expect(observed.peak!.date <= "2026-10-02").toBe(true);
    expect(observed.largestDrop === null || observed.largestDrop.to <= "2026-10-02").toBe(true);
  });

  it("states the drop without naming a cause", () => {
    const daily: Array<readonly [string, number, number]> = [["2026-08-07", 0, 400], ["2026-08-08", 0, 40]];
    const hist: PageRow[] = [[ALPHA, 0, 440, 70]];
    const report = run({ gsc: makeEvidence({ hist, recent: RECENT, histDaily: daily }) }, hist);
    const drop = report.barriers.find((b) => b.id === "DAILY_DROP")!;
    expect(drop.label).toBe("OBSERVED");
    expect(drop.statement).toMatch(/without asserting a cause/);
    expect(JSON.stringify(report.barriers)).not.toMatch(/penalty|spam update|core update/i);
  });

  it("keeps the content-quality explanation as NOT_VERIFIED and counts the observation windows it sees", () => {
    const report = run({ protection: makeProtection([signal({ urls: [ALPHA, BETA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-11-01" })]) });
    const barrier = report.barriers.find((b) => b.id === "CONTENT_QUALITY")!;
    expect(barrier.label).toBe("NOT_VERIFIED");
    expect(barrier.statement).toMatch(/2 page\(s\) are inside a recent-change observation window/);
  });

  it("compares the two property windows with the figures it measured", () => {
    const barrier = run().barriers.find((b) => b.id === "CURRENT_DEMAND")!;
    expect(barrier.statement).toMatch(/716 impression\(s\) over 13 observed day\(s\)/);
    expect(barrier.statement).toMatch(/4 impression\(s\)/);
  });
});

describe("read-only mode", () => {
  it("does not mutate any input", () => {
    const gsc = makeEvidence({ hist: HIST, recent: RECENT });
    const protection = makeProtection([signal({ urls: [ALPHA] })]);
    const inventory = makeInventory({ software: [makeSoftware("alpha"), makeSoftware("beta"), makeSoftware("gamma"), makeSoftware("delta")] });
    const extras = allExtras(ALL_URLS);
    const indexation = makeIndexation(ALL_URLS);
    const serialize = () =>
      JSON.stringify({
        gsc,
        protection: [...protection.byUrl.entries()],
        inventory: [...inventory.pages.entries()],
        extras: [...extras.entries()],
        indexation: [...indexation.inspections.entries()],
      });
    const before = serialize();
    runGoogleRecoveryAgent({ now: NOW, gsc, protection, inventory, indexation, extras, monetization: verified });
    expect(serialize()).toBe(before);
  });

  it("builds the full world used by the other agents without touching a clock or the environment", () => {
    const first = makeWorld();
    const second = makeWorld();
    expect(JSON.stringify(first.google)).toBe(JSON.stringify(second.google));
    expect(first.google.generatedAt).toBe(NOW.toISOString());
  });
});
