import { describe, expect, it } from "vitest";
import { getRecommendations } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import type { RecommendationAnswers } from "@/lib/recommend/types";

const answers = (o: Partial<RecommendationAnswers>): RecommendationAnswers => ({ ...DEFAULT_ANSWERS, ...o });

describe("confidence when the buyer picked no need", () => {
  it("is never high for a browse-only request, whatever the other answers", () => {
    for (const o of [
      { teamSize: "small", budget: "free" },
      { requiredIntegrations: ["Miro"] },
      { teamSize: "solo", needsAi: true },
      { companyStage: "startup", difficultyPreference: "simple" },
    ] as Array<Partial<RecommendationAnswers>>) {
      const r = getRecommendations(answers({ primaryNeed: null, ...o }));
      expect(r.confidence, JSON.stringify(o)).not.toBe("high");
      if (r.recommendations.length > 0) {
        expect(r.confidence).toBe("low");
        expect(r.confidenceNote).toContain("Pick a need");
      }
    }
  });

  it("still reports high confidence for a real need with discriminating answers", () => {
    const r = getRecommendations(answers({ primaryNeed: "crm", teamSize: "small" }));
    expect(r.confidence).toBe("high");
    expect(r.confidenceNote).toBeNull();
  });
});
