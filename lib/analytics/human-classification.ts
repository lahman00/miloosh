import type { FirstPartyEvent, PageViewEvent } from "@/lib/analytics/events";
import { LEGACY_CONTAMINATED_SESSIONS } from "@/lib/analytics/legacy-contaminated-sessions";
import { findKnownAutomationSession } from "@/lib/analytics/known-automation-sessions";

/**
 * MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23).
 *
 * A second, finer-grained layer on top of the existing HumanClassification
 * (lib/analytics/classification.ts). That layer answers one question --
 * "is this event excluded (test/legacy) or not" -- correctly, but
 * collapses everything not excluded into a single REAL_OR_UNKNOWN_HUMAN
 * bucket. This module answers a harder question for the traffic that
 * survives that filter: how CONFIDENT are we that a given SESSION (not
 * event -- a session is the real unit of "one visit") was actually a
 * human, using only the evidence this codebase's privacy model actually
 * stores (no user-agent, no IP -- see events.ts's module header)?
 *
 * Immutability: this module only READS events and produces a
 * classification alongside them. It never deletes, mutates, or hides a
 * stored event. Raw event counts reported anywhere in this codebase must
 * remain exactly what's in storage; only REPORTING logic (scripts/
 * analytics/report.ts) should ever apply these buckets.
 *
 * Deliberately rule-based and generalizable, not hand-tuned to specific
 * session IDs found on 2026-08-22/23 (the CircleCI cluster, the homepage
 * burst) -- those are the sessions that motivated writing this, not what
 * the rules are keyed on. A specific session ID is only ever referenced
 * via lib/analytics/legacy-contaminated-sessions.ts, which remains the
 * one place a real forensic investigation of a SPECIFIC session gets
 * permanently recorded.
 */

export type TrafficBucket =
  | "CONFIRMED_CLEAN" // Left the funnel via a real external/commercial action (outbound or affiliate click) with no burst/suspicious signal.
  | "STRONG_HUMAN_EVIDENCE" // Real campaign attribution (utm_content tying back to an actual published item) plus a genuine multi-step engagement funnel.
  | "PROBABLE_HUMAN" // Isolated session, real dwell/engagement signal, but shallow -- plausible, not strongly proven.
  | "KNOWN_QA_TEST" // Proven Miloosh QA/test traffic (isTest marker, or a legacy session CONFIRMED via independent corroboration).
  | "KNOWN_AUTOMATION" // Deterministically matched to a known internal/external automated process.
  | "SUSPICIOUS" // Shares a real, identifiable red flag (burst cadence, shallow/uniform pattern, or unproven-QA shape) but isn't provably any of the above.
  | "UNRESOLVED"; // Genuinely too little signal either way -- a single shallow event, no burst, no proof.

export type ReasonCode =
  | "QA_EVENT"
  | "DEPLOYMENT_VERIFY"
  | "UPTIME_MONITOR"
  | "AUTOMATED_BROWSER"
  | "SOCIAL_PREVIEW"
  | "SUSPICIOUS_CADENCE"
  | "REAL_UTM_ENGAGEMENT"
  | "OUTBOUND_OR_AFFILIATE_CLICK"
  | "MULTI_STEP_ENGAGEMENT"
  | "SHALLOW_ISOLATED"
  | "UNKNOWN";

export interface SessionClassification {
  sessionId: string;
  visitorId: string;
  bucket: TrafficBucket;
  reasonCode: ReasonCode;
  evidence: string;
  eventCount: number;
  distinctPaths: number;
  distinctEventTypes: number;
  firstTimestamp: string;
  lastTimestamp: string;
  dwellMs: number;
  hasUtmContent: boolean;
  isPartOfBurst: boolean;
}

/** Real-conversion-shaped event types -- reaching one of these is the strongest behavioral signal this codebase can observe. */
const STRONG_ENGAGEMENT_TYPES = new Set(["cta_impression", "comparison_view", "software_view", "internal_cta_click", "recommend_use"]);
const EXTERNAL_ACTION_TYPES = new Set(["outbound_click"]);

/**
 * Burst-cadence detection covers two distinct suspicious shapes, neither
 * tuned to match "exactly 6" or "exactly 10" of any specific session set
 * -- a real campaign click-through burst (like the CircleCI cluster) is
 * excluded from both by the "carries real utm_content" check in
 * classifySessions, which runs FIRST:
 *
 *   1. SAME-PATH cadence: >= MIN_BURST_SIZE shallow sessions (no UTM, no
 *      navigation beyond one path) land on the identical path within
 *      BURST_WINDOW_MS of each other. Catches e.g. a script/monitor
 *      hitting one URL repeatedly.
 *   2. SIMULTANEOUS-ARRIVAL: >= MIN_SIMULTANEOUS_SIZE distinct sessions
 *      (no UTM) all begin within SIMULTANEOUS_WINDOW_MS of each other,
 *      REGARDLESS of which page each lands on. A real site's organic
 *      arrivals are not perfectly synchronized to the second; several
 *      unique visitors' sessions all starting within the same ~15s
 *      window -- even on different pages -- is itself the anomaly this
 *      catches (the shape of the real Aug 22 16:53 UTC 5-visitor/
 *      5-page cluster that motivated this rule).
 */
const BURST_WINDOW_MS = 5 * 60 * 1000;
const MIN_BURST_SIZE = 3;
const SIMULTANEOUS_WINDOW_MS = 15 * 1000;
const MIN_SIMULTANEOUS_SIZE = 3;

interface SessionSummary {
  sessionId: string;
  visitorId: string;
  events: FirstPartyEvent[];
  firstEvent: FirstPartyEvent;
  lastEvent: FirstPartyEvent;
  distinctPaths: Set<string>;
  distinctEventTypes: Set<string>;
  hasUtmContent: boolean;
  hasExternalAction: boolean;
  hasStrongEngagement: boolean;
  isTest: boolean;
}

function summarizeSession(sessionId: string, events: FirstPartyEvent[]): SessionSummary {
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first = sorted[0]!;
  return {
    sessionId,
    visitorId: first.visitorId,
    events: sorted,
    firstEvent: first,
    lastEvent: sorted[sorted.length - 1]!,
    distinctPaths: new Set(sorted.map((e) => e.path)),
    distinctEventTypes: new Set(sorted.map((e) => e.type)),
    hasUtmContent: sorted.some((e) => e.type === "page_view" && Boolean((e as PageViewEvent).utmContent)),
    hasExternalAction: sorted.some((e) => EXTERNAL_ACTION_TYPES.has(e.type)),
    hasStrongEngagement: sorted.some((e) => STRONG_ENGAGEMENT_TYPES.has(e.type)),
    isTest: sorted.some((e) => Boolean(e.isTest)),
  };
}

/**
 * Groups sessions into bursts: a session is "part of a burst" when it
 * shares its landing path with >= MIN_BURST_SIZE-1 OTHER sessions inside
 * BURST_WINDOW_MS, none of them carrying real UTM attribution, and none
 * navigating beyond that single path. Real, isolated organic visits
 * (varied paths, varied timing) never trip this.
 */
/** sessionId -> human-readable description of which burst rule matched, for the audit trail. */
function detectBurstSessionIds(summaries: SessionSummary[]): Map<string, string> {
  const burstIds = new Map<string, string>();
  const untaggedShallow = summaries.filter((s) => !s.hasUtmContent && s.distinctPaths.size === 1 && !s.hasStrongEngagement);

  // Rule 1: same-path cadence.
  for (const candidate of untaggedShallow) {
    const candidateTime = new Date(candidate.firstEvent.timestamp).getTime();
    const path = candidate.firstEvent.path;
    const nearby = untaggedShallow.filter((other) => {
      if (other.firstEvent.path !== path) return false;
      const delta = Math.abs(new Date(other.firstEvent.timestamp).getTime() - candidateTime);
      return delta <= BURST_WINDOW_MS;
    });
    if (nearby.length >= MIN_BURST_SIZE) {
      for (const n of nearby) {
        burstIds.set(n.sessionId, `Shares landing path "${path}" with ${nearby.length - 1} other shallow, non-UTM session(s) within ${BURST_WINDOW_MS / 1000}s.`);
      }
    }
  }

  // Rule 2: simultaneous arrival, regardless of path -- a distinct signal from Rule 1,
  // so it runs over ALL non-UTM sessions (not just single-path ones), since a real
  // multi-visitor synchronized-arrival anomaly doesn't require each visitor to be shallow.
  const nonUtm = summaries.filter((s) => !s.hasUtmContent);
  for (const candidate of nonUtm) {
    const candidateTime = new Date(candidate.firstEvent.timestamp).getTime();
    const nearby = nonUtm.filter((other) => Math.abs(new Date(other.firstEvent.timestamp).getTime() - candidateTime) <= SIMULTANEOUS_WINDOW_MS);
    if (nearby.length >= MIN_SIMULTANEOUS_SIZE) {
      for (const n of nearby) {
        if (!burstIds.has(n.sessionId)) {
          burstIds.set(n.sessionId, `${nearby.length} distinct sessions (visitor IDs) all began within ${SIMULTANEOUS_WINDOW_MS / 1000}s of each other, none carrying UTM attribution -- unusually synchronized for organic arrivals regardless of which page each landed on.`);
        }
      }
    }
  }

  return burstIds;
}

/**
 * Classifies every session in the given event set. Pass ALL non-excluded
 * events for the dataset (or a meaningful time window of them) so burst
 * detection has real context -- classifying one session in isolation
 * cannot detect a cadence pattern.
 */
export function classifySessions(events: readonly FirstPartyEvent[]): SessionClassification[] {
  const bySession = new Map<string, FirstPartyEvent[]>();
  for (const e of events) {
    const list = bySession.get(e.sessionId) ?? [];
    list.push(e);
    bySession.set(e.sessionId, list);
  }

  const summaries = [...bySession.entries()].map(([sid, evs]) => summarizeSession(sid, evs));
  const burstIds = detectBurstSessionIds(summaries);

  return summaries.map((s): SessionClassification => {
    const dwellMs = new Date(s.lastEvent.timestamp).getTime() - new Date(s.firstEvent.timestamp).getTime();
    const isPartOfBurst = burstIds.has(s.sessionId);
    const base = {
      sessionId: s.sessionId,
      visitorId: s.visitorId,
      eventCount: s.events.length,
      distinctPaths: s.distinctPaths.size,
      distinctEventTypes: s.distinctEventTypes.size,
      firstTimestamp: s.firstEvent.timestamp,
      lastTimestamp: s.lastEvent.timestamp,
      dwellMs,
      hasUtmContent: s.hasUtmContent,
      isPartOfBurst,
    };

    // 1. Proven QA/test or automation traffic -- checked first, overrides every other signal.
    if (s.isTest) {
      return { ...base, bucket: "KNOWN_QA_TEST", reasonCode: "QA_EVENT", evidence: "isTest marker present on at least one event in this session." };
    }
    // Same synthetic-ID-prefix convention scripts/analytics/report.ts's isSyntheticOrTestEvent
    // already checks -- kept in sync here so classifySessions is self-sufficient on a raw,
    // unfiltered event set (report.ts's own filtering stays for its other, pre-existing metrics).
    if (/^v_(test_|synthetic_|anon_test)/.test(s.visitorId) || /^s_(test_|synthetic_|anon_test)/.test(s.sessionId)) {
      return { ...base, bucket: "KNOWN_QA_TEST", reasonCode: "QA_EVENT", evidence: "Synthetic-ID-prefix convention (v_test_/v_synthetic_/v_anon_test or s_test_/s_synthetic_/s_anon_test) matched." };
    }
    const knownAutomation = findKnownAutomationSession(s.sessionId);
    if (knownAutomation) {
      return { ...base, bucket: "KNOWN_AUTOMATION", reasonCode: knownAutomation.reason, evidence: knownAutomation.evidence };
    }
    const legacyEntry = LEGACY_CONTAMINATED_SESSIONS.find((l) => l.sessionId === s.sessionId);
    if (legacyEntry?.classification === "CONFIRMED_OPERATOR_QA") {
      return { ...base, bucket: "KNOWN_QA_TEST", reasonCode: "QA_EVENT", evidence: `Legacy session, independently corroborated: ${legacyEntry.reason}` };
    }
    if (legacyEntry?.classification === "UNKNOWN_POSSIBLE_OPERATOR_QA") {
      return { ...base, bucket: "SUSPICIOUS", reasonCode: "UNKNOWN", evidence: `Legacy session, circumstantial only (not independently corroborated): ${legacyEntry.reason}` };
    }

    // 2. Real campaign attribution + genuine progressive engagement -- the strongest positive signal available.
    if (s.hasUtmContent && s.distinctEventTypes.size >= 3 && s.hasStrongEngagement && !isPartOfBurst) {
      const evidence = `Carries real utm_content; ${s.distinctEventTypes.size} distinct event types (${[...s.distinctEventTypes].join(", ")}) over ${dwellMs}ms dwell -- a progressive engagement funnel, not a single flat hit.`;
      if (s.hasExternalAction) {
        return { ...base, bucket: "CONFIRMED_CLEAN", reasonCode: "OUTBOUND_OR_AFFILIATE_CLICK", evidence: `${evidence} Reached a real outbound click.` };
      }
      return { ...base, bucket: "STRONG_HUMAN_EVIDENCE", reasonCode: "REAL_UTM_ENGAGEMENT", evidence };
    }

    // 3. A real external/commercial action with no burst signal, even without UTM (e.g. direct-arrival visitor who still clicked out).
    if (s.hasExternalAction && !isPartOfBurst) {
      return { ...base, bucket: "CONFIRMED_CLEAN", reasonCode: "OUTBOUND_OR_AFFILIATE_CLICK", evidence: "Reached a real outbound/affiliate click with no burst or suspicious-cadence signal." };
    }

    // 4. Burst/cadence pattern -- same-path cadence or synchronized multi-visitor arrival.
    if (isPartOfBurst) {
      return { ...base, bucket: "SUSPICIOUS", reasonCode: "SUSPICIOUS_CADENCE", evidence: burstIds.get(s.sessionId)! };
    }

    // 5. Isolated session with real multi-step navigation or engagement depth.
    if (s.distinctPaths.size >= 2 || (s.distinctEventTypes.size >= 2 && dwellMs >= 5000)) {
      return { ...base, bucket: "PROBABLE_HUMAN", reasonCode: "MULTI_STEP_ENGAGEMENT", evidence: `Isolated session (no burst match); ${s.distinctPaths.size} distinct path(s), ${s.distinctEventTypes.size} event type(s), ${dwellMs}ms dwell.` };
    }

    // 6. Genuinely too little signal -- a single shallow event, isolated, no red flag either.
    return { ...base, bucket: "UNRESOLVED", reasonCode: "SHALLOW_ISOLATED", evidence: `Single-path, ${s.distinctEventTypes.size} event type(s), ${dwellMs}ms dwell -- too little signal to place confidently in any other bucket.` };
  });
}

export interface TrafficBucketSummary {
  bucket: TrafficBucket;
  sessions: number;
}

export function summarizeBuckets(classifications: readonly SessionClassification[]): TrafficBucketSummary[] {
  const counts = new Map<TrafficBucket, number>();
  for (const c of classifications) counts.set(c.bucket, (counts.get(c.bucket) ?? 0) + 1);
  const order: TrafficBucket[] = ["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN", "SUSPICIOUS", "UNRESOLVED", "KNOWN_AUTOMATION", "KNOWN_QA_TEST"];
  return order.map((bucket) => ({ bucket, sessions: counts.get(bucket) ?? 0 }));
}

/**
 * A single visitor can have multiple sessions with different
 * classifications (e.g. one shallow visit and, days later, one that
 * reaches STRONG_HUMAN_EVIDENCE). For visitor-level reporting (the
 * acquisition-milestone scoreboard counts distinct HUMANS, not sessions),
 * a visitor is credited with their single BEST session classification --
 * never averaged or double-counted. Rank mirrors confidence, strongest
 * first; KNOWN_QA_TEST/KNOWN_AUTOMATION are excluded entirely up front
 * since those visitors are proven non-organic, not merely "weak evidence."
 */
const BUCKET_RANK: Record<TrafficBucket, number> = {
  CONFIRMED_CLEAN: 5,
  STRONG_HUMAN_EVIDENCE: 4,
  PROBABLE_HUMAN: 3,
  UNRESOLVED: 2,
  SUSPICIOUS: 1,
  KNOWN_AUTOMATION: 0,
  KNOWN_QA_TEST: 0,
};

export interface VisitorClassification {
  visitorId: string;
  bucket: TrafficBucket;
  bestSessionId: string;
}

/** Excludes KNOWN_QA_TEST/KNOWN_AUTOMATION visitors entirely -- they are proven non-organic, not a traffic bucket to roll up for human-count purposes. */
export function classifyVisitors(classifications: readonly SessionClassification[]): VisitorClassification[] {
  const bestByVisitor = new Map<string, SessionClassification>();
  for (const c of classifications) {
    if (c.bucket === "KNOWN_QA_TEST" || c.bucket === "KNOWN_AUTOMATION") continue;
    const existing = bestByVisitor.get(c.visitorId);
    if (!existing || BUCKET_RANK[c.bucket] > BUCKET_RANK[existing.bucket]) {
      bestByVisitor.set(c.visitorId, c);
    }
  }
  return [...bestByVisitor.values()].map((c) => ({ visitorId: c.visitorId, bucket: c.bucket, bestSessionId: c.sessionId }));
}

/**
 * The single defensible "confirmed or strong" human visitor count for
 * milestone/scoreboard reporting -- CONFIRMED_CLEAN and STRONG_HUMAN_
 * EVIDENCE visitors only. Deliberately excludes PROBABLE_HUMAN (real but
 * weaker signal) and SUSPICIOUS/UNRESOLVED entirely. This is the number
 * that must be used wherever a milestone is reported as reached -- never
 * a raw REAL_OR_UNKNOWN_HUMAN event/visitor count, which conflates all of
 * this together (see Phase 7 of the mission that introduced this
 * function: "a jump such as 28 -> 60 must not be reported as human
 * growth until classification runs").
 */
export function countConfirmedOrStrongVisitors(classifications: readonly SessionClassification[]): number {
  return classifyVisitors(classifications).filter((v) => v.bucket === "CONFIRMED_CLEAN" || v.bucket === "STRONG_HUMAN_EVIDENCE").length;
}
