import type { CtaPlacementPerformance } from "@/lib/analytics/cta-performance";

export type CtaPlacementDiagnosis = {
  status: "WAIT" | "WATCH" | "LEAK" | "WORKING";
  action: string;
};

/**
 * A deliberately conservative operating heuristic, not a significance test.
 * We refuse to call a placement a leak from a handful of exposures.
 */
export function diagnoseCtaPlacement(row: CtaPlacementPerformance): CtaPlacementDiagnosis {
  const impressions = row.humanImpressionSessions;
  const clicks = row.humanClickSessionsWithPriorImpression;

  if (impressions < 5) {
    return {
      status: "WAIT",
      action: "Too little classifier-qualified exposure to justify another CTA change. Keep collecting data.",
    };
  }

  if (clicks > 0) {
    return {
      status: "WORKING",
      action: "This placement has produced a human-qualified click after a recorded impression. Prioritize downstream conversion evidence before changing it.",
    };
  }

  if (impressions < 20) {
    return {
      status: "WATCH",
      action: "The CTA has been seen but the sample is still small. Do not add more copy variants yet; collect more exposure.",
    };
  }

  if (row.ctaLocation === "software-page-cta") {
    return {
      status: "LEAK",
      action: "Meaningful human exposure with no matched click. This surface is under the controlled software CTA experiment, so diagnose through the experiment readout rather than changing copy outside it.",
    };
  }

  return {
    status: "LEAK",
    action: "Meaningful human exposure with no matched click. This is a higher-priority CRO surface than creating more traffic or content for the same partner.",
  };
}
