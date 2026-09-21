import { describe, expect, it } from "vitest";
import { readProtectedExperimentSlugs, mineGscOpportunities } from "@/scripts/growth/gsc-opportunity-miner";

describe("GSC opportunity experiment protection", () => {
  it("protects both legacy cohort members and currently measuring receipt pages", () => {
    const protectedSlugs = readProtectedExperimentSlugs();

    expect(protectedSlugs.has("pipedrive")).toBe(true);
    expect(protectedSlugs.has("ecwid")).toBe(true);
    expect(protectedSlugs.has("woocommerce")).toBe(true);
    expect(protectedSlugs.has("klaviyo")).toBe(true);
  });

  it("marks current GSC opportunities as protected when their page is measuring", () => {
    const ecwid = mineGscOpportunities().allOpportunities.find((item) => item.targetSlug === "ecwid");

    expect(ecwid).toBeDefined();
    expect(ecwid?.isProtected).toBe(true);
    expect(ecwid?.recommendedAction).toContain("Protected experiment cohort");
  });
});
