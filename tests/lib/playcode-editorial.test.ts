import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { isSoftwareIndexingReady } from "@/lib/indexing-quality";

describe("Playcode editorial addition", () => {
  it("links from Lovable to a complete, source-backed profile without changing the existing shortlist order", () => {
    const lovable = getSoftware("lovable")!;
    const playcode = getSoftware("playcode")!;

    expect(lovable.alternatives.map((alternative) => alternative.slug)).toEqual([
      "replit", "cursor", "windsurf", "playcode",
    ]);
    expect(isSoftwareIndexingReady(playcode, new Date("2026-10-15T12:00:00Z"))).toBe(true);
    expect(playcode.alternatives.map((alternative) => alternative.slug)).toEqual(["lovable"]);
    expect(playcode.affiliateUrl).toBeUndefined();
  });

  it("keeps paid export and running costs visible without making an unverified app-quota promise", () => {
    const playcode = getSoftware("playcode")!;
    const buyerText = [playcode.description, ...playcode.features, ...playcode.cons!, ...playcode.faq!.map((faq) => faq.answer)].join(" ");

    expect(buyerText).toContain("Code export and custom-domain connection require a paid plan");
    expect(buyerText).toContain("not an all-inclusive operating-cost cap");
    expect(buyerText).toContain("data, configuration and connected services");
    expect(buyerText).toContain("not hands-on testing");
    expect(buyerText).not.toMatch(/(?:up to|unlimited)\s+(?:\d+\s+)?(?:published\s+)?(?:cloud\s+)?(?:apps|projects)/i);
    expect(playcode.pricing?.entryPaid?.annualBillingRequired).toBe(false);
  });
});
