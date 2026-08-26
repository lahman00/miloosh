import type { Software } from "@/data/software";

/**
 * Plain-language outbound CTA copy for recommendation results.
 *
 * This helper deliberately knows nothing about affiliate status, payout state,
 * commission economics, or ranking. It only reads verified product pricing
 * evidence. The outbound destination continues to be resolved separately by
 * lib/affiliate.ts, so copy cannot influence eligibility or score.
 */
export function getRecommendationVendorCtaLabel(software: Software): string {
  const freeTrial = software.pricing?.freeTrial;

  if (freeTrial?.available) {
    const days = freeTrial.days;
    if (typeof days === "number" && Number.isInteger(days) && days > 0) {
      return `Start ${days}-day free trial`;
    }
    return "Start free trial";
  }

  return `Visit ${software.name}`;
}
