import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendObservations,
  canonicalPath,
  importPageTable,
  importInspectionUi,
  indexState,
  inspectionDeltas,
  searchSnapshotSchema,
  type Inspection,
} from "@/lib/google-war/evidence";
import {
  hasProductionProof,
  improvementSchema,
} from "@/lib/google-war/deployment-proof";
import { buildAuthorityGraph, type Node } from "@/lib/google-war/graph";
import {
  assertSafeLinkChange,
  experimentProtection,
  loadProtection,
  protectionFor,
} from "@/lib/google-war/protection";
import {
  commercialQualityRegressions,
  intentConflicts,
  repeatedBuyerText,
} from "@/lib/google-war/quality";
import {
  indexingEligibility,
  prioritize,
  type Signals,
} from "@/lib/google-war/priority";

const time = "2026-09-26T10:00:00Z";
const observation = (overrides: Partial<Inspection> = {}): Inspection => ({
  url: "https://miloosh.com/software/example",
  checkedAt: time,
  source: "Authenticated fixture",
  verdict: null,
  coverageState: null,
  lastCrawlTime: null,
  googleCanonical: null,
  userCanonical: null,
  pageFetchState: null,
  robotsTxtState: null,
  indexingState: null,
  ...overrides,
});
const node = (
  url: string,
  links = "",
  overrides: Partial<Node> = {},
): Node => ({
  path: url,
  kind: "software",
  products: [url.slice(10)],
  categories: ["marketing"],
  html: `<title>Best tool alternatives</title><link rel="canonical" href="https://miloosh.com${url}"><main><h1>Tool</h1>${links}</main>`,
  ...overrides,
});
const signals: Signals = {
  impressions: null,
  clicks: null,
  position: null,
  ctr: null,
  index: "UNKNOWN",
  bucket: "A",
  inbound: 10,
  depth: 2,
  protected: false,
  intentConflict: false,
  activeAffiliate: false,
};

describe("Google evidence, not synthetic search metrics", () => {
  it("ignores stale panels and preserves displayed crawl time without inventing a timezone", () => {
    const url = "https://miloosh.com/software/close";
    const result = importInspectionUi(
      {
        url,
        capturedAt: time,
        text: `https://miloosh.com/software/todoist\nבדיקת כתובת אתר\nסריקה אחרונה\nstale\n${url}\nבדיקת כתובת אתר\nנסרק - לא נכלל באינדקס כרגע\nסריקה אחרונה\n10 באוג׳ 2026, 10:48:14\nקנונית על פי הצהרת המשתמש\n${url}\nקנונית לפי בחירת Google\n\nכתובת האתר שנמצאת בבדיקה`,
      },
      "UI fixture",
    );
    expect(result).toMatchObject({
      lastCrawlTime: "10 באוג׳ 2026, 10:48:14",
      googleCanonical: url,
      userCanonical: url,
    });
    expect(() =>
      importInspectionUi(
        { url, capturedAt: time, text: "other panel" },
        "fixture",
      ),
    ).toThrow();
  });
  it("keeps explicit zero separate from unavailable metrics", () => {
    const result = importPageTable(
      {
        capturedAt: time,
        rows: [
          ["https://miloosh.com/software/a", "0", "1,220", "0%", "69.98"],
          ["https://miloosh.com/software/b", "—", "—", "—", "—"],
        ],
      },
      { start: "2026-07-14", end: "2026-08-10" },
      "authenticated fixture",
    );
    expect(result.rows[0]).toMatchObject({
      clicks: 0,
      impressions: 1220,
      ctr: 0,
      position: 69.98,
    });
    expect(result.rows[1]).toMatchObject({
      clicks: null,
      impressions: null,
      ctr: null,
      position: null,
    });
  });
  it("rejects duplicate rows, invalid dates and reversed windows", () => {
    const raw = {
      capturedAt: time,
      rows: [["https://miloosh.com/software/a", "0", "1", "0%", "10"]],
    };
    expect(() =>
      importPageTable(
        { ...raw, rows: [...raw.rows, ...raw.rows] },
        { start: "2026-01-01", end: "2026-02-01" },
        "source",
      ),
    ).toThrow(/Duplicate/);
    expect(() =>
      importPageTable(
        raw,
        { start: "2026-02-30", end: "2026-02-01" },
        "source",
      ),
    ).toThrow();
    const valid = importPageTable(
      raw,
      { start: "2026-01-01", end: "2026-02-01" },
      "source",
    );
    expect(() =>
      searchSnapshotSchema.parse({
        ...valid,
        rows: [...valid.rows, ...valid.rows],
      }),
    ).toThrow();
  });
  it.each([
    "https://www.miloosh.com/software/a",
    "https://miloosh.com/software/a/",
    "https://miloosh.com/software/a?x=1",
    "https://miloosh.com/software/a#plans",
    "https://other.com/software/a",
  ])("does not silently combine variant %s", (url) =>
    expect(canonicalPath(url)).toBeNull(),
  );
  it("accepts only the exact canonical path", () =>
    expect(canonicalPath("https://miloosh.com/software/a")).toBe(
      "/software/a",
    ));
  it("HTTP data alone never implies indexed, while crawled-not-indexed is distinct", () => {
    expect(indexState(null)).toBe("UNKNOWN");
    expect(indexState(observation({ pageFetchState: "SUCCESSFUL" }))).toBe(
      "UNKNOWN",
    );
    expect(
      indexState(
        observation({ coverageState: "Crawled - currently not indexed" }),
      ),
    ).toBe("CRAWLED_NOT_INDEXED");
    expect(indexState(observation({ verdict: "PASS" }))).toBe("INDEXED");
    expect(
      indexState(
        observation({ coverageState: "Discovered - currently not indexed" }),
      ),
    ).toBe("DISCOVERED_NOT_INDEXED");
  });
  it("appends idempotently and refuses modified historical evidence", () => {
    const first = observation();
    expect(appendObservations([first], [first])).toEqual([first]);
    expect(() =>
      appendObservations([first], [{ ...first, verdict: "PASS" }]),
    ).toThrow(/Conflicting/);
  });
  it("orders timezones chronologically and records transitions without causation", () => {
    const first = observation({
      checkedAt: "2026-09-26T11:00:00+03:00",
      coverageState: "Crawled - currently not indexed",
    });
    const second = observation({
      checkedAt: "2026-09-26T09:00:00Z",
      verdict: "PASS",
    });
    const history = appendObservations([second], [first]);
    expect(history[0]).toEqual(first);
    const delta = inspectionDeltas(history)[0];
    expect(delta.transitions[0]).toMatchObject({
      from: "CRAWLED_NOT_INDEXED",
      to: "INDEXED",
      observedAt: second.checkedAt,
    });
    expect(delta.transitions[0].note).toContain("no causation");
    expect(inspectionDeltas(appendObservations(history, [second]))).toEqual([
      delta,
    ]);
  });
});

describe("Real HTML architecture", () => {
  it("counts category/hub anchors and fragments, not scripts/nofollow/query/external links", () => {
    const input = [
      node("/", '<a href="/category/marketing">Marketing</a>', { kind: "hub" }),
      node(
        "/category/marketing",
        '<a href="/software/a#pricing">Plans</a><a rel="nofollow" href="/software/b">B</a><a href="/software/b?x=1">B</a><script>"<a href="/software/b">fake</a>"</script><template><a href="/software/b">template</a></template><a href="https://other.com/software/b">external</a>',
        { kind: "category" },
      ),
      node("/software/a"),
      node("/software/b"),
    ];
    const graph = buildAuthorityGraph(input);
    expect(graph.rows.find((r) => r.path === "/software/a")).toMatchObject({
      orphan: false,
      homeDepth: 2,
      bySourceType: { category: 1 },
      anchorDiversity: 1,
    });
    expect(graph.rows.find((r) => r.path === "/software/b")).toMatchObject({
      orphan: true,
      homeDepth: null,
    });
    expect(graph.edges).toHaveLength(2);
  });
  it("distinguishes sitewide navigation from relevant main-content sources", () => {
    const a = node("/software/a");
    a.html += '<footer><a href="/software/b">B</a></footer>';
    const graph = buildAuthorityGraph([a, node("/software/b")]);
    expect(graph.rows[1]).toMatchObject({
      inboundSourcePages: 1,
      contentSources: 0,
      relevantSources: 0,
    });
  });
  it("does not count a noindex target as an indexable discovery path", () => {
    const b = node("/software/b");
    b.html += '<meta name="robots" content="noindex, follow">';
    expect(
      buildAuthorityGraph([node("/", '<a href="/software/b">B</a>'), b]).edges,
    ).toHaveLength(0);
  });
  it("detects duplicate pair owners, incorrect canonical and generic comparison titles", () => {
    const a = node("/compare/a-vs-b", "", {
      kind: "comparison",
      products: ["a", "b"],
    });
    const b = node("/compare/b-vs-a", "", {
      kind: "comparison",
      products: ["b", "a"],
    });
    b.html += '<link rel="canonical" href="https://miloosh.com/software/a">';
    const reasons = intentConflicts([a, b]).map((r) => r.reason);
    expect(reasons).toEqual(
      expect.arrayContaining([
        "DUPLICATE_PRIMARY_OWNER",
        "CANONICAL_OWNERSHIP",
        "COMPARISON_INTENT_TITLE",
        "GENERIC_ALTERNATIVES_ON_NON_OWNER",
      ]),
    );
  });
  it("preserves legitimate software vs head-to-head ownership", () => {
    const pair = node("/compare/a-vs-b", "", {
      kind: "comparison",
      products: ["a", "b"],
    });
    pair.html = pair.html.replace("Best tool alternatives", "A vs B");
    expect(intentConflicts([node("/software/a"), pair])).toEqual([]);
  });
  it("warns on repeated decision prose, not repeated lists or disclosures", () => {
    const text =
      "Choose this workflow only after checking your actual requirements, the total cost for the whole team, the required integrations and the migration effort.";
    expect(
      repeatedBuyerText(
        Array.from({ length: 5 }, (_, i) =>
          node(`/software/${i}`, `<p>${text}</p>`),
        ),
      ),
    ).toHaveLength(1);
    expect(
      repeatedBuyerText(
        Array.from({ length: 5 }, (_, i) =>
          node(
            `/software/${i}`,
            `<li>${text}</li><p>Affiliate commission: ${text}</p>`,
          ),
        ),
      ),
    ).toEqual([]);
    expect(
      repeatedBuyerText(
        Array.from({ length: 5 }, (_, i) =>
          node(`/software/${i}`, `<p>Choose Example if this fits: ${text}</p>`),
        ),
        [text],
      ),
    ).toEqual([]);
  });
  it("fails only prioritized A/B regressions, including missing prioritized pages", () => {
    const baseline = { "/software/a": "A", "/software/b": "B" };
    expect(
      commercialQualityRegressions(
        [
          { path: "/software/a", bucket: "C" },
          { path: "/software/unprioritized", bucket: "D" },
        ],
        baseline,
      ),
    ).toEqual([
      { path: "/software/a", bucket: "C" },
      { path: "/software/b", bucket: null },
    ]);
    expect(
      commercialQualityRegressions([{ path: "/software/a", bucket: "B" }], {
        "/software/a": "A",
      }),
    ).toEqual([]);
  });
});

describe("Experiment and request gates", () => {
  it("does not accept a local build, preview URL or stale verification as production proof", () => {
    const raw = {
      url: "/software/a",
      source: "receipt",
      deployedAt: "2026-09-25T00:00:00Z",
    };
    expect(hasProductionProof(improvementSchema.parse(raw), time)).toBe(false);
    const change = improvementSchema.parse({
      ...raw,
      verification: {
        checkedAt: time,
        deploymentId: "dpl_fixture",
        finalUrl: "https://miloosh.com/software/a",
        canonical: "https://miloosh.com/software/a",
        httpStatus: 200,
        indexable: true,
        sitemapIncluded: true,
      },
    });
    expect(hasProductionProof(change, time)).toBe(true);
    expect(
      hasProductionProof(
        {
          ...change,
          verification: {
            ...change.verification!,
            finalUrl: "https://preview.vercel.app/software/a",
          },
        },
        time,
      ),
    ).toBe(false);
    expect(hasProductionProof(change, "2026-10-10T00:00:00Z")).toBe(false);
  });
  it("does not expire a MEASURING record by date alone", () => {
    const protections = experimentProtection(
      [
        {
          page: "/software/wrike",
          decision: "MEASURING",
          recordedAt: "2026-09-10T00:00:00Z",
          measurementWindowDays: 28,
        },
      ],
      "2026-12-01T00:00:00Z",
      "fixture",
    );
    expect(protections[0]).toMatchObject({
      state: "ACTIVE_EXPERIMENT",
      until: "2026-10-08T00:00:00.000Z",
    });
    expect(() =>
      assertSafeLinkChange("/guide", "/software/wrike", protections),
    ).toThrow();
    expect(() =>
      assertSafeLinkChange("/software/wrike", "/guide", protections),
    ).toThrow();
  });
  it("preserves cooldown and allows a reviewed expired experiment", () => {
    const e = {
      page: "/software/a",
      decision: "KEEP",
      recordedAt: "2026-09-10T00:00:00Z",
      measurementWindowDays: 28,
    };
    expect(experimentProtection([e], time, "fixture")[0].state).toBe(
      "COOLDOWN",
    );
    expect(
      experimentProtection([e], "2026-12-01T00:00:00Z", "fixture"),
    ).toEqual([]);
    expect(() => experimentProtection([e], "invalid", "fixture")).toThrow();
  });
  it("fails closed on corrupt protection stores", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "google-war-test-"));
    try {
      fs.mkdirSync(path.join(dir, "docs"));
      fs.writeFileSync(
        path.join(dir, "docs/experiment.json"),
        '{"experiments":[{"page":"/software/a"}]}',
      );
      expect(() => loadProtection(dir, time)).toThrow(
        /Invalid experiment protection/,
      );
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
  it("protects Wrike, both concurrent cohorts and legacy reservations in the real repository", () => {
    const protections = loadProtection(process.cwd(), time);
    for (const slug of ["wrike", "zoho-crm", "whimsical", "adyen", "pipedrive"])
      expect(
        protectionFor(`/software/${slug}`, protections).length,
      ).toBeGreaterThan(0);
  });
  const eligible = {
    protected: false,
    lastRequestedAt: null,
    deployedImprovementAt: "2026-09-25T00:00:00Z",
    technicalPass: true,
    highValue: true,
    index: "CRAWLED_NOT_INDEXED" as const,
  };
  it("requires a deployed, technically verified, high-value change", () => {
    expect(indexingEligibility(eligible, time)).toBe("READY_TO_REQUEST");
    for (const override of [
      { deployedImprovementAt: null },
      { deployedImprovementAt: "2026-10-01T00:00:00Z" },
      { technicalPass: false },
      { highValue: false },
      { index: "UNKNOWN" as const },
      { index: "INDEXED" as const },
      { lastRequestedAt: "invalid" },
    ])
      expect(indexingEligibility({ ...eligible, ...override }, time)).toBe(
        "NOT_ELIGIBLE",
      );
  });
  it("blocks protected and recently requested URLs even after improvements", () => {
    expect(indexingEligibility({ ...eligible, protected: true }, time)).toBe(
      "PROTECTED",
    );
    expect(
      indexingEligibility(
        { ...eligible, lastRequestedAt: "2026-09-26T00:00:00Z" },
        time,
      ),
    ).toBe("RECENTLY_REQUESTED");
  });
  it("keeps UNKNOWN and deep rankings out of the CTR bucket", () => {
    expect(prioritize(signals)).toMatchObject({ groups: ["HOLD"] });
    expect(
      prioritize({
        ...signals,
        impressions: 1000,
        ctr: 0,
        position: 80,
        index: "INDEXED",
      }).groups,
    ).toEqual(["RANKING_OPPORTUNITY"]);
    expect(
      prioritize({
        ...signals,
        impressions: 1000,
        ctr: 0,
        position: 5,
        index: "INDEXED",
      }).groups,
    ).toEqual(["CTR_OPPORTUNITY"]);
    expect(
      prioritize({ ...signals, index: "CRAWLED_NOT_INDEXED" }).reasons[0],
    ).toContain("NOT evidence of a technical failure");
  });
  it("protection takes precedence over all intervention signals", () =>
    expect(
      prioritize({
        ...signals,
        protected: true,
        index: "CRAWLED_NOT_INDEXED",
        bucket: "D",
        impressions: 2000,
        inbound: 0,
      }).groups,
    ).toEqual(["EXPERIMENT_PROTECTED"]));
});
