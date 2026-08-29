import {
  AFFILIATE_PROGRAMS,
  getAffiliateProgram as getAffiliateProgramBySlug,
  type AffiliateProgramInfo,
} from "@/data/revenue/affiliate-programs";

/**
 * Sprint 8 Phase 4 — Affiliate Manager. A thin, real read layer over the
 * Phase 1 research dataset (data/revenue/affiliate-programs.ts). This is
 * separate from lib/affiliate.ts (which builds the actual CTA link/rel/
 * tracking-param mechanics for a software entry's `affiliate_url` field):
 * this module only answers "what do we know about this vendor's program,"
 * not "what URL should the button use."
 *
 * Sprint 9 extends it to also answer "is this vendor's link actually
 * activated, and with what URL" — re-exported here from
 * lib/revenue/affiliate-activation.ts so callers have one import surface.
 */

export {
  getAffiliateActivation,
  getTierASlugs,
  getTierAActivationStatus,
  hasCurrentActiveRelationship,
  type AffiliateActivation,
  type AffiliateActivationSource,
} from "@/lib/revenue/affiliate-activation";

export function getAffiliateProgram(slug: string): AffiliateProgramInfo | undefined {
  return getAffiliateProgramBySlug(slug);
}

export function getAllAffiliatePrograms(): AffiliateProgramInfo[] {
  return AFFILIATE_PROGRAMS;
}

/** Programs confirmed to exist on an official page — the only ones safe to act on commercially. */
export function getConfirmedAffiliatePrograms(): AffiliateProgramInfo[] {
  return AFFILIATE_PROGRAMS.filter((program) => program.programExists === "yes");
}

/** Confirmed-absent programs — useful to rule out wasted outreach. */
export function getConfirmedNoAffiliatePrograms(): AffiliateProgramInfo[] {
  return AFFILIATE_PROGRAMS.filter((program) => program.programExists === "no");
}

/** Still needs manual follow-up (couldn't be confirmed either way from an official page). */
export function getUnresolvedAffiliatePrograms(): AffiliateProgramInfo[] {
  return AFFILIATE_PROGRAMS.filter((program) => program.programExists === "unknown");
}

export function countAffiliateProgramsByStatus(): Record<AffiliateProgramInfo["programExists"], number> {
  return {
    yes: getConfirmedAffiliatePrograms().length,
    no: getConfirmedNoAffiliatePrograms().length,
    unknown: getUnresolvedAffiliatePrograms().length,
  };
}
