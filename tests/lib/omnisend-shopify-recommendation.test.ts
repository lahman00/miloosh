import { describe, expect, it } from "vitest";
import { getRecommendations } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import { getSoftware } from "@/data/software";

const answers = {
  ...DEFAULT_ANSWERS,
  primaryNeed: "email_marketing" as const,
  teamSize: "small" as const,
  requiredIntegrations: ["Shopify"],
};

describe("Omnisend Shopify recommendation evidence", () => {
  it("stores Shopify as a sourced Omnisend feature rather than inferred fit", () => {
    const omnisend = getSoftware("omnisend");
    expect(omnisend).toBeDefined();
    expect(omnisend?.features.some((feature) => /Shopify/i.test(feature))).toBe(true);
    expect(omnisend?.sources).toContain(
      "https://support.omnisend.com/en/articles/3175406-connect-your-shopify-store-to-omnisend",
    );
  });

  it("lets the neutral scoring engine surface Omnisend for email marketing plus Shopify", () => {
    const result = getRecommendations(answers, 3);
    const slugs = result.recommendations.map((recommendation) => recommendation.software.slug);

    expect(slugs).toContain("omnisend");
    const omnisend = result.recommendations.find((recommendation) => recommendation.software.slug === "omnisend");
    expect(omnisend?.scoring.factors.some((factor) => factor.label === 'Mentions "Shopify"' && factor.points > 0)).toBe(true);
  });
});
