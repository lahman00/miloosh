import { describe, expect, it } from "vitest";
import { getRecommendations, isDomainEligible } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import { getSoftware } from "@/data/software";

function requireSoftware(slug: string) {
  const software = getSoftware(slug);
  if (!software) throw new Error(`Missing catalog software: ${slug}`);
  return software;
}

describe("Recommend email-marketing current editorial truth", () => {
  it("treats MailerLite and Omnisend as email-marketing products from their sourced catalog evidence", () => {
    const answers = { ...DEFAULT_ANSWERS, primaryNeed: "email_marketing" as const };

    expect(isDomainEligible(requireSoftware("mailerlite"), answers)).toBe(true);
    expect(isDomainEligible(requireSoftware("omnisend"), answers)).toBe(true);
  });

  it("includes MailerLite and Omnisend in the actual email-marketing recommendation candidate set", () => {
    const answers = { ...DEFAULT_ANSWERS, primaryNeed: "email_marketing" as const };
    const result = getRecommendations(answers, 50);
    const slugs = result.recommendations.map((recommendation) => recommendation.software.slug);

    expect(slugs).toContain("mailerlite");
    expect(slugs).toContain("omnisend");
  });
});
