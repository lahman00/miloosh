import type { IndexState } from "./evidence";
export type Group =
  | "CRAWL_RECOVERY"
  | "INDEXATION_RECOVERY"
  | "RANKING_STRIKING_DISTANCE"
  | "RANKING_OPPORTUNITY"
  | "CTR_OPPORTUNITY"
  | "INTERNAL_AUTHORITY_GAP"
  | "CONTENT_DEPTH_GAP"
  | "INTENT_FRAGMENTATION"
  | "EXPERIMENT_PROTECTED"
  | "HOLD";
export type Signals = {
  impressions: number | null;
  clicks: number | null;
  position: number | null;
  ctr: number | null;
  index: IndexState;
  bucket: string | null;
  inbound: number | null;
  depth: number | null;
  protected: boolean;
  intentConflict: boolean;
  activeAffiliate: boolean;
};
export function prioritize(s: Signals): {
  groups: Group[];
  action: string;
  reasons: string[];
} {
  if (s.protected)
    return {
      groups: ["EXPERIMENT_PROTECTED"],
      action: "Observe only; do not change content or links",
      reasons: [
        "Active experiment, cooldown or concurrent treatment/control reservation",
      ],
    };
  const groups: Group[] = [],
    reasons: string[] = [];
  const demand = s.impressions !== null && s.impressions > 0;
  // Google War Phase III (2026-09-26) — Part 41: DISCOVERED_NOT_INDEXED
  // (Google has not crawled the URL) and CRAWLED_NOT_INDEXED (Google crawled
  // it and excluded it) are two structurally different problems with
  // different root causes — a crawl-priority/discovery gap versus an
  // index-selection/content-quality gap. They must never share one group.
  if (s.index === "DISCOVERED_NOT_INDEXED") {
    groups.push("CRAWL_RECOVERY");
    reasons.push(
      "Google has not recorded a crawl of this URL at all; this is a discovery/crawl-priority signal, not a content-quality signal",
    );
  }
  if (s.index === "CRAWLED_NOT_INDEXED") {
    groups.push("INDEXATION_RECOVERY");
    reasons.push(
      "Recorded crawl without index inclusion; this is NOT evidence of a technical failure",
    );
  }
  if (
    s.index === "INDEXED" &&
    demand &&
    s.position !== null &&
    s.position >= 8 &&
    s.position <= 30
  ) {
    groups.push("RANKING_STRIKING_DISTANCE");
    reasons.push(
      `Indexed, measured average position ${s.position} (8-30 striking distance); may produce traffic faster than indexation recovery`,
    );
  }
  if (
    s.index === "INDEXED" &&
    demand &&
    s.position !== null &&
    s.position > 20
  ) {
    groups.push("RANKING_OPPORTUNITY");
    reasons.push(
      `Indexed, measured average position ${s.position}; not a proven title/CTR problem`,
    );
  }
  if (
    s.index === "INDEXED" &&
    (s.impressions ?? -1) >= 100 &&
    s.position !== null &&
    s.position <= 10 &&
    s.ctr !== null &&
    s.ctr < 0.01
  ) {
    groups.push("CTR_OPPORTUNITY");
    reasons.push(
      "At least 100 observed impressions, position <=10, CTR <1%; review query mix before snippet test (policy thresholds)",
    );
  }
  if (
    (demand || s.activeAffiliate) &&
    ((s.inbound !== null && s.inbound <= 2) ||
      (s.depth !== null && s.depth > 3))
  ) {
    groups.push("INTERNAL_AUTHORITY_GAP");
    reasons.push(
      "Measured <=2 content source pages or >3 home clicks; require a relevant editorial path",
    );
  }
  if (demand && (s.bucket === "C" || s.bucket === "D")) {
    groups.push("CONTENT_DEPTH_GAP");
    reasons.push(
      `Demand plus local completeness heuristic ${s.bucket}; not a vendor-fact verification`,
    );
  }
  if (s.intentConflict) {
    groups.push("INTENT_FRAGMENTATION");
    reasons.push(
      "Structural owner/canonical/title conflict; not inferred from comparison impressions",
    );
  }
  if (s.index === "UNKNOWN")
    reasons.push(
      "Index state UNKNOWN: inspect URL before calling this a ranking or indexation problem",
    );
  if (s.impressions === null)
    reasons.push("No exact canonical page row: demand UNKNOWN, not zero");
  if (!groups.length) groups.push("HOLD");
  return {
    groups,
    action: groups.includes("RANKING_STRIKING_DISTANCE")
      ? "Inspect snippet and information gain; do not touch indexation architecture for this URL"
      : groups.includes("INTENT_FRAGMENTATION")
      ? "Review structural intent conflict"
      : groups.includes("INTERNAL_AUTHORITY_GAP")
        ? "Review relevant existing HTML paths; no automatic links"
        : groups.includes("CONTENT_DEPTH_GAP")
          ? "Queue source-backed content review in Claude lane"
          : groups.includes("CRAWL_RECOVERY")
            ? "Investigate discovery/crawl-priority architecture (hub links, sitemap, category paths); do not manually request indexing for this URL"
            : groups.includes("INDEXATION_RECOVERY")
            ? "Review crawl recency and differentiation; no repeated indexing requests"
            : groups.includes("RANKING_OPPORTUNITY")
              ? "Inspect query/page demand and existing decision support"
              : groups.includes("CTR_OPPORTUNITY")
                ? "Inspect query mix before a controlled title test"
                : "Collect missing evidence or wait for measurement",
    reasons,
  };
}
export function indexingEligibility(
  input: {
    protected: boolean;
    lastRequestedAt: string | null;
    deployedImprovementAt: string | null;
    technicalPass: boolean;
    highValue: boolean;
    index: IndexState;
  },
  now: string,
) {
  if (input.protected) return "PROTECTED";
  if (
    !Number.isFinite(Date.parse(now)) ||
    (input.lastRequestedAt &&
      !Number.isFinite(Date.parse(input.lastRequestedAt)))
  )
    return "NOT_ELIGIBLE";
  if (
    input.lastRequestedAt &&
    Date.parse(now) - Date.parse(input.lastRequestedAt) < 14 * 86_400_000
  )
    return "RECENTLY_REQUESTED";
  if (
    !input.deployedImprovementAt ||
    !Number.isFinite(Date.parse(input.deployedImprovementAt)) ||
    Date.parse(input.deployedImprovementAt) > Date.parse(now) ||
    !input.technicalPass ||
    !input.highValue ||
    input.index === "UNKNOWN" ||
    input.index === "INDEXED"
  )
    return "NOT_ELIGIBLE";
  return "READY_TO_REQUEST";
}
