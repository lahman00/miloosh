import { describe, expect, it } from "vitest";
import { appendBrand, brandSchema, brandMovement, categoryPositions, compareCategoryPositions, indexingEligibility, authorityObservatory, deepLinkPriority } from "@/lib/authority/measurement";
import { authorityAlerts } from "@/lib/authority/alerts";
import { researchTechnicalQa } from "@/lib/authority/research-qa";
import { parseRegistry } from "@/lib/authority/registry";
import { getComparisonSerpOverride } from "@/data/seo/serp-overrides";
import { canonicalCohortPage } from "@/lib/google-war/cohorts";
import { brandQuery } from "@/scripts/growth/brand-demand";
import baseline from "@/data/growth/authority/brand-baseline.json";
import registry from "@/data/growth/authority/registry.json";
import type { SearchSnapshot, Inspection } from "@/lib/google-war/evidence";

const before = brandSchema.parse({ ...baseline, window: { start: "2026-09-01", end: "2026-09-07" }, scope: { ...baseline.scope, dataState: "final" } });
const after = { ...before, window: { start: "2026-09-08", end: "2026-09-14" }, impressions: 10, clicks: 1 };
const snapshot: SearchSnapshot = { capturedAt: "2026-09-25T12:00:00Z", source: "authenticated test fixture", window: { start: "2026-09-01", end: "2026-09-07" }, rows: [1, 2, 3].map(n => ({ url: `https://miloosh.com/software/a${n}`, clicks: 0, impressions: 100, ctr: 0, position: 10 * n })) };
const pages = snapshot.rows.map(r => ({ url: r.url, category: "test", commercial: true }));
describe("authority measurement boundaries", () => {
  it.each([["joomla", "Joomla"], ["drupal", "Drupal"]])("fixes emitted %s key without rewriting Claude title", (slug, name) => {
    const path = canonicalCohortPage(`/compare/umbraco-vs-${slug}`);
    expect(path).toBe(`/compare/${slug}-vs-umbraco`);
    expect(getComparisonSerpOverride(path.slice(9))?.title).toContain(`Umbraco vs ${name} (2026)`);
    expect(getComparisonSerpOverride(`umbraco-vs-${slug}`)).toBeUndefined();
  });
  it("records the actual brand window, not a three-month claim", () => {
    expect(baseline.window).toEqual({ start: "2026-08-07", end: "2026-09-24" });
    expect(baseline.computedCtr).toBeNull(); expect(baseline.scope.dataState).toBe("unknown");
  });
  it("builds a filtered aggregate API request, not a top-query sum", () => expect(brandQuery("2026-09-01", "2026-09-07")).toMatchObject({ dimensions: [], dataState: "final", type: "web", dimensionFilterGroups: [{ groupType: "and", filters: [{ dimension: "query", operator: "contains", expression: "miloosh" }] }] }));
  it("replays without incrementing branded impressions", () => expect(appendBrand([before], [before])).toHaveLength(1));
  it("rejects edited historic captures", () => expect(() => appendBrand([before], [{ ...before, impressions: 1 }])).toThrow());
  it("does not calculate CTR growth from zero", () => expect(brandMovement(before, after)).toMatchObject({ status: "COMPARABLE", beforeCtr: null, afterCtr: .1, firstObservedBrandSignal: true }));
  it.each([
    { ...after, window: { start: "2026-09-08", end: "2026-09-15" } },
    { ...after, window: { start: "2026-09-07", end: "2026-09-13" } },
    { ...after, scope: { ...after.scope, device: "mobile" } },
    { ...after, scope: { ...after.scope, dataState: "unknown" as const } },
  ])("refuses incomparable brand windows/scopes", a => expect(brandMovement(before, a).status).toBe("INCOMPATIBLE_WINDOWS"));
  it("missing data is unknown", () => expect(brandMovement(undefined, after).status).toBe("UNKNOWN"));
  it("keeps category sample sizes and exact members", () => expect(categoryPositions(snapshot, pages).categories[0]).toMatchObject({ n: 3, median: 20, members: pages.map(r => r.url) }));
  it("refuses changed category membership and overlapping windows", () => {
    const a = categoryPositions(snapshot, pages, { ...before.scope, dataState: "final" }), b = { ...a, window: after.window };
    expect(compareCategoryPositions(a, b).rows[0].medianDelta).toBe(0);
    expect(compareCategoryPositions(a, a).status).toBe("INCOMPATIBLE_WINDOWS");
    expect(compareCategoryPositions(a, { ...b, categories: [{ ...b.categories[0], members: ["different"] }] }).rows[0].status).toBe("CHANGED_SAMPLE");
    expect(compareCategoryPositions(a, { ...b, scope: null }).status).toBe("INCOMPATIBLE_SCOPES");
    expect(compareCategoryPositions(a, { ...b, scope: { ...before.scope, dataState: "final", device: "mobile" } }).status).toBe("INCOMPATIBLE_SCOPES");
  });
  it("newer exclusion blocks ranking despite authority support priority", () => {
    const i: Inspection = { url: pages[0].url, checkedAt: "2026-09-26T12:00:00Z", source: "test inspection", coverageState: "Crawled - currently not indexed", verdict: "NEUTRAL", lastCrawlTime: null, googleCanonical: null, userCanonical: null, pageFetchState: null, robotsTxtState: null, indexingState: null };
    expect(deepLinkPriority([], snapshot, pages, [i], "2026-09-26T23:00:00Z")[0]).toMatchObject({ rankingEligible: false, lane: "INDEX_SELECTION" });
  });
  it("does not invent crawl-after-mention from missing timestamps", () => {
    const r = authorityObservatory(parseRegistry(registry), [], snapshot, "2026-09-26T23:00:00Z");
    expect(r.every(x => x.crawlAfterMention === "UNKNOWN")).toBe(true);
  });
  it("index requests require live deployment + quota and never repeat", () => {
    const input = { url: "https://miloosh.com/research/test", deployedAt: null, verifiedAt: null, httpStatus: 200, canonical: "https://miloosh.com/research/test", indexable: true, inSitemap: true, quotaRemaining: 1, previousRequests: [] };
    expect(indexingEligibility(input)).toBe("WAIT_DEPLOYMENT_VERIFICATION");
    expect(indexingEligibility({ ...input, previousRequests: [input.url] })).toBe("ALREADY_REQUESTED");
    const live = { ...input, deployedAt: "2026-09-26T10:00:00Z", verifiedAt: "2026-09-26T11:00:00Z" };
    expect(indexingEligibility(live)).toBe("ELIGIBLE_FOR_ONE_CONTROLLED_REQUEST");
    expect(indexingEligibility({ ...live, quotaRemaining: null })).toBe("WAIT_QUOTA");
    expect(indexingEligibility({ ...live, indexable: false })).toBe("TECHNICAL_BLOCK");
  });
  it("flags removals, noindex, broken targets and sufficiently large matched referral spikes", () => {
    const a = authorityAlerts(parseRegistry(registry), "2026-09-26T23:00:00Z", new Set(["/"]), [{ url: "/research/test", noindex: true }], true, { previous: 12, current: 60, comparable: true });
    expect(a.map(r => r.code)).toEqual(expect.arrayContaining(["PLACEMENT_REMOVED", "VISIBILITY_CONFLICT", "RESEARCH_NOINDEX", "BROKEN_DEEP_LINK_TARGET", "REFERRAL_SPIKE", "BRANDED_QUERY_FIRST_OBSERVED"]));
    expect(authorityAlerts([], "2026-09-26T23:00:00Z", new Set(), [], false, { previous: 1, current: 4, comparable: true })).toEqual([]);
  });
  it("research QA fails closed on missing/noindexed/noncanonical/undiscovered assets", () => {
    expect(researchTechnicalQa("/research/test", undefined, "", new Map()).status).toBe("MISSING");
    const r = researchTechnicalQa("/research/test", '<meta name="robots" content="noindex">', "", new Map());
    expect(r.status).toBe("BLOCKED"); expect(r.failures).toContain("Research noindexed");
  });
});
