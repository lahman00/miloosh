import { describe, expect, it } from "vitest";
import { buildRemediationQueue } from "@/scripts/growth/remediation-queue";
import { isFrozenSlug } from "@/data/growth/frozen-cohorts";
import { readProtectedExperimentSlugs } from "@/scripts/growth/gsc-opportunity-miner";

/**
 * GOOGLE INDEXATION FACTORY, WAVE 2 mission (2026-09-26) — a quality-
 * floor gate: a real, cached-GSC-demand page (>=100 impressions in the
 * committed priority-snapshot.json window) should never sit at factual-
 * depth bucket D (the worst tier, <40/100) unless it's a deliberately
 * frozen control page or an active revenue experiment, where a low score
 * is an intentional, untouched baseline rather than a bug.
 *
 * Deliberately demand-gated at a real threshold (not "any D-tier page is
 * a failure") so this never breaks the build over the catalog's many
 * obscure, zero-demand, genuinely incomplete products -- those are
 * legitimate remediation-queue candidates, not gate violations.
 */
describe("quality floor: no unprotected high-demand page sits at factual-depth D", () => {
  it("has zero non-frozen, non-experiment D-tier pages with >=100 real impressions", () => {
    const protectedSlugs = readProtectedExperimentSlugs();
    const queue = buildRemediationQueue(354);
    const violations = queue.filter(
      (c) => c.factualDepth.bucket === "D" && c.gscImpressions >= 100 && !isFrozenSlug(c.slug) && !protectedSlugs.has(c.slug)
    );
    expect(
      violations.map((v) => `${v.slug} (${v.gscImpressions} impressions, depth ${v.factualDepth.score})`),
      "high-demand pages below are D-tier with no protection reason -- give them real pricing/cons or add them to a treatment cohort"
    ).toEqual([]);
  });
});
