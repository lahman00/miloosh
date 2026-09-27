import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { researchWatch, movementAlerts, outreachDisposition, outreachSchema, protectedChangeFindings, crawlDelta, cohortWatch, replyWatch, placementCheckAlerts } from "@/lib/authority/operations";
import { queryOwnership, queryObservationSchema } from "@/lib/google-war/query-store";
import { loadProtection } from "@/lib/google-war/protection";
import { checkpointWindows, type Period } from "@/lib/google-war/measurement";
import inspections from "@/data/growth/authority/research-inspections-20260927.json";
import outreach from "@/data/growth/authority/outreach.json";
import { verifiedExperimentClock } from "@/lib/google-war/deployment-proof";

const scope = { property: "sc-domain:miloosh.com", searchType: "web" as const, country: null, device: null, timezone: "America/Los_Angeles" as const, dataState: "final" as const };
const deployedAt = "2026-09-26T22:50:25.901Z";
const windows = checkpointWindows(deployedAt, 7);
const before: Period = { page: "https://miloosh.com/software/freshdesk", query: "freshdesk alternatives", window: windows.before, scope, impressions: 25, clicks: 0, position: 23, source: "test", captured_at: "2026-10-05T12:00:00Z" };
const after: Period = { ...before, window: windows.after, clicks: 1, position: 9 };
describe("private read-only operations", () => {
  it("alerts on missing fresh placement evidence without inventing removal", () => {
    expect(placementCheckAlerts([{ id: "live", status: 200, exactLinks: [{}] }])).toEqual([]);
    expect(placementCheckAlerts([{ id: "missing", status: 200, exactLinks: [] }])[0].code).toBe("PLACEMENT_ANCHOR_NOT_OBSERVED");
    expect(placementCheckAlerts([{ id: "inaccessible", status: 403, exactLinks: [] }, { id: "offline", status: null, exactLinks: [] }]).map(a => a.code)).toEqual(["PLACEMENT_CHECK_UNAVAILABLE", "PLACEMENT_CHECK_UNAVAILABLE"]);
  });
  it("requires historical production proof before using an experiment clock", () => {
    const change = { url: "/software/freshdesk", source: "fixture", deployedAt, verification: null };
    expect(verifiedExperimentClock(change, "2026-10-27T00:00:00Z")).toBeNull();
    const verified = { ...change, verification: { checkedAt: "2026-09-27T00:00:00Z", deploymentId: "fixture", httpStatus: 200, finalUrl: "https://miloosh.com/software/freshdesk", canonical: "https://miloosh.com/software/freshdesk", indexable: true, sitemapIncluded: true } };
    expect(verifiedExperimentClock(verified, "2026-10-27T00:00:00Z")).toBe(deployedAt);
    expect(verifiedExperimentClock(verified, "2026-09-26T00:00:00Z")).toBeNull();
    expect(verifiedExperimentClock({ ...verified, verification: { ...verified.verification, sitemapIncluded: false } }, "2026-10-27T00:00:00Z")).toBeNull();
  });
  it("recognizes a first observed crawl but never invents a timezone or resubmission", () => {
    const r = researchWatch(null, inspections[1], "2026-09-26T22:53:52Z");
    expect(r).toMatchObject({ state: "CRAWLED", alert: "NEW_CRAWL_OBSERVED", lastCrawlTimezone: "UNKNOWN", crawlAfterRequest: null, requestsAllowed: false });
    expect(researchWatch(inspections[1], inspections[1], "2026-09-26T22:53:52Z").alert).toBeNull();
    expect(researchWatch(null, inspections[0], "2026-09-26T22:52:22Z").state).toBe("UNKNOWN");
    expect(researchWatch(inspections[1], { ...inspections[1], checkedAt: "2026-09-26T23:00:00Z", lastCrawlTime: "older display" }, null).alert).toBeNull();
    expect(researchWatch(null, { ...inspections[1], source: "REPORTED_INSPECTION: not authenticated" }, null)).toMatchObject({ state: "UNKNOWN", alert: null });
  });
  it("requires exact matched windows and adequate impressions for position alerts", () => {
    expect(movementAlerts(before, after, deployedAt, 7).alerts).toEqual(["FIRST_OBSERVED_CLICK_IN_MATCHED_WINDOWS", "DIRECTIONAL_POSITION_IMPROVEMENT", "QUERY_ENTERED_TOP_20", "QUERY_ENTERED_TOP_10"]);
    expect(movementAlerts(before, { ...after, window: before.window }, deployedAt, 7).alerts).toEqual([]);
    expect(movementAlerts(before, { ...after, scope: { ...scope, device: "mobile" } }, deployedAt, 7).alerts).toEqual([]);
    expect(movementAlerts(before, after, null, 7).alerts).toEqual([]);
    expect(movementAlerts({ ...before, impressions: 1 }, { ...after, impressions: 1 }, deployedAt, 7).alerts).toEqual(["FIRST_OBSERVED_CLICK_IN_MATCHED_WINDOWS"]);
  });
  it("never promotes a reported or future inspection to measured cohort state", () => {
    const reported = { ...inspections[1], source: "REPORTED_INSPECTION: another-agent report", lastCrawlTime: "2026-09-27T01:57:49Z" };
    expect(cohortWatch(reported.url, [reported], deployedAt, "2026-09-27T05:00:00Z")).toMatchObject({ state: "UNKNOWN", googleState: "UNKNOWN", evidenceTier: "NONE" });
    expect(cohortWatch(reported.url, [{ ...reported, source: "Authenticated inspection", checkedAt: "2026-09-28T00:00:00Z" }], deployedAt, "2026-09-27T05:00:00Z").state).toBe("UNKNOWN");
    expect(researchWatch(null, { ...inspections[1], lastCrawlTime: "2026-09-28T00:00:00Z" }, deployedAt).crawlAfterRequest).toBeNull();
  });
  it("reports captured reply-ID deltas without pretending to query Gmail", () => {
    const rows = outreachSchema.array().parse(outreach.contacts);
    expect(replyWatch(null, rows)).toMatchObject({ status: "BASELINE_ONLY", newReplies: null });
    expect(replyWatch(rows, rows).newReplies).toEqual([]);
    expect(replyWatch(rows, [{ ...rows[0], replyIds: ["new-reply"] }]).newReplies).toEqual([{ organization: "Dense Discovery", id: "new-reply" }]);
  });
  it("does not infer a zero or ranking from a missing result", () => {
    expect(movementAlerts(before, { ...after, position: null }, deployedAt, 7).alerts).not.toContain("QUERY_ENTERED_TOP_10");
    expect(movementAlerts(before, { ...after, position: 0 }, deployedAt, 7).alerts).not.toContain("QUERY_ENTERED_TOP_10");
  });
  it("alerts on first observed brand impression only with comparable final data", () => {
    expect(movementAlerts({ ...before, query: "miloosh", impressions: 0, position: null }, { ...after, query: "miloosh" }, deployedAt, 7).alerts).toContain("FIRST_OBSERVED_BRANDED_IMPRESSION");
  });
  it("gates every known sent contact, including trash, and rejects paid dofollow", () => {
    const rows = outreachSchema.array().parse(outreach.contacts);
    expect(rows).toHaveLength(5);
    expect(outreachDisposition(" NEW@DENSEDISCOVERY.COM ", rows)).toBe("ALREADY_CONTACTED_DO_NOT_RESEND");
    expect(outreachDisposition("info@saascomparely.org", rows)).toBe("DO_NOT_CONTACT");
    expect(outreachDisposition("unobserved@example.com", rows)).toBe("NOT_IN_REGISTRY_REQUIRES_REVIEW");
  });
  it("detects real product mismatch and exact comparisons without inventing an owner", () => {
    const products = ["freshdesk", "freshservice", "umbraco", "wordpress"].map(slug => ({ slug, name: slug }));
    const pages = [...products.map(p => ({ page: "https://miloosh.com/software/" + p.slug, kind: "software" as const, products: [p.slug] })),
      { page: "https://miloosh.com/compare/umbraco-vs-wordpress", kind: "comparison" as const, products: ["umbraco", "wordpress"] }];
    const observation = queryObservationSchema.parse({ ...before, captured_at: before.captured_at, capturePrecision: "instant", evidence: "COMMITTED_PAGE_FILTERED_UI", coverage: "TOP_ROWS_ONLY", ctr: 0, scope: { ...scope, dataState: "unknown" } });
    expect(queryOwnership({ ...observation, query: "alternative à freshservice belgique" }, pages, products)).toMatchObject({ classification: "LIKELY_WRONG_OWNER", expected: ["https://miloosh.com/software/freshservice"] });
    expect(queryOwnership({ ...observation, query: "umbraco vs wordpress", page: "https://miloosh.com/software/umbraco" }, pages, products).classification).toBe("LIKELY_WRONG_OWNER");
    expect(queryOwnership({ ...observation, query: "mulesoft vs wso2" }, pages, products).classification).toBe("AMBIGUOUS");
  });
  it("blocks protected product and shared rendering changes without editing anything", () => {
    const files = ["data/software/help-scout.json", "app/software/[slug]/page.tsx", "data/growth/frozen-cohorts.ts"];
    expect(protectedChangeFindings(files, loadProtection())).toHaveLength(3);
    expect(protectedChangeFindings(["lib/google-war/protection.ts", "docs/seo-factory-experiments.json"], loadProtection())).toHaveLength(2);
    expect(protectedChangeFindings(["data/growth/authority/outreach.json", "scripts/growth/morning-google.ts"], loadProtection())).toEqual([]);
    expect(fs.readFileSync("scripts/growth/release-google.ts", "utf8")).toContain('"protected-intake"');
  });
  it("compares rendered fields, including removed URLs and runtime errors", () => {
    expect(crawlDelta([{ route: "/a", status: 200 }, { route: "/b" }], [{ route: "/a", status: 500 }, { route: "/c" }])).toMatchObject({ removed: ["/b"], added: ["/c"], changed: [{ route: "/a", fields: ["status"] }] });
  });
});
