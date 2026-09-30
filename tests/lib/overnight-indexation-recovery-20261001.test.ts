import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { isFrozenSlug } from "@/data/growth/frozen-cohorts";
import { scoreFactualDepth } from "@/scripts/growth/factual-depth-audit";
import { assessIndexationReadiness } from "@/scripts/growth/indexation-readiness";
import { readProtectedExperimentSlugs } from "@/scripts/growth/gsc-opportunity-miner";

const depthTargets = ["apigee", "datadog", "read-the-docs", "stripe", "supabase"] as const;
const discoveryEdges = {
  hootsuite: "birdeye",
  gong: "consensus",
  airbyte: "dbt-cloud",
  notion: "dropbox",
  netsuite: "floqast",
  cloudflare: "knowbe4",
  ninjaone: "veeam-data-platform",
} as const;

describe("2026-10-01 bounded indexation-readiness repairs", () => {
  it.each(depthTargets)("raises %s from factual-depth D using current official sources", slug => {
    const software = getSoftware(slug)!;
    const depth = scoreFactualDepth(software);
    expect(depth.bucket).toBe("A");
    expect(depth.score).toBeGreaterThanOrEqual(80);
    expect(software.pricing?.lastVerified).toBe("2026-09-30");
    expect(software.accessedAt).toBe("2026-09-30");
    expect(software.cons?.length).toBeGreaterThanOrEqual(3);
    expect(software.sources.length).toBeGreaterThanOrEqual(3);
  });

  it("adds only relevant reciprocal discovery edges from unprotected existing pages", () => {
    const protectedSlugs = readProtectedExperimentSlugs();
    for (const [sourceSlug, targetSlug] of Object.entries(discoveryEdges)) {
      const source = getSoftware(sourceSlug)!;
      expect(source).toBeDefined();
      expect(protectedSlugs.has(sourceSlug), sourceSlug).toBe(false);
      expect(isFrozenSlug(sourceSlug), sourceSlug).toBe(false);
      expect(source.accessedAt).toBe("2026-09-30");
      expect(source.alternatives.some(alternative => alternative.slug === targetSlug), `${sourceSlug} -> ${targetSlug}`).toBe(true);
    }
  });

  it("leaves no locally measurable FAIL page after the bounded depth and discovery repairs", () => {
    for (const slug of [...depthTargets, ...Object.values(discoveryEdges)]) {
      expect(assessIndexationReadiness(slug).verdict, slug).not.toBe("FAIL");
    }
  });

  it("preserves important pricing semantics instead of flattening complex billing", () => {
    expect(getSoftware("datadog")!.cons!.join(" ")).toMatch(/separate billing units|high-watermark/i);
    expect(getSoftware("apigee")?.pricing?.startingPrice).toMatch(/environments per region|API calls|deployment units/i);
    expect(getSoftware("stripe")?.pricing?.startingPrice).toContain("US standard pricing page");
    expect(getSoftware("supabase")!.cons!.join(" ")).toMatch(/overages|paused after one week/i);
    expect(getSoftware("read-the-docs")?.pricing?.freePlan).toBe(true);
  });
});
