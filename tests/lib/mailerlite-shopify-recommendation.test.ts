import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import { scoreSoftwareForAnswers } from "@/lib/recommend/scoring";

const answers = {
  ...DEFAULT_ANSWERS,
  primaryNeed: "email_marketing" as const,
  requiredIntegrations: ["Shopify"],
};

describe("MailerLite Shopify recommendation evidence", () => {
  it("stores Shopify as sourced product evidence", () => {
    const mailerlite = getSoftware("mailerlite");
    expect(mailerlite).toBeDefined();
    expect(mailerlite?.features.some((feature) => /Shopify/i.test(feature))).toBe(true);
    expect(mailerlite?.sources).toContain(
      "https://www.mailerlite.com/help/how-to-set-up-the-mailerlite-integration-for-shopify",
    );
  });

  it("awards Shopify integration credit through the same neutral scoring rule used for every product", () => {
    const mailerlite = getSoftware("mailerlite");
    if (!mailerlite) throw new Error("MailerLite missing from catalog");

    const score = scoreSoftwareForAnswers(mailerlite, answers);
    expect(
      score.factors.some(
        (factor) => factor.label === 'Mentions "Shopify"' && factor.points > 0,
      ),
    ).toBe(true);
  });
});
