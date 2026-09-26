import { describe, it, expect } from "vitest";
import { resolveEvidence, recrawlState, type InspectionEvidence } from "@/lib/google-war/resolver";
import { appendQueries, cannibalization, queryOwnership, queryObservationSchema, type QueryObservation } from "@/lib/google-war/query-store";
import { checkpointWindows, rankingDelta, cohortResult, type Period } from "@/lib/google-war/measurement";
import { cohortRegistry, cohortOverlaps } from "@/lib/google-war/cohorts";
import { reservedProtection } from "@/lib/google-war/protection";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getActivePartner } from "@/data/affiliate/active-partners";
import type { SearchSnapshot } from "@/lib/google-war/evidence";
const page = "https://miloosh.com/software/umbraco", now = "2026-09-26T22:00:00Z";
const inspection = (extra: Partial<InspectionEvidence> = {}): InspectionEvidence => ({ url: page, checkedAt: "2026-09-25T12:00:00Z", source: "fixture", verdict: "PASS", coverageState: null, lastCrawlTime: null, googleCanonical: page, userCanonical: page, pageFetchState: "SUCCESSFUL", indexingState: "INDEXING_ALLOWED", robotsTxtState: "ALLOWED", ...extra });
const snapshot: SearchSnapshot = { capturedAt: now, window: { start: "2026-08-07", end: "2026-09-23" }, source: "fixture authenticated export", rows: [{ url: page, impressions: 116, clicks: 0, ctr: 0, position: 15 }] };
const scope = { property: "sc-domain:miloosh.com", searchType: "web" as const, country: null, device: null, timezone: "America/Los_Angeles" as const, dataState: "final" as const };
const query = (extra: Partial<QueryObservation> = {}): QueryObservation => ({ query: "umbraco vs wordpress", page, window: snapshot.window, scope, impressions: 116, clicks: null, ctr: null, position: null, source: "fixture", captured_at: "2026-09-26", capturePrecision: "day", evidence: "COMMITTED_PAGE_FILTERED_UI", coverage: "TOP_ROWS_ONLY", ...extra });
describe("Canonical freshness and recrawl", () => {
  it("newer exclusion overrides historical position even when exported later", () => {
    const r = resolveEvidence(page, [inspection({ verdict: null, coverageState: "Crawled - currently not indexed" })], snapshot, now);
    expect(r).toMatchObject({ state: "CRAWLED_NOT_INDEXED", lostIndexation: true, rankingEligible: false, lane: "INDEX_SELECTION" });
  });
  it("newer committed inspection beats a stale live label", () => {
    expect(resolveEvidence(page, [inspection({ checkedAt: "2026-08-01T00:00:00Z", provenance: "LIVE_INSPECTION" }), inspection({ verdict: null, coverageState: "Discovered - currently not indexed" })], snapshot, now).state).toBe("DISCOVERED_NOT_INDEXED");
  });
  it("live inspection wins equal-time precedence but conflicting checks block action", () => {
    const r = resolveEvidence(page, [inspection({ source: "committed" }), inspection({ source: "live", provenance: "LIVE_INSPECTION", verdict: null, coverageState: "Crawled - currently not indexed" })], snapshot, now);
    expect(r.inspected?.source).toBe("live"); expect(r.rankingEligible).toBe(false);
  });
  it("a report cannot override authenticated inspection", () => expect(resolveEvidence(page, [inspection(), inspection({ provenance: "REPORTED", checkedAt: now, verdict: null, coverageState: "Crawled - currently not indexed" })], snapshot, now).state).toBe("INDEXED"));
  it("GSC evidence alone never proves current indexation", () => expect(resolveEvidence(page, [], snapshot, now)).toMatchObject({ state: "UNKNOWN", rankingEligible: false, historicalSignal: true }));
  it("an inspection older than the measurement period requires recheck", () => expect(resolveEvidence(page, [inspection({ checkedAt: "2026-09-20T00:00:00Z" })], snapshot, now).rankingEligible).toBe(false));
  it("missing exact URL is unknown, not joined to www", () => expect(resolveEvidence(page.replace("miloosh", "www.miloosh"), [], snapshot, now).search).toBeNull());
  it("future checks cannot certify inclusion", () => expect(resolveEvidence(page, [inspection({ checkedAt: "2027-01-01T00:00:00Z" })], snapshot, now).state).toBe("UNKNOWN"));
  it("fresh index check permits ranking", () => expect(resolveEvidence(page, [inspection()], snapshot, now).rankingEligible).toBe(true));
  it("new committed Pages report blocks historical ranking without faking individual inspection or crawl time", () => {
    const r = resolveEvidence(page, [inspection({ provenance: "GSC_PAGE_REPORT", checkedAt: now, verdict: null, coverageState: "Crawled - currently not indexed", source: "GSC processing date 2026-09-21" })], snapshot, now);
    expect(r).toMatchObject({ lostIndexation: true, rankingEligible: false, evidenceTier: "GSC_PAGE_REPORT", pagesDataAsOf: "2026-09-21", reportLagConflict: true });
  });
  it("a fresh individual inspection outranks Pages report", () => expect(resolveEvidence(page, [inspection(), inspection({ provenance: "GSC_PAGE_REPORT", checkedAt: now, verdict: null, coverageState: "Crawled - currently not indexed" })], snapshot, now).state).toBe("INDEXED"));
  it("old index check cannot enable ranking", () => expect(resolveEvidence(page, [inspection({ checkedAt: "2026-08-01T00:00:00Z" })], snapshot, now).rankingEligible).toBe(false));
  it.each([null, "2026-09-20", "8 באוג׳ 2026, 6:13:28"])("crawl time without timezone stays UNKNOWN: %s", lastCrawlTime => expect(recrawlState(inspection({ lastCrawlTime }), "2026-09-21T00:00:00Z")).toBe("UNKNOWN"));
  it("no deployment means no recrawl judgment", () => expect(recrawlState(inspection({ lastCrawlTime: "2026-09-24T00:00:00Z" }), null)).toBe("UNKNOWN"));
  it("old crawl is NOT_RECRAWLED even with PASS", () => expect(recrawlState(inspection({ lastCrawlTime: "2026-09-20T00:00:00Z" }), "2026-09-21T00:00:00Z")).toBe("NOT_RECRAWLED"));
  it("post-treatment crawl excluded", () => expect(recrawlState(inspection({ lastCrawlTime: "2026-09-24T00:00:00Z", verdict: null, coverageState: "Crawled - currently not indexed" }), "2026-09-21T00:00:00Z")).toBe("RECRAWLED_EXCLUDED"));
  it("post-treatment crawl indexed", () => expect(recrawlState(inspection({ lastCrawlTime: "2026-09-24T00:00:00Z" }), "2026-09-21T00:00:00Z")).toBe("INDEXED"));
});
describe("Real query×page store and ownership", () => {
  it("preserves missing metrics and source date precision", () => expect(appendQueries([], [query()])[0]).toMatchObject({ clicks: null, ctr: null, position: null, capturePrecision: "day" }));
  it("is replay safe", () => expect(appendQueries([query()], [query()])).toHaveLength(1));
  it("rejects mutation of immutable observation", () => expect(() => appendQueries([query()], [query({ impressions: 117 })])).toThrow(/Conflicting/));
  it.each([{ page: "https://example.com/" }, { page: `${page}?x=1` }, { query: "" }, { clicks: 999 }, { window: { start: "2026-09-27", end: "2026-09-28" } }, { captured_at: "2026-09-26T00:00:00Z" }])("rejects invalid schema %j", extra => expect(() => queryObservationSchema.parse(query(extra))).toThrow());
  it("detects Umbraco query served by software instead of existing comparison", () => {
    const result = queryOwnership(query(), [{ page, kind: "software", products: ["umbraco"] }, { page: "https://miloosh.com/compare/umbraco-vs-wordpress", kind: "comparison", products: ["umbraco", "wordpress"] }], [{ slug: "umbraco", name: "Umbraco" }, { slug: "wordpress", name: "WordPress" }]);
    expect(result.classification).toBe("LIKELY_WRONG_OWNER");
  });
  it("does not fabricate a missing comparison owner", () => expect(queryOwnership(query(), [], []).classification).toBe("AMBIGUOUS"));
  it("explicit NO_DATA", () => expect(queryOwnership(null, [], []).classification).toBe("NO_DATA"));
  it("software alternatives query has correct owner", () => expect(queryOwnership(query({ query: "umbraco alternatives" }), [{ page, kind: "software", products: ["umbraco"] }], [{ slug: "umbraco", name: "Umbraco" }]).classification).toBe("CORRECT_OWNER"));
  it("semantic similarity alone is not cannibalization", () => expect(cannibalization([query(), query({ query: "umbraco alternative", page: "https://miloosh.com/software/wordpress" })])).toHaveLength(0));
  it("same query and period across two real pages is observed split", () => expect(cannibalization([query(), query({ page: "https://miloosh.com/compare/umbraco-vs-wordpress" })])[0]).toMatchObject({ status: "OBSERVED_MULTI_PAGE_IMPRESSIONS", harm: "UNPROVEN" }));
  it("never joins different windows or devices", () => expect(cannibalization([query(), query({ page: "https://miloosh.com/software/wordpress", scope: { ...scope, device: "MOBILE" } })])).toHaveLength(0));
  it("re-exports do not create extra landing pages", () => expect(cannibalization([query(), query({ source: "export2" })])).toHaveLength(0));
});
describe("Comparable checkpoints and cohort truth", () => {
  const deployedAt = "2026-09-01T01:00:00Z"; // Aug 31 in Pacific, not Sep 1.
  it.each([7, 14, 28] as const)("uses equal %i-day windows excluding deployment day", days => {
    const w = checkpointWindows(deployedAt, days);
    expect(w.before.end).toBe("2026-08-30"); expect(w.after.start).toBe("2026-09-01");
    expect((Date.parse(w.after.end) - Date.parse(w.after.start)) / 86400000 + 1).toBe(days);
  });
  const period = (window: { start: string; end: string }, n = 100): Period => ({ page, query: null, window, scope, impressions: n, clicks: 0, position: 15, source: "fixture", captured_at: "2026-10-01T00:00:00Z" });
  const w = checkpointWindows(deployedAt, 7), before = period(w.before), after = period(w.after, 120);
  it("computes direction and sample sizes", () => {
    const r = rankingDelta(before, after, deployedAt, 7); expect(r).toMatchObject({ status: "COMPARABLE", impressionsDelta: 20 });
    expect(cohortResult([r], [r]).treatment.measured).toBe(1);
  });
  it("does not compare 7 and 28 days", () => expect(rankingDelta(before, { ...after, window: checkpointWindows(deployedAt, 28).after }, deployedAt, 7).status).toBe("INCOMPATIBLE_WINDOWS"));
  it("does not compare different dimensions", () => expect(rankingDelta(before, { ...after, scope: { ...scope, country: "USA" } }, deployedAt, 7).status).toBe("INCOMPATIBLE_WINDOWS"));
  it("no deployment is not a deployed experiment", () => expect(rankingDelta(before, after, null, 7).status).toBe("WAIT_DEPLOYMENT"));
  it("no data is not a zero experiment result", () => expect(cohortResult([], []).differenceInMeanChange).toBeNull());
  it("all canonical cohorts protect treatment and controls", () => {
    const registry = cohortRegistry(), protectedPages = new Set(reservedProtection().map(r => r.page));
    expect(registry).toHaveLength(6);
    for (const c of registry) for (const p of [...c.treatment, ...c.control]) expect(protectedPages.has(p)).toBe(true);
    expect(cohortOverlaps(registry)).toBeInstanceOf(Array);
  });
  it("HubSpot decline and precise reason remain canonical everywhere operational", () => {
    const r = CURRENT_AFFILIATE_LEDGER.find(r => r.programId === "hubspot")!;
    expect(r.status).toBe("REJECTED"); expect(r.affiliateUrl).toBeNull(); expect(getActivePartner("hubspot")).toBeUndefined(); expect(r.evidence.join(" ")).toContain("Low reach (traffic, followers)");
  });
});
