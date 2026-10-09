import type { FirstPartyEvent, OutboundClickEvent } from "@/lib/analytics/events";
import { classifySessions, type TrafficBucket } from "@/lib/analytics/human-classification";
import { measured, notMeasured, unavailable, type Measured, type Provenance } from "./evidence";

/**
 * The commercial funnel, one stage per fact.
 *
 * Search impressions, search clicks, site sessions, outbound clicks,
 * network-attributed conversions, approved commissions and received payouts
 * are different facts from different systems. Nothing here adds one stage to
 * another, and a stage with no data source is NOT_MEASURED, never zero.
 *
 * First-party outbound clicks are only counted as human-qualified when the
 * repository's own session classifier puts the session in a human bucket AND
 * an earlier non-test funnel event exists in the same session (a bare POST to
 * the public endpoint proves nothing). Events marked isTest, QA sessions,
 * known automation and bursts are reported as excluded, never as visits.
 */

const HUMAN_BUCKETS: ReadonlySet<TrafficBucket> = new Set(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN"]);
const TEST_BUCKETS: ReadonlySet<TrafficBucket> = new Set(["KNOWN_QA_TEST"]);
const AUTOMATION_BUCKETS: ReadonlySet<TrafficBucket> = new Set(["KNOWN_AUTOMATION", "SUSPICIOUS"]);

/** Same pre-click funnel types the repository's money-priority engine requires. */
const PRE_CLICK_TYPES: ReadonlySet<FirstPartyEvent["type"]> = new Set([
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
  "cta_click",
]);

const DECISION_VIEW_TYPES: ReadonlySet<FirstPartyEvent["type"]> = new Set(["software_view", "comparison_view", "guide_view"]);

export type NetworkOutcomeEvidence = {
  /** Conversions the affiliate network attributes to Miloosh, per the network's own report. */
  conversions: Measured<number>;
  /** Commissions the network lists as approved, by currency. Currencies are never summed. */
  approvedCommissions: Measured<Array<{ currency: string; amount: number }>>;
  /** Money actually received, by currency. */
  payoutsReceived: Measured<Array<{ currency: string; amount: number }>>;
};

export const NO_NETWORK_OUTCOMES: NetworkOutcomeEvidence = {
  conversions: notMeasured("No network conversion report is stored in the repository or was provided."),
  approvedCommissions: notMeasured("No network commission report is stored in the repository or was provided."),
  payoutsReceived: notMeasured("No payout receipt is stored in the repository or was provided."),
};

export type FunnelSummary = {
  window: { start: string; end: string } | null;
  provenance: Provenance;
  /** First-party sessions, by the classifier's verdict. */
  sessions: {
    humanQualified: number;
    knownQa: number;
    automationOrSuspicious: number;
    unresolved: number;
    total: number;
  };
  /** Human-qualified sessions with at least one software, comparison or guide view. */
  engagedDecisionSessions: number;
  outbound: {
    /** destination "affiliate", not test, human session, with earlier funnel evidence. */
    partnerClicksHumanQualified: number;
    partnerClicksTest: number;
    partnerClicksUnclassifiedMarker: number;
    partnerClicksNotQualified: number;
    officialSiteClicks: number;
  };
  outcomes: NetworkOutcomeEvidence;
  notes: string[];
};

function isPartnerClick(event: FirstPartyEvent): event is OutboundClickEvent {
  return event.type === "outbound_click" && event.destination === "affiliate";
}

export function summarizeFunnel(
  events: readonly FirstPartyEvent[],
  provenance: Provenance,
  window: { start: string; end: string } | null = null,
  outcomes: NetworkOutcomeEvidence = NO_NETWORK_OUTCOMES,
): FunnelSummary {
  const scoped = window
    ? events.filter((e) => {
        const day = e.timestamp.slice(0, 10);
        return day >= window.start && day <= window.end;
      })
    : [...events];
  const classifications = classifySessions(scoped);
  const bucketBySession = new Map(classifications.map((c) => [c.sessionId, c.bucket]));

  const sessions = { humanQualified: 0, knownQa: 0, automationOrSuspicious: 0, unresolved: 0, total: classifications.length };
  for (const c of classifications) {
    if (HUMAN_BUCKETS.has(c.bucket)) sessions.humanQualified += 1;
    else if (TEST_BUCKETS.has(c.bucket)) sessions.knownQa += 1;
    else if (AUTOMATION_BUCKETS.has(c.bucket)) sessions.automationOrSuspicious += 1;
    else sessions.unresolved += 1;
  }

  const humanSessions = new Set(classifications.filter((c) => HUMAN_BUCKETS.has(c.bucket)).map((c) => c.sessionId));
  const engaged = new Set<string>();
  for (const event of scoped) {
    if (humanSessions.has(event.sessionId) && DECISION_VIEW_TYPES.has(event.type) && event.isTest !== true) engaged.add(event.sessionId);
  }

  const outbound = { partnerClicksHumanQualified: 0, partnerClicksTest: 0, partnerClicksUnclassifiedMarker: 0, partnerClicksNotQualified: 0, officialSiteClicks: 0 };
  for (const event of scoped) {
    if (event.type === "outbound_click" && event.destination === "official") outbound.officialSiteClicks += 1;
    if (!isPartnerClick(event)) continue;
    if (event.isTest === true) {
      outbound.partnerClicksTest += 1;
      continue;
    }
    const bucket = bucketBySession.get(event.sessionId);
    const hasPreClickEvidence = scoped.some(
      (other) =>
        other.sessionId === event.sessionId &&
        other.timestamp <= event.timestamp &&
        other.type !== "outbound_click" &&
        PRE_CLICK_TYPES.has(other.type) &&
        other.isTest !== true,
    );
    if (bucket && HUMAN_BUCKETS.has(bucket) && hasPreClickEvidence) {
      if (event.isTest === false) outbound.partnerClicksHumanQualified += 1;
      else outbound.partnerClicksUnclassifiedMarker += 1;
    } else {
      outbound.partnerClicksNotQualified += 1;
    }
  }

  return {
    window,
    provenance,
    sessions,
    engagedDecisionSessions: engaged.size,
    outbound,
    outcomes,
    notes: [
      "A partner click is not a conversion; conversions, commissions and payouts come only from network and payout evidence.",
      "Clicks whose isTest marker is absent are reported separately and are not counted as human-qualified: the marker is the only QA signal on that event.",
      "Search impressions and clicks are a different system and are never added to site sessions.",
    ],
  };
}

export type FunnelEvidence = Measured<FunnelSummary>;

export function unavailableFunnel(reason: string): FunnelEvidence {
  return unavailable<FunnelSummary>(reason);
}

export function funnelFromEvents(events: readonly FirstPartyEvent[], provenance: Provenance, window: { start: string; end: string } | null, outcomes?: NetworkOutcomeEvidence): FunnelEvidence {
  return measured(summarizeFunnel(events, provenance, window, outcomes), provenance);
}
