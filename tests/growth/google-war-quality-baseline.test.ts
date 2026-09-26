import { expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { scoreFactualDepth } from "@/scripts/growth/factual-depth-audit";
import { commercialQualityRegressions } from "@/lib/google-war/quality";
import baseline from "@/data/growth/google-war/quality-baseline.json";

it("retains A/B factual-field completeness for the frozen prioritized software cohort", () => {
  expect(Object.keys(baseline).length).toBeGreaterThan(0);
  const current = getAllSoftware().map((s) => ({
    path: `/software/${s.slug}`,
    bucket: scoreFactualDepth(s).bucket,
  }));
  expect(commercialQualityRegressions(current, baseline)).toEqual([]);
});
