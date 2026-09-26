import { it, expect } from "vitest";
import { verifyRecordedTitle } from "@/lib/google-war/change-manifest";
import { canonicalCohortPage, cohortRegistry } from "@/lib/google-war/cohorts";
import { prioritize, type Signals } from "@/lib/google-war/priority";
import { mineGscOpportunities, buildGscOpportunity } from "@/scripts/growth/gsc-opportunity-miner";
it("wrong-order receipt never proves a title was applied to the real canonical route", () => {
  const html = new Map([["/compare/joomla-vs-umbraco", "<title>Joomla vs Umbraco | Miloosh</title>"]]);
  const r = verifyRecordedTitle({ url: "/compare/umbraco-vs-joomla", after: { title: "Umbraco vs Joomla (2026): New title" } }, html);
  expect(r).toMatchObject({ canonical: "/compare/joomla-vs-umbraco", status: "EXPECTED_TITLE_NOT_RENDERED", reportedRouteEmitted: false });
});
it("actual expected title in emitted artifact is evidenced separately from deployment", () => expect(verifyRecordedTitle({ url: "/compare/umbraco-vs-wordpress", after: { title: "Verified title" } }, new Map([["/compare/umbraco-vs-wordpress", "<title>Verified title | Miloosh</title>"]])).status).toBe("EXPECTED_TITLE_RENDERED"));
it("membership canonicalizes aliases without editing content", () => {
  expect(canonicalCohortPage("/compare/umbraco-vs-drupal")).toBe("/compare/drupal-vs-umbraco");
  expect(cohortRegistry().find(c => c.id === "ranking-intent-20260926")!.treatment).toContain("/compare/drupal-vs-umbraco");
});
const signal: Signals = { index: "INDEXED", impressions: 100, position: 15, clicks: 0, ctr: 0, bucket: "A", inbound: 10, depth: 2, protected: false, intentConflict: false, activeAffiliate: true };
it.each([8, 15, 20])("striking distance includes boundary %i", position => expect(prioritize({ ...signal, position }).groups).toContain("RANKING_STRIKING_DISTANCE"));
it.each([7.9, 20.1, 30, 90])("striking distance excludes %i", position => expect(prioritize({ ...signal, position }).groups).not.toContain("RANKING_STRIKING_DISTANCE"));
it("99 impressions is below declared meaningful threshold", () => expect(prioritize({ ...signal, impressions: 99 }).groups).not.toContain("RANKING_STRIKING_DISTANCE"));
it("position 90 is never a CTR test", () => expect(prioritize({ ...signal, position: 90 }).groups).not.toContain("CTR_OPPORTUNITY"));
it("legacy miner cannot turn a historical position into current ranking eligibility", () => expect(buildGscOpportunity({ url: "https://miloosh.com/software/example", baseline: { impressions: 999, clicks: 0, bestPosition: 90 } }, new Set()).opportunityType).toBe("HOLD"));
it("legacy miner uses the current resolver and no longer promotes Pipedrive/Airtable lost-indexation evidence", () => {
  const result = mineGscOpportunities();
  for (const row of [...result.strikingDistanceOpportunities, ...result.highImpressionOpportunities]) {
    expect(row.isProtected).toBe(false);
    expect(row.targetSlug).not.toBe("pipedrive"); expect(row.targetSlug).not.toBe("airtable");
  }
  expect(result.allOpportunities.find(r => r.targetSlug === "airtable")?.opportunityType).toBe("INDEX_SELECTION");
});
