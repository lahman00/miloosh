import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getRevenueScore } from "@/lib/revenue/scoring";

function score(slug: string) {
  const software = getSoftware(slug);
  if (!software) throw new Error(`Missing test software: ${slug}`);
  return getRevenueScore(software);
}

describe("revenue scoring current affiliate truth", () => {
  it("gives verified active partners full affiliate availability", () => {
    expect(score("pipedrive").affiliateAvailabilityScore).toBe(10);
    expect(score("wix").affiliateAvailabilityScore).toBe(10);
  });

  it("does not reward a public program after Miloosh was rejected", () => {
    expect(score("clickup").affiliateAvailabilityScore).toBe(0);
    expect(score("webflow").affiliateAvailabilityScore).toBe(0);
  });

  it("keeps pending and owner-blocked relationships distinct from active", () => {
    expect(score("freshdesk").affiliateAvailabilityScore).toBe(6);
    expect(score("gorgias").affiliateAvailabilityScore).toBe(5);
  });

  it("does not reward ended/no-program relationships", () => {
    expect(score("calendly").affiliateAvailabilityScore).toBe(0);
    expect(score("coda").affiliateAvailabilityScore).toBe(0);
  });

  it("comparison coverage remains a bounded content-surface score", () => {
    expect(score("pipedrive").buyingIntentScore).toBeGreaterThanOrEqual(0);
    expect(score("pipedrive").buyingIntentScore).toBeLessThanOrEqual(10);
  });
});
