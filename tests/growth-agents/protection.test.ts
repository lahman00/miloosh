import { describe, expect, it } from "vitest";
import { CONTROL_COHORT, TREATMENT_COHORT } from "@/data/experiments/comparison-quality-cohort";
import { DECISION_MONEY_PAGES } from "@/data/growth/decision-money-pages";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { buildProtectionSnapshot, isChangeSafe, protectionFor, summarizeVerdicts } from "@/lib/growth-agents/protection";
import { collectRegistrySignals, isSharedInputFile, parsePorcelainPaths, slugsInAddedLines } from "@/lib/growth-agents/protection-sources";
import { SHA, U, makeProtection, signal } from "./fixtures";

describe("protectionFor: a page is editable only when every source was read and none claims it", () => {
  it("is EDITABLE for an unclaimed page when all sources were read", () => {
    const result = protectionFor(U("/software/alpha"), makeProtection());
    expect(result.verdict).toBe("EDITABLE");
    expect(result.unreadSources).toEqual([]);
  });

  it("is UNKNOWN, never EDITABLE, when a protection source could not be read", () => {
    const result = protectionFor(U("/software/alpha"), makeProtection([], ["measuring-receipts"]));
    expect(result.verdict).toBe("UNKNOWN");
    expect(result.unreadSources).toEqual(["measuring-receipts"]);
    expect(isChangeSafe([result])).toBe(false);
  });

  it("still reports a known claim as that claim when another source is unreadable", () => {
    const snapshot = makeProtection([signal({ urls: [U("/software/alpha")] })], ["in-flight-work"]);
    expect(protectionFor(U("/software/alpha"), snapshot).verdict).toBe("PROTECTED");
  });

  it("orders claims PROTECTED > OBSERVATION_WINDOW > IN_FLIGHT", () => {
    const url = U("/software/alpha");
    const all = makeProtection([
      signal({ urls: [url], kind: "IN_FLIGHT", source: "in-flight-work" }),
      signal({ urls: [url], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-20" }),
      signal({ urls: [url], kind: "PROTECTED" }),
    ]);
    expect(protectionFor(url, all).verdict).toBe("PROTECTED");
    const noProtected = makeProtection([
      signal({ urls: [url], kind: "IN_FLIGHT", source: "in-flight-work" }),
      signal({ urls: [url], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-20" }),
    ]);
    expect(protectionFor(url, noProtected).verdict).toBe("OBSERVATION_WINDOW");
    const onlyInFlight = makeProtection([signal({ urls: [url], kind: "IN_FLIGHT", source: "in-flight-work" })]);
    expect(protectionFor(url, onlyInFlight).verdict).toBe("IN_FLIGHT");
  });

  it("makes an observation window eligible after its latest end date, and a protected page never", () => {
    const url = U("/software/alpha");
    const windows = makeProtection([
      signal({ urls: [url], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-20" }),
      signal({ urls: [url], kind: "OBSERVATION_WINDOW", source: "decision-money-pages", until: "2026-10-23" }),
    ]);
    expect(protectionFor(url, windows).eligibleAfter).toBe("2026-10-23");
    const both = makeProtection([signal({ urls: [url], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-20" }), signal({ urls: [url], kind: "PROTECTED" })]);
    expect(protectionFor(url, both).eligibleAfter).toBeNull();
  });

  it("keeps the needs-closure flag so the owner can see an experiment that outlived its window", () => {
    const url = U("/software/alpha");
    const snapshot = makeProtection([signal({ urls: [url], needsClosure: true, source: "measuring-receipts" })]);
    expect(protectionFor(url, snapshot).reasons.some((r) => r.needsClosure)).toBe(true);
  });

  it("matches www, query-string and trailing-slash variants of the same page", () => {
    const snapshot = makeProtection([signal({ urls: ["https://www.miloosh.com/software/alpha/?utm_source=x"] })]);
    expect(protectionFor(U("/software/alpha"), snapshot).verdict).toBe("PROTECTED");
    expect(protectionFor("https://www.miloosh.com/software/alpha#a", snapshot).verdict).toBe("PROTECTED");
  });

  it("ignores a claim on a URL that is not a Miloosh page", () => {
    const snapshot = makeProtection([signal({ urls: ["https://example.com/software/alpha"] })]);
    expect(snapshot.byUrl.size).toBe(0);
  });

  it("does not let one page's claim spill onto another page", () => {
    const snapshot = makeProtection([signal({ urls: [U("/software/alpha")] })]);
    expect(protectionFor(U("/software/alpha-two"), snapshot).verdict).toBe("EDITABLE");
    expect(protectionFor(U("/software/alph"), snapshot).verdict).toBe("EDITABLE");
  });

  it("builds the same snapshot whatever order the signals arrive in", () => {
    const signals = [
      signal({ urls: [U("/software/beta")], source: "first-revenue-cohort", evidence: "b" }),
      signal({ urls: [U("/software/beta")], source: "legacy-cohort", evidence: "a" }),
      signal({ urls: [U("/software/alpha")], source: "measuring-receipts", evidence: "c" }),
    ];
    const forward = buildProtectionSnapshot({ checkoutSha: SHA, generatedAt: "2026-10-09T00:00:00Z", sources: [], signals });
    const backward = buildProtectionSnapshot({ checkoutSha: SHA, generatedAt: "2026-10-09T00:00:00Z", sources: [], signals: [...signals].reverse() });
    expect(JSON.stringify([...forward.byUrl.entries()].sort())).toBe(JSON.stringify([...backward.byUrl.entries()].sort()));
    expect(forward.byUrl.get(U("/software/beta"))!.map((r) => r.source)).toEqual(["first-revenue-cohort", "legacy-cohort"]);
  });
});

describe("a change is safe only when the page and every page it re-renders are editable", () => {
  it("is false for an empty set and for any non-editable member", () => {
    const snapshot = makeProtection([signal({ urls: [U("/compare/alpha-vs-beta")] })]);
    const editable = protectionFor(U("/software/alpha"), snapshot);
    const blocked = protectionFor(U("/compare/alpha-vs-beta"), snapshot);
    expect(isChangeSafe([])).toBe(false);
    expect(isChangeSafe([editable])).toBe(true);
    expect(isChangeSafe([editable, blocked])).toBe(false);
    expect(summarizeVerdicts([editable, blocked])).toMatchObject({ EDITABLE: 1, PROTECTED: 1, UNKNOWN: 0 });
  });
});

describe("git helpers used by the in-flight scan", () => {
  it("keeps the two status columns when cutting out a path (a trimmed line loses its first letters)", () => {
    const porcelain = [" M data/software/salesforce.json", "?? docs/new.md", "A  lib/a.ts", "R  old/name.ts -> new/name.ts", ' M "path with space.ts"', ""].join("\n");
    expect(parsePorcelainPaths(porcelain)).toEqual(["data/software/salesforce.json", "docs/new.md", "lib/a.ts", "new/name.ts", "path with space.ts"]);
  });

  it("finds only known product slugs inside added diff lines", () => {
    const diff = [
      "--- a/data/seo/serp-overrides.ts",
      '+++ b/data/seo/serp-overrides.ts',
      '+  "docker-vs-vercel": { title: "x" },',
      '-  "removed-slug": 1,',
      '+  "not-a-product": 1,',
      '+  { a: "mkdocs", b: "read-the-docs" },',
      ' context "docker"',
    ].join("\n");
    expect(slugsInAddedLines(diff, new Set(["mkdocs", "read-the-docs", "docker", "removed-slug"]))).toEqual(["mkdocs", "read-the-docs"]);
  });

  it("recognises shared template and data inputs that fan out to many pages", () => {
    expect(isSharedInputFile("data/seo/serp-overrides.ts")).toBe(true);
    expect(isSharedInputFile("app/sitemap.ts")).toBe(true);
    expect(isSharedInputFile("components/Cta.tsx")).toBe(true);
    expect(isSharedInputFile("data/software/alpha.json")).toBe(false);
    expect(isSharedInputFile("README.md")).toBe(false);
  });
});

describe("the repository's own registries are honoured (real files)", () => {
  const registry = collectRegistrySignals(process.cwd(), "2026-10-09");
  const snapshot = buildProtectionSnapshot({ checkoutSha: SHA, generatedAt: "2026-10-09T00:00:00Z", sources: registry.sources, signals: registry.signals });

  it("reads every registry source", () => {
    expect(registry.sources.filter((s) => !s.ok)).toEqual([]);
    expect(registry.sources.map((s) => s.id).sort()).toEqual(["comparison-quality-cohort", "decision-money-pages", "first-revenue-cohort", "legacy-cohort", "measuring-receipts"]);
  });

  it("protects every first-revenue cohort page", () => {
    expect(FIRST_REVENUE_PAGES.length).toBeGreaterThan(0);
    for (const page of FIRST_REVENUE_PAGES) {
      expect(protectionFor(U(`/software/${page.slug}`), snapshot).verdict, page.slug).toBe("PROTECTED");
    }
  });

  it("protects both the treatment and the control side of the comparison-quality experiment", () => {
    for (const slug of [...TREATMENT_COHORT, ...CONTROL_COHORT]) {
      expect(protectionFor(U(`/compare/${slug}`), snapshot).verdict, slug).toBe("PROTECTED");
    }
  });

  it("holds the decision money pages inside their 28-day window until it ends", () => {
    for (const page of DECISION_MONEY_PAGES) {
      const result = protectionFor(U(`/compare/${page.comparison}`), snapshot);
      // A page can also be in a stronger experiment; it is never editable while its window runs.
      expect(["OBSERVATION_WINDOW", "PROTECTED"], page.comparison).toContain(result.verdict);
    }
    const after = collectRegistrySignals(process.cwd(), "2027-03-01");
    expect(after.signals.some((s) => s.source === "decision-money-pages")).toBe(false);
  });

  it("flags a MEASURING experiment record whose declared window already ended", () => {
    const needing = registry.signals.filter((s) => s.needsClosure);
    expect(needing.length).toBeGreaterThan(0);
    for (const s of needing) expect(s.kind).toBe("PROTECTED");
  });
});
