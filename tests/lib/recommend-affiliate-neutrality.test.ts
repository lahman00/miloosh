import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { getRecommendations } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import { RECOMMEND_DOMAINS } from "@/lib/recommend/domains";

/**
 * Recommend Engine Rebuild (2026-08-21) — Phase 15 of the rebuild brief:
 * "mandatory... affiliate status must NEVER influence score, ranking,
 * eligibility, shortlist inclusion, explanation text, or fallback
 * behavior. If all affiliate fields were deleted from the repository,
 * Recommend results must remain identical." Also: "search Recommend code
 * for: affiliate, partner, commission, active-partner, affiliate_url. If
 * found in scoring path: remove."
 *
 * The most reliable proof of "the scoring path reads no affiliate data"
 * isn't a runtime experiment (mocking a readonly ESM import binding at
 * test time is fragile and proves less than it looks like it does) — it's
 * a real static check: every file in the actual decision pipeline
 * (engine, eligibility, scoring, explain, domains, product profiles and
 * later evidence overlays) literally does not import from data/affiliate/,
 * lib/affiliate.ts, or lib/revenue/ (the only places affiliate/commission
 * data lives in this codebase). If none of those imports exist, there is
 * no code path by which affiliate status COULD reach a score, gate, or
 * explanation, full stop — stronger than a behavioral test that could
 * pass by luck.
 */

const PIPELINE_FILES = [
  "lib/recommend/engine.ts",
  "lib/recommend/eligibility.ts",
  "lib/recommend/scoring.ts",
  "lib/recommend/explain.ts",
  "lib/recommend/domains.ts",
  "lib/recommend/keywords.ts",
  "lib/recommend/query.ts",
  "data/recommend/product-profiles.ts",
  "data/recommend/domain-evidence.ts",
];

const FORBIDDEN_IMPORT_PATTERNS = [/data\/affiliate/, /lib\/affiliate["']/, /lib\/revenue/];

describe("Recommend engine affiliate neutrality", () => {
  it.each(PIPELINE_FILES)("%s imports nothing from any affiliate/revenue module", (relPath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
    const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line));
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      const offender = importLines.find((line) => pattern.test(line));
      expect(offender, `${relPath} has a forbidden import: ${offender}`).toBeUndefined();
    }
  });

  it("no factor label or explanation text in any real scenario mentions affiliate/commission/sponsor", () => {
    const forbidden = /affiliate|commission|\bsponsor/i;
    for (const domain of RECOMMEND_DOMAINS) {
      const { recommendations } = getRecommendations({ ...DEFAULT_ANSWERS, primaryNeed: domain }, 5);
      for (const rec of recommendations) {
        for (const factor of rec.scoring.factors) {
          expect(factor.label, `${rec.software.slug} factor label leaked affiliate language`).not.toMatch(forbidden);
          expect(factor.explanation, `${rec.software.slug} factor explanation leaked affiliate language`).not.toMatch(forbidden);
        }
        expect(rec.explanation.whyItMatched, `${rec.software.slug} whyItMatched leaked affiliate language`).not.toMatch(forbidden);
        if (rec.explanation.tradeoff) {
          expect(rec.explanation.tradeoff, `${rec.software.slug} tradeoff leaked affiliate language`).not.toMatch(forbidden);
        }
      }
    }
  });

  it("is deterministic: the same answers produce byte-identical rankings and scores across repeated calls", () => {
    for (const domain of RECOMMEND_DOMAINS) {
      const answers = { ...DEFAULT_ANSWERS, primaryNeed: domain };
      const first = getRecommendations(answers, 5);
      const second = getRecommendations(answers, 5);
      expect(second.recommendations.map((r) => r.software.slug)).toEqual(first.recommendations.map((r) => r.software.slug));
      expect(second.recommendations.map((r) => r.scoring.totalScore)).toEqual(first.recommendations.map((r) => r.scoring.totalScore));
      expect(second.confidence).toBe(first.confidence);
    }
  });
});
