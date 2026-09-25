import { describe, expect, it } from "vitest";
import { assessPublicationThreshold, experimentIsCoolingDown } from "@/lib/seo-factory/policy";
import { clusterOpportunities, computeOpportunityScore, selectCanonicalWinner, suppressActiveExperimentRecommendations, viableAffiliateProgramSlugs } from "@/lib/seo-factory/run";
import type { ScoreComponent, SeoOpportunity } from "@/lib/seo-factory/types";

function opportunity(overrides: Partial<SeoOpportunity> = {}): SeoOpportunity {
  return { id: "x", query: "pipedrive alternatives", intent: "ALTERNATIVES", action: "IMPROVE", targetUrl: "/software/pipedrive", existingUrl: "/software/pipedrive", relatedSoftware: ["pipedrive"], category: "crm", gsc: { impressions: 100, clicks: 0, ctr: 0, position: 70 }, affiliateStatus: "ACTIVE", moneyScore: 50, opportunityScore: 70, scoreComponents: [], cannibalizationRisk: "none", canonicalWinner: null, recommendation: "Improve", evidence: [], confidence: "high", state: "ANALYZED", publicationEligible: false, ...overrides };
}

describe("SEO Factory scoring and safety policy", () => {
  it("suppresses another major intervention while a page experiment is measuring", () => {
    const item = opportunity({ action: "IMPROVE", existingUrl: "/software/pipedrive", targetUrl: "/software/pipedrive" });
    const [suppressed] = suppressActiveExperimentRecommendations([item], [{ page: "/software/pipedrive", decision: "MEASURING", measurementWindowDays: 28, recordedAt: "2026-08-20T00:00:00Z" }]);
    expect(suppressed.action).toBe("WAIT");
    expect(suppressed.recommendation).toContain("Active SEO experiment");
  });
  it("excludes unavailable signals instead of treating them as zero", () => {
    const components: ScoreComponent[] = [
      { name: "real", value: 1, weight: 3, kind: "real", source: "GSC", confidence: "high" },
      { name: "missing", value: null, weight: 100, kind: "unavailable", source: "none", confidence: "low" },
    ];
    expect(computeOpportunityScore(components)).toBe(100);
  });

  it("gives a higher score to otherwise equal active-affiliate evidence", () => {
    const base: ScoreComponent[] = [{ name: "demand", value: 0.7, weight: 3, kind: "real", source: "GSC", confidence: "high" }];
    const inactive = [...base, { name: "affiliate", value: 0, weight: 1, kind: "derived", source: "registry", confidence: "high" } as ScoreComponent];
    const active = [...base, { name: "affiliate", value: 1, weight: 1, kind: "derived", source: "registry", confidence: "high" } as ScoreComponent];
    expect(computeOpportunityScore(active)).toBeGreaterThan(computeOpportunityScore(inactive));
  });

  it("selects the canonical query winner by clicks, then impressions, then position", () => {
    expect(selectCanonicalWinner([
      { keys: ["q", "https://miloosh.com/software/a"], clicks: 1, impressions: 100, ctr: 0.01, position: 5 },
      { keys: ["q", "https://miloosh.com/software/b"], clicks: 2, impressions: 20, ctr: 0.1, position: 2 },
    ])).toBe("/software/b");
  });

  it("clusters synonymous query rows into one executable page+intent action", () => {
    const base = {
      id: "a", query: "semrush alternatives", intent: "ALTERNATIVES", action: "IMPROVE", targetUrl: "/software/semrush", existingUrl: "/software/semrush", relatedSoftware: ["semrush"], category: "seo", affiliateStatus: "VIABLE", moneyScore: 50, opportunityScore: 70, scoreComponents: [], cannibalizationRisk: "none", canonicalWinner: null, recommendation: "Improve", evidence: [], confidence: "high", state: "ANALYZED", publicationEligible: false,
    } satisfies Omit<SeoOpportunity, "gsc">;
    const clustered = clusterOpportunities([
      { ...base, gsc: { impressions: 100, clicks: 1, ctr: 0.01, position: 70 } },
      { ...base, id: "b", query: "alternative semrush", gsc: { impressions: 50, clicks: 2, ctr: 0.04, position: 60 } },
    ]);
    expect(clustered).toHaveLength(1);
    expect(clustered[0]!.gsc).toMatchObject({ impressions: 150, clicks: 3, ctr: 0.02 });
    expect(clustered[0]!.evidence.at(-1)).toContain("Clustered 2 query variant");
  });

  it("does not cluster different entity intents merely because Google ranks the same URL", () => {
    const common = { query: "a alternatives", intent: "ALTERNATIVES", action: "IMPROVE", targetUrl: "/software/a", existingUrl: "/software/a", category: "x", gsc: { impressions: 10, clicks: 0, ctr: 0, position: 50 }, affiliateStatus: "NONE", moneyScore: null, opportunityScore: 50, scoreComponents: [], cannibalizationRisk: "none", canonicalWinner: null, recommendation: "Improve", evidence: [], confidence: "medium", state: "ANALYZED", publicationEligible: false } satisfies Omit<SeoOpportunity, "id" | "relatedSoftware">;
    const clustered = clusterOpportunities([
      { ...common, id: "a", relatedSoftware: ["a"] },
      { ...common, id: "b", query: "b alternatives", relatedSoftware: ["b"] },
    ]);
    expect(clustered).toHaveLength(2);
  });

  it("never marks a page publishable in Level 0, even with strong evidence", () => {
    const result = assessPublicationThreshold({ impressions: 1000, intent: "PRICING", existingCanonical: null, factualSources: 5, internalLinkSources: 8, uniqueDecisionValue: true, cannibalizationRisk: "none" });
    expect(result.eligible).toBe(false);
    expect(result.blockers).toContain("SEO Factory v1 autonomy is Level 0 (analysis only)");
  });

  it("fails weak page ideas with explicit evidence blockers", () => {
    const result = assessPublicationThreshold({ impressions: 2, intent: "UNKNOWN", existingCanonical: "/software/pipedrive", factualSources: 0, internalLinkSources: 0, uniqueDecisionValue: false, cannibalizationRisk: "confirmed" });
    expect(result.blockers).toHaveLength(8);
  });

  it("enforces an experiment measurement cooldown and treats malformed dates as unsafe", () => {
    const now = Date.parse("2026-08-20T00:00:00Z");
    expect(experimentIsCoolingDown("2026-08-01T00:00:00Z", 28, now)).toBe(true);
    expect(experimentIsCoolingDown("2026-07-01T00:00:00Z", 28, now)).toBe(false);
    expect(experimentIsCoolingDown("not-a-date", 28, now)).toBe(true);
  });
});

describe("affiliate viability respects the current relationship", () => {
  const viable = viableAffiliateProgramSlugs();

  it("does not score rejected or ended relationships as viable", () => {
    for (const slug of ["clickup", "help-scout", "brevo", "webflow", "bigcommerce", "coda"]) {
      expect(viable.has(slug), slug).toBe(false);
    }
  });

  it("keeps pending relationships viable without treating them as active", () => {
    expect(viable.has("activecampaign")).toBe(true);
    expect(viable.has("woocommerce")).toBe(true);
  });
});
