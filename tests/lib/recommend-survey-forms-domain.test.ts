import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRecommendations, isDomainEligible } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import { DOMAIN_META, RECOMMEND_DOMAINS } from "@/lib/recommend/domains";
import { getSlugsForDomainFromEvidence } from "@/data/recommend/domain-evidence";
import { getSoftware } from "@/data/software";

const EXPECTED = ["jotform", "qualtrics", "surveymonkey", "typeform"];

function requireSoftware(slug: string) {
  const software = getSoftware(slug);
  if (!software) throw new Error(`Missing catalog software: ${slug}`);
  return software;
}

describe("survey/forms Recommend domain", () => {
  it("exists as a plain-language buyer need and is automatically available to the wizard", () => {
    expect(RECOMMEND_DOMAINS).toContain("survey_forms");
    expect(DOMAIN_META.survey_forms.label).toBe("Collect responses with surveys or forms");

    const wizardSource = fs.readFileSync(path.join(process.cwd(), "components/recommend/RecommendWizard.tsx"), "utf-8");
    expect(wizardSource).toContain("RECOMMEND_DOMAINS.map");
  });

  it("contains exactly the four products supported by the fresh catalog audit", () => {
    const slugs = [...getSlugsForDomainFromEvidence("survey_forms")].sort();
    expect(slugs).toEqual(EXPECTED);

    const answers = { ...DEFAULT_ANSWERS, primaryNeed: "survey_forms" as const };
    for (const slug of EXPECTED) {
      expect(isDomainEligible(requireSoftware(slug), answers), slug).toBe(true);
    }
  });

  it("returns the four real survey/form products without cross-domain filler", () => {
    const result = getRecommendations(
      { ...DEFAULT_ANSWERS, primaryNeed: "survey_forms" as const },
      10,
    );
    const slugs = result.recommendations.map((recommendation) => recommendation.software.slug).sort();

    expect(slugs).toEqual(EXPECTED);
    expect(result.confidence).not.toBe("none");
  });
});
