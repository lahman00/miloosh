import { z } from "zod";
import type { PartnerExposure } from "./affiliate-revenue-agent";
import type { PageEvaluation } from "./google-recovery-agent";
import type { GuardianReport } from "./guardian";
import { pathOf } from "./urls";

/**
 * Premium Page Agent: the typed handoff to the existing
 * `miloosh-money-page-upgrader` skill. No new page engine exists or is needed;
 * this builds the exact input that skill requires and refuses to build it for a
 * page that has not earned it.
 */

export const pageUpgradeHandoffSchema = z.object({
  schemaVersion: z.literal(1),
  url: z.string().url(),
  checkoutSha: z.string().min(7),
  hypothesis: z.string().min(10),
  baseline: z.object({ historicalImpressions: z.number().int().nonnegative(), recentImpressions: z.number().int().nonnegative(), window: z.string() }),
  protection: z.object({ pageVerdict: z.literal("EDITABLE"), derivedUrls: z.number().int().nonnegative(), derivedAllEditable: z.literal(true) }),
  partner: z.object({
    /** Every active partner whose call to action appears on the page. */
    slugs: z.array(z.string()),
    /** The subset that appears only because the page shows a call to action for that other product. */
    otherCtaSlugs: z.array(z.string()),
    payoutReadiness: z.array(z.object({ slug: z.string(), readiness: z.string() })),
  }),
  mustPreserve: z.array(z.string()).min(1),
  acceptanceChecks: z.array(z.string()).min(1),
  releaseDependency: z.string(),
  measurement: z.object({ clockStart: z.string(), reviewWindows: z.array(z.number().int().positive()) }),
});

export type PageUpgradeHandoff = z.infer<typeof pageUpgradeHandoffSchema>;

export type HandoffResult = { status: "READY"; handoff: PageUpgradeHandoff } | { status: "NOT_READY"; reasons: string[] };

export function buildPageUpgradeHandoff(evaluation: PageEvaluation, exposure: PartnerExposure, guardian: GuardianReport | null, checkoutSha: string): HandoffResult {
  const partners = [...exposure.own, ...exposure.viaOtherCtas];
  const reasons: string[] = [];
  if (!evaluation.eligible) {
    reasons.push(`Not every gate passed for ${pathOf(evaluation.url)}: ${evaluation.gates.filter((g) => g.status !== "PASS").map((g) => `${g.id}=${g.status}`).join(", ")}.`);
  }
  if (evaluation.protection.verdict !== "EDITABLE") reasons.push(`The page is ${evaluation.protection.verdict}.`);
  if (evaluation.derived.blocking.length > 0) reasons.push(`${evaluation.derived.blocking.length} derived page(s) are not editable.`);
  if (evaluation.historical.impressions === null || evaluation.recent.impressions === null) reasons.push("Demand is not measured on both sides.");
  if (reasons.length > 0) return { status: "NOT_READY", reasons };

  const handoff = pageUpgradeHandoffSchema.parse({
    schemaVersion: 1,
    url: evaluation.url,
    checkoutSha,
    hypothesis: `Adding verified decision facts to ${pathOf(evaluation.url)} (pricing and limits with billing basis, fit and non-fit, one relevant comparison) will give Google a more useful page to re-evaluate; it is a hypothesis about this page only, not a ranking promise.`,
    baseline: {
      historicalImpressions: evaluation.historical.impressions,
      recentImpressions: evaluation.recent.impressions,
      window: `${evaluation.historical.window?.start}..${evaluation.historical.window?.end} versus ${evaluation.recent.window?.start}..${evaluation.recent.window?.end}`,
    },
    protection: { pageVerdict: "EDITABLE", derivedUrls: evaluation.derived.total, derivedAllEditable: true },
    partner: {
      slugs: partners.map((p) => p.slug),
      otherCtaSlugs: exposure.viaOtherCtas.map((p) => p.slug),
      payoutReadiness: partners.map((p) => ({ slug: p.slug, readiness: p.payout.readiness })),
    },
    mustPreserve: ["existing tracked CTA components and sponsored rel", "affiliate disclosure", "canonical URL and robots directives", "every protected or observed page's rendered output"],
    acceptanceChecks: ["protected precheck before and after the edit", "validate:data, tests, lint, typecheck and build compared with the base-commit baseline", "rendered HTML of every derived page unchanged unless intended", "no new failure introduced relative to the baseline"],
    releaseDependency: guardian ? `Release Guardian verdict: ${guardian.verdict}` : "Release Guardian not run",
    measurement: { clockStart: "first observed Google recrawl after release, not the deployment date", reviewWindows: [14, 28] },
  });
  return { status: "READY", handoff };
}
