import { describe, expect, it } from "vitest";
import { buildGscOpportunity, readProtectedExperimentSlugs } from "@/scripts/growth/gsc-opportunity-miner";

describe("GSC opportunity experiment protection", () => {
  it("protects both legacy cohort members and currently measuring receipt pages", () => {
    const protectedSlugs = readProtectedExperimentSlugs();

    expect(protectedSlugs.has("pipedrive")).toBe(true);
    expect(protectedSlugs.has("ecwid")).toBe(true);
    expect(protectedSlugs.has("woocommerce")).toBe(true);
    expect(protectedSlugs.has("klaviyo")).toBe(true);
  });

  it("marks a measuring page as protected independent of the mutable local GSC snapshot", () => {
    const protectedSlugs = readProtectedExperimentSlugs();
    const ecwid = buildGscOpportunity({
      url: "https://miloosh.com/software/ecwid",
      queryCluster: ["ecwid pricing"],
      baseline: { impressions: 24, clicks: 0, bestPosition: 14.2 },
    }, protectedSlugs);

    expect(ecwid.isProtected).toBe(true);
    expect(ecwid.opportunityType).toBe("STRIKING_DISTANCE");
    expect(ecwid.recommendedAction).toContain("Protected experiment cohort");
  });
});
