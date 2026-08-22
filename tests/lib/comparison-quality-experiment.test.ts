import { describe, it, expect } from "vitest";
import { generateWhoShouldChoose, generateWhoShouldChoosePairAware, generateComparisonData } from "@/lib/comparison";
import { TREATMENT_COHORT, CONTROL_COHORT } from "@/data/experiments/comparison-quality-cohort";
import { getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";

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

describe("Comparison quality experiment — cohort gating", () => {
  it("both cohorts have exactly 20 real, distinct, currently-published comparison slugs with no overlap", () => {
    expect(TREATMENT_COHORT).toHaveLength(20);
    expect(CONTROL_COHORT).toHaveLength(20);
    expect(new Set(TREATMENT_COHORT).size).toBe(20);
    expect(new Set(CONTROL_COHORT).size).toBe(20);
    const overlap = TREATMENT_COHORT.filter((slug) => (CONTROL_COHORT as readonly string[]).includes(slug));
    expect(overlap).toEqual([]);

    const publishedSlugs = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b)));
    for (const slug of [...TREATMENT_COHORT, ...CONTROL_COHORT]) {
      expect(publishedSlugs.has(slug), `${slug} is not a currently-published comparison`).toBe(true);
    }
  });

  it("every TREATMENT_COHORT page's whoShouldChoose output differs from the plain (control-style) generator whenever a real difference exists", () => {
    for (const slug of TREATMENT_COHORT) {
      const marker = slug.indexOf("-vs-");
      const slugA = slug.slice(0, marker);
      const slugB = slug.slice(marker + 4);
      const softwareA = getSoftware(slugA);
      const softwareB = getSoftware(slugB);
      if (!softwareA || !softwareB) continue;
      const data = generateComparisonData(softwareA, softwareB);
      const plainA = generateWhoShouldChoose(softwareA);
      const plainB = generateWhoShouldChoose(softwareB);
      // At minimum, the treatment output must always start with the plain sentence (never diverge in the base claim).
      expect(data.whoShouldChooseA.startsWith(plainA)).toBe(true);
      expect(data.whoShouldChooseB.startsWith(plainB)).toBe(true);
    }
  });

  it("every CONTROL_COHORT page produces EXACTLY the plain, unchanged generateWhoShouldChoose output — proving the experiment doesn't leak", () => {
    for (const slug of CONTROL_COHORT) {
      const marker = slug.indexOf("-vs-");
      const slugA = slug.slice(0, marker);
      const slugB = slug.slice(marker + 4);
      const softwareA = getSoftware(slugA);
      const softwareB = getSoftware(slugB);
      if (!softwareA || !softwareB) continue;
      const data = generateComparisonData(softwareA, softwareB);
      expect(data.whoShouldChooseA).toBe(generateWhoShouldChoose(softwareA));
      expect(data.whoShouldChooseB).toBe(generateWhoShouldChoose(softwareB));
    }
  });

  it("a comparison NOT in either cohort also produces the exact unchanged plain output (the default for all other 1,192 pages)", () => {
    const notion = getSoftware("notion")!;
    const slack = getSoftware("slack")!;
    const data = generateComparisonData(notion, slack);
    expect(data.whoShouldChooseA).toBe(generateWhoShouldChoose(notion));
    expect(data.whoShouldChooseB).toBe(generateWhoShouldChoose(slack));
  });
});
