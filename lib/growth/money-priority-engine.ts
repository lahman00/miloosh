import { getSoftware } from "@/data/software";
import { getComparisonsInvolving } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { classifySessions } from "@/lib/analytics/human-classification";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

/**
 * MILOOSH AUTONOMOUS REVENUE COMPANY BUILD mission (2026-08-24), Phase 2 —
 * a real, evidence-based ranking of every currently-active affiliate
 * partner, computed only from data this codebase actually has. Every
 * field is either a real derived number or the literal "UNKNOWN" /
 * "NOT_MEASURED" -- never a zero standing in for missing data, per the
 * mission's explicit rule ("Never replace missing data with zero unless
 * zero is directly proved").
 *
 * This is a snapshot function: it takes the real event/opportunity data
 * as arguments rather than reading storage itself, so it stays pure and
 * testable, and so a caller can pass either real production data or
 * synthetic fixtures without this module knowing the difference.
 */

export type RevenueReadiness = "READY" | "PARTIAL" | "NOT_READY";

export type SeoOpportunityRow = {
  relatedSoftware: string[];
  query: string;
  gsc: { impressions: number; clicks: number; position: number };
};

export type PartnerOpportunity = {
  slug: string;
  name: string;

  eligibleHumanPageSessions: number;
  eligibleHumanAffiliateClicks: number;
  uniqueEligibleHumanClickers: number;

  /**
   * A real, separate signal from lib/revenue/events.ts's non-personal
   * click log. Deliberately NEVER merged into eligibleHumanAffiliateClicks
   * or the score: that log carries no visitorId/sessionId, so a click
   * recorded there cannot be joined against the human-classification
   * buckets the way a first-party outbound_click event can.
   */
  revenueLogRealAffiliateClicks: number;
  revenueLogTestClicks: number;

  gscImpressions: number | "NOT_MEASURED";
  gscClicks: number | "NOT_MEASURED";
  gscAvgPosition: number | "NOT_MEASURED";
  commercialIntentQueries: string[];

  comparisonCoverage: number;
  hasDecisionGuideCoverage: boolean;
  hasPricingCtaCoverage: boolean;

  commissionModel: string;
  recurrence: string;
  cookieWindow: string;
  restrictions: string | null;

  contentFreshnessDate: string | "UNKNOWN";
  revenueReadiness: RevenueReadiness;
  currentBlocker: string | null;
  nextIntervention: string;

  score: number;
  scoreBreakdown: Record<string, number>;
};

const ELIGIBLE_BUCKETS = new Set(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN"]);
const PRE_CLICK_FUNNEL_TYPES = new Set<FirstPartyEvent["type"]>([
  "page_view",
  "engaged_view",
  "software_view",
  "comparison_view",
  "category_view",
  "guide_view",
  "recommend_use",
  "internal_cta_click",
  "recommend_started",
  "recommend_need_selected",
  "recommend_completed",
  "recommend_result_viewed",
  "recommend_product_open",
  "recommend_comparison_open",
  "cta_impression",
]);

function findLedgerEntry(slug: string) {
  return CURRENT_AFFILIATE_LEDGER.find((p) => p.productSlugs.includes(slug));
}

function hasDecisionGuideCoverage(slug: string): boolean {
  if (ALTERNATIVE_GUIDES[slug]) return true;
  return Object.values(ALTERNATIVE_GUIDES).some((guide) => guide.decisions.some((d) => d.alternativeSlug === slug));
}

function hasPricingCtaCoverage(slug: string): boolean {
  const software = getSoftware(slug);
  if (!software?.pricing) return false;
  return Boolean(software.pricing.status || software.pricing.entryPaid || (software.pricing.tiers && software.pricing.tiers.length > 0));
}

/** Rough numeric hint from a commission-model string. Returns null rather than guessing when no percentage is present. */
function parseCommissionPercent(model: string): number | null {
  const match = model.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number.parseFloat(match[1]!) : null;
}

/**
 * An outbound POST by itself is not enough to prove a human commercial path:
 * the public endpoint can be called directly. Require at least one earlier
 * funnel event in the same session before an affiliate click is eligible for
 * human-qualified revenue scoring. This complements, rather than replaces,
 * the canonical session classifier.
 */
function hasPreClickFunnelEvidence(click: Extract<FirstPartyEvent, { type: "outbound_click" }>, events: readonly FirstPartyEvent[]): boolean {
  return events.some(
    (event) =>
      event.sessionId === click.sessionId &&
      event.timestamp <= click.timestamp &&
      event.type !== "outbound_click" &&
      PRE_CLICK_FUNNEL_TYPES.has(event.type) &&
      !event.isTest,
  );
}

export function computeMoneyPriorityQueue(
  events: readonly FirstPartyEvent[],
  seoOpportunities: readonly SeoOpportunityRow[],
  revenueLogEvents: readonly StoredOutboundEvent[] = [],
): PartnerOpportunity[] {
  const classifications = classifySessions(events);
  const eligibleSessionIds = new Set(classifications.filter((c) => ELIGIBLE_BUCKETS.has(c.bucket)).map((c) => c.sessionId));

  return ACTIVE_PARTNERS.map((partner) => {
    const slug = partner.slug;
    const software = getSoftware(slug);
    const name = software?.name ?? slug;

    const pagePath = `/software/${slug}`;
    const eligibleSessionsOnPage = new Set(
      events
        .filter((e) => e.type === "page_view" && e.path === pagePath && eligibleSessionIds.has(e.sessionId))
        .map((e) => e.sessionId),
    );

    const affiliateClickEvents = events.filter(
      (e): e is Extract<FirstPartyEvent, { type: "outbound_click" }> =>
        e.type === "outbound_click" && e.softwareSlug === slug && e.destination === "affiliate" && !e.isTest,
    );
    const eligibleAffiliateClicks = affiliateClickEvents.filter(
      (e) => eligibleSessionIds.has(e.sessionId) && hasPreClickFunnelEvidence(e, events),
    );
    const uniqueEligibleClickers = new Set(eligibleAffiliateClicks.map((e) => e.visitorId));

    const revenueLogEventsForSlug = revenueLogEvents.filter((e) => e.softwareSlug === slug && e.type === "affiliate_link_click");
    const revenueLogRealAffiliateClicks = revenueLogEventsForSlug.filter((e) => !e.isTest).length;
    const revenueLogTestClicks = revenueLogEventsForSlug.filter((e) => e.isTest).length;

    const seoRows = seoOpportunities.filter((o) => o.relatedSoftware.includes(slug));
    const gscImpressions = seoRows.length > 0 ? seoRows.reduce((sum, o) => sum + o.gsc.impressions, 0) : ("NOT_MEASURED" as const);
    const gscClicks = seoRows.length > 0 ? seoRows.reduce((sum, o) => sum + o.gsc.clicks, 0) : ("NOT_MEASURED" as const);
    const gscAvgPosition =
      seoRows.length > 0 ? Math.round((seoRows.reduce((sum, o) => sum + o.gsc.position, 0) / seoRows.length) * 10) / 10 : ("NOT_MEASURED" as const);

    const comparisonCoverage = getComparisonsInvolving(slug).length;
    const guideCoverage = hasDecisionGuideCoverage(slug);
    const pricingCoverage = hasPricingCtaCoverage(slug);

    const ledgerEntry = findLedgerEntry(slug);
    const commissionModel = ledgerEntry?.commissionModel ?? "UNKNOWN";
    const recurrence = "UNKNOWN";
    const cookieWindow = ledgerEntry?.cookieWindow ?? "UNKNOWN";
    const restrictions = ledgerEntry?.eligibility ?? null;

    const contentFreshnessDate = software?.accessedAt ?? "UNKNOWN";

    const hasMeasuredSearchDemand = typeof gscImpressions === "number" && gscImpressions > 0;
    const hasMeasuredSearchVisits = typeof gscClicks === "number" && gscClicks > 0;
    const hasRealDemand = eligibleSessionsOnPage.size > 0 || hasMeasuredSearchDemand;
    const hasCompletePath = pricingCoverage && (comparisonCoverage > 0 || guideCoverage);
    const revenueReadiness: RevenueReadiness = uniqueEligibleClickers.size > 0 ? "READY" : hasRealDemand && hasCompletePath ? "PARTIAL" : "NOT_READY";

    let currentBlocker: string | null = null;
    let nextIntervention: string;
    if (uniqueEligibleClickers.size > 0) {
      nextIntervention = "Already producing classifier-qualified affiliate clicks with prior funnel evidence -- monitor for conversion evidence from the network.";
    } else if (!hasRealDemand) {
      currentBlocker = "No observed eligible-human demand (no page sessions, no measured GSC impressions).";
      nextIntervention = "Needs a real distribution or search-demand source before further content investment is justified.";
    } else if (!pricingCoverage) {
      currentBlocker = "No verified pricing data, so PricingSection (and its CTA) never renders.";
      nextIntervention = `Verify ${name}'s pricing against its own official page.`;
    } else if (comparisonCoverage === 0 && !guideCoverage) {
      currentBlocker = "Real demand exists but no comparison or Decision Guide routes a buyer to a commercial decision.";
      nextIntervention = "Build one comparison or Decision Guide entry grounded in this product's real, sourced alternatives.";
    } else if (hasMeasuredSearchDemand && !hasMeasuredSearchVisits && eligibleSessionsOnPage.size === 0) {
      currentBlocker = "Google is showing Miloosh for commercial queries, but measured GSC clicks are still zero.";
      nextIntervention = `Improve ${name}'s search-result CTR and ranking before adding more content surface: tighten title/meta intent match, strengthen internal links from relevant authority pages, and re-check the queries already earning impressions.`;
    } else if (hasMeasuredSearchVisits && eligibleSessionsOnPage.size === 0) {
      currentBlocker = "Measured GSC clicks exist, but no classifier-qualified software-page session is joining to them.";
      nextIntervention = `Audit ${name}'s landing path and first-party session capture before buying or creating more traffic; prove where the measured search visits enter and whether they engage.`;
    } else if (eligibleSessionsOnPage.size > 0) {
      currentBlocker = "Classifier-qualified visitors reach the software page, but none has produced a qualified affiliate click.";
      nextIntervention = `Run decision-path CRO on ${name}: inspect CTA impressions and placement, sharpen buyer-facing CTA copy, and strengthen the nearest comparison/guide handoff instead of chasing more traffic first.`;
    } else {
      nextIntervention = "Path is complete; needs real distribution to generate eligible-human traffic.";
    }

    const scoreBreakdown: Record<string, number> = {};
    scoreBreakdown.demandSessions = Math.min(20, eligibleSessionsOnPage.size * 4);
    scoreBreakdown.demandImpressions = typeof gscImpressions === "number" ? Math.min(20, Math.round(Math.log2(gscImpressions + 1) * 3)) : 0;
    scoreBreakdown.commercialIntentCoverage = Math.min(15, comparisonCoverage * 3) + (guideCoverage ? 10 : 0);
    scoreBreakdown.pricingCtaSurface = pricingCoverage ? 10 : 0;
    const commissionPercent = parseCommissionPercent(commissionModel);
    scoreBreakdown.commissionStrength = commissionPercent !== null ? Math.min(10, Math.round(commissionPercent / 5)) : 0;
    scoreBreakdown.provenClicks = Math.min(15, uniqueEligibleClickers.size * 15);
    scoreBreakdown.shortPathBonus = hasCompletePath ? 5 : 0;

    const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

    return {
      slug,
      name,
      eligibleHumanPageSessions: eligibleSessionsOnPage.size,
      eligibleHumanAffiliateClicks: eligibleAffiliateClicks.length,
      uniqueEligibleHumanClickers: uniqueEligibleClickers.size,
      revenueLogRealAffiliateClicks,
      revenueLogTestClicks,
      gscImpressions,
      gscClicks,
      gscAvgPosition,
      commercialIntentQueries: seoRows.map((o) => o.query),
      comparisonCoverage,
      hasDecisionGuideCoverage: guideCoverage,
      hasPricingCtaCoverage: pricingCoverage,
      commissionModel,
      recurrence,
      cookieWindow,
      restrictions,
      contentFreshnessDate,
      revenueReadiness,
      currentBlocker,
      nextIntervention,
      score,
      scoreBreakdown,
    };
  }).sort((a, b) => b.score - a.score);
}
