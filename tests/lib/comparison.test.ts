import { describe, it, expect } from "vitest";
import { generateComparisonIntro } from "@/lib/comparison";
import type { Software } from "@/data/software";

function software(overrides: Partial<Software>): Software {
  return {
    slug: "x",
    name: "X",
    category: "project-management",
    description: "X is a tool.",
    bestFor: "teams",
    website: "https://x.example",
    pricingUrl: "https://x.example/pricing",
    platforms: ["Web"],
    features: ["a", "b"],
    alternatives: [],
    ...overrides,
  } as Software;
}

describe("generateComparisonIntro (regression: the second sentence used to be identical boilerplate on all 1,107 comparison pages)", () => {
  it("grounds the second sentence in each product's real feature and platform counts", () => {
    const a = software({ name: "Notion", features: ["a", "b", "c"], platforms: ["Web", "macOS"] });
    const b = software({ name: "ClickUp", features: ["a", "b"], platforms: ["Web"] });
    const intro = generateComparisonIntro(a, b);
    expect(intro).toContain("Notion lists 3 features across 2 platforms");
    expect(intro).toContain("ClickUp lists 2 features across 1 platform");
  });

  it("produces genuinely different intros for two different pairs with different feature/platform counts, even in the same category", () => {
    const a1 = software({ name: "Notion", features: ["a", "b", "c"], platforms: ["Web", "macOS"] });
    const b1 = software({ name: "ClickUp", features: ["a", "b"], platforms: ["Web"] });
    const a2 = software({ name: "Airtable", features: ["a", "b", "c", "d"], platforms: ["Web", "iOS", "Android"] });
    const b2 = software({ name: "Coda", features: ["a"], platforms: ["Web"] });

    const introA = generateComparisonIntro(a1, b1);
    const introB = generateComparisonIntro(a2, b2);
    expect(introA).not.toBe(introB);
  });

  it("still varies the category phrase by real category data for cross-category pairs", () => {
    const a = software({ name: "Notion", category: "productivity" });
    const b = software({ name: "Zapier", category: "automation" });
    const intro = generateComparisonIntro(a, b);
    expect(intro).toContain("choosing between");
  });

  it("uses singular 'platform' for exactly one platform", () => {
    const a = software({ name: "A", platforms: ["Web"] });
    const b = software({ name: "B", platforms: ["Web", "macOS"] });
    const intro = generateComparisonIntro(a, b);
    expect(intro).toContain("A lists 2 features across 1 platform;");
    expect(intro).toContain("B lists 2 features across 2 platforms");
  });
});


describe("comparison constraints disclosure", () => {
  it("does not claim that vendors never document product limitations", async () => {
    const { CONS_DISCLOSURE } = await import("@/lib/comparison");
    expect(CONS_DISCLOSURE).toContain("missing or differently worded vendor marketing copy");
    expect(CONS_DISCLOSURE).toContain("documented plan limits");
    expect(CONS_DISCLOSURE).not.toContain("No vendor's official site documents");
  });
});


describe("pricing model labels", () => {
  it("renders pricing models as buyer-facing labels rather than raw schema values", async () => {
    const { generateComparisonRows } = await import("@/lib/comparison");
    const { getSoftware } = await import("@/data/software");
    const shopify = getSoftware("shopify")!;
    const woo = getSoftware("woocommerce")!;
    const row = generateComparisonRows(shopify, woo).find((item) => item.label === "Pricing model");
    expect(row).toEqual({ label: "Pricing model", a: "Paid plans", b: "Open source" });
  });
});
