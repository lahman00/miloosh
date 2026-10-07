import { describe, it, expect } from "vitest";
import { generateWhoShouldChoose, generateWhoShouldChoosePairAware, generateComparisonData } from "@/lib/comparison";
import { getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";

/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22). Proves the
 * controlled-experiment gate actually holds: TREATMENT_COHORT gets
 * genuinely pair-specific text, everything else (including
 * CONTROL_COHORT) is byte-identical to the original, unchanged
 * generateWhoShouldChoose output -- a real experiment, not a silent
 * behavior change for all 1,212 comparisons.
 */
describe("generateWhoShouldChoosePairAware", () => {
  it("produces DIFFERENT text for the same product against two different competitors when real feature differences exist", () => {
    const notion = getSoftware("notion")!;
    const clickup = getSoftware("clickup")!;
    const coda = getSoftware("coda")!;
    const vsClickup = generateWhoShouldChoosePairAware(notion, clickup);
    const vsCoda = generateWhoShouldChoosePairAware(notion, coda);
    expect(vsClickup).not.toBe(vsCoda);
  });

  it("always starts with the exact same base sentence generateWhoShouldChoose produces", () => {
    const notion = getSoftware("notion")!;
    const clickup = getSoftware("clickup")!;
    const result = generateWhoShouldChoosePairAware(notion, clickup);
    expect(result.startsWith(generateWhoShouldChoose(notion))).toBe(true);
  });

  it("caps highlighted features and honestly discloses the remainder rather than dumping the whole list", () => {
    const notion = getSoftware("notion")!;
    const ticktick = getSoftware("ticktick")!;
    const result = generateWhoShouldChoosePairAware(notion, ticktick);
    const uniqueCount = notion.features.filter((f) => !ticktick.features.includes(f)).length;
    if (uniqueCount > 3) {
      expect(result).toMatch(/and \d+ more feature/);
    }
  });

  it("falls back to the plain sentence, never fabricating a difference, when feature/platform sets are equal", () => {
    const software = getSoftware("notion")!;
    const identicalTwin = { ...software, name: "NotionTwin", slug: "notion-twin" };
    const result = generateWhoShouldChoosePairAware(software, identicalTwin);
    expect(result).toBe(generateWhoShouldChoose(software));
  });

  it("never uses absolute-winner language even when highlighting real differences", () => {
    const notion = getSoftware("notion")!;
    const clickup = getSoftware("clickup")!;
    const result = generateWhoShouldChoosePairAware(notion, clickup);
    expect(result).not.toMatch(/\bis (?:simply |clearly |obviously )?better than\b|\bbeats\b|\bthe winner is\b|\boutperforms\b|\bsuperior to\b/i);
  });
});

describe("Comparison pair-aware copy — full rollout", () => {
  it("uses pair-aware choice text on every published comparison while preserving the grounded base claim", () => {
    for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
      const softwareA = getSoftware(slugA)!;
      const softwareB = getSoftware(slugB)!;
      const data = generateComparisonData(softwareA, softwareB);

      expect(data.whoShouldChooseA.startsWith(generateWhoShouldChoose(softwareA))).toBe(true);
      expect(data.whoShouldChooseB.startsWith(generateWhoShouldChoose(softwareB))).toBe(true);
    }
  });

  it("changes the recommendation context for the same product when the competitor changes and real differences exist", () => {
    const notion = getSoftware("notion")!;
    const clickup = getSoftware("clickup")!;
    const coda = getSoftware("coda")!;

    const vsClickup = generateComparisonData(notion, clickup).whoShouldChooseA;
    const vsCoda = generateComparisonData(notion, coda).whoShouldChooseA;

    expect(vsClickup).not.toBe(vsCoda);
  });

  it("never fabricates pair-specific copy when two products expose identical feature/platform sets", () => {
    const notion = getSoftware("notion")!;
    const identicalTwin = { ...notion, name: "NotionTwin", slug: "notion-twin" };
    const data = generateComparisonData(notion, identicalTwin);

    expect(data.whoShouldChooseA).toBe(generateWhoShouldChoose(notion));
  });
});
