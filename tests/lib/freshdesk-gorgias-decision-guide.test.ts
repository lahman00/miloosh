import { describe, expect, it } from "vitest";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";

describe("Freshdesk alternative decision guide", () => {
  it("includes the evidence-backed ecommerce path to Gorgias", () => {
    const guide = ALTERNATIVE_GUIDES.freshdesk;
    const gorgiasDecision = guide.decisions.find((decision) => decision.alternativeSlug === "gorgias");

    expect(gorgiasDecision).toBeDefined();
    expect(gorgiasDecision?.comparisonSlug).toBe("freshdesk-vs-gorgias");
    expect(gorgiasDecision?.fit.toLowerCase()).toContain("ecommerce");
    expect(guide.evidenceSources).toContain("https://www.gorgias.com");
  });
});
