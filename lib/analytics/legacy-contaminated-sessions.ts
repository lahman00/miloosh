/**
 * Recommend Engine Integrity Patch (2026-08-21) — known contaminated
 * analytics sessions that must be excluded from real-human reporting.
 * Most historical entries predate the isTest synthetic marker; newer entries
 * may also be added when a production QA session was independently proven but
 * accidentally ran without the marker.
 *
 * This is NOT a mechanism for silently pruning inconvenient data. Every
 * entry here required a real forensic look at the raw stored events
 * (timestamps, paths, visitor/session IDs — the only fields this
 * codebase's privacy model stores; no user-agent, no IP, see
 * lib/analytics/events.ts's module header) before being added, and the
 * `reason` field is the actual basis for the classification, not a
 * placeholder. Events themselves are never deleted or mutated — Vercel
 * Blob objects for first-party analytics are immutable by design in this
 * codebase (recordFirstPartyEvent always writes a new object, never
 * overwrites one) — this file is an explicit, auditable, non-destructive
 * annotation applied only at report time by scripts/analytics/report.ts.
 *
 * Add an entry here only after a real investigation, same rigor as the
 * one behind the first entry below. Never add one merely because a
 * number looks inconvenient — that would violate the same truth rule
 * this file exists to uphold.
 */

export type LegacyContaminatedSession = {
  sessionId: string;
  visitorId: string;
  /** UNKNOWN_POSSIBLE_OPERATOR_QA: circumstantial evidence only (timing/path shape), provenance not provable either way. CONFIRMED_OPERATOR_QA: independently corroborated against the agent's own action log for that session — not a guess. */
  classification: "UNKNOWN_POSSIBLE_OPERATOR_QA" | "CONFIRMED_OPERATOR_QA";
  investigatedAt: string;
  reason: string;
};

export const LEGACY_CONTAMINATED_SESSIONS: readonly LegacyContaminatedSession[] = [
  {
    sessionId: "s_tjvabxoqmt2s7kdu",
    visitorId: "v_ob2uyamdmt2s7kdt",
    classification: "UNKNOWN_POSSIBLE_OPERATOR_QA",
    investigatedAt: "2026-08-21",
    reason:
      "10 events spanning 2026-08-21T10:03:36.219Z to 2026-08-21T10:05:21.661Z (under 2 minutes), " +
      "single visitor+session throughout. Paths limited to /recommend and /recommend/results only " +
      "(2 visits each) — no software/comparison/category/guide page ever visited despite results " +
      "being shown, which is atypical of organic evaluation but is exactly the shape of a scripted " +
      "or manual QA walkthrough of the Recommend feature. Navigation pattern: /recommend -> " +
      "/recommend/results -> /recommend/results (revisited) -> /recommend (returned to) -> done. " +
      "Recorded three hours before the browser-based production QA performed later the same day in " +
      "this same investigation session, so it cannot be that specific QA pass, but the browser tool " +
      "used for that later QA reported connecting to a REUSED tab (not a freshly created one) — " +
      "meaning a browser session of unknown origin (operator, an earlier agent turn, or otherwise) " +
      "was already open against this site before this investigation began, and could plausibly have " +
      "generated this exact traffic. No user-agent is stored per-event in this codebase's privacy " +
      "model, so UA-based confirmation is not possible for this or any historical event — this is an " +
      "architectural limitation being weighed here honestly, not treated as proof either way. " +
      "Provenance could not be proven organic OR operator-QA with the data actually available. Per " +
      "the non-negotiable rule that unproven traffic is never reported as organic, classified " +
      "UNKNOWN_POSSIBLE_OPERATOR_QA and excluded from REAL HUMAN metrics by default.",
  },
  {
    sessionId: "s_xdc34h7xmt452kj6",
    visitorId: "v_kfqu33hvmt452kj6",
    classification: "CONFIRMED_OPERATOR_QA",
    investigatedAt: "2026-08-22",
    reason:
      "13 events from 2026-08-22T08:51:21.011Z to 2026-08-22T09:02:12.850Z, single visitor+session " +
      "throughout: page_view:/ -> engaged_view -> recommend_started+page_view:/recommend -> " +
      "engaged_view -> software_view+page_view:/software/figma -> engaged_view -> " +
      "comparison_view+page_view:/compare/notion-vs-clickup -> engaged_view -> page_view:/category/crm " +
      "-> engaged_view. This is not circumstantial: it exactly matches, in both path sequence and " +
      "timestamp, the agent's own recorded tool-call log for the Phase 17 mobile-QA sweep performed " +
      "in this same session (homepage load, /recommend wizard render check, then direct navigation to " +
      "/software/figma, /compare/notion-vs-clickup, /category/crm specifically to check for horizontal " +
      "overflow at a 320px viewport) — the QA pass did not use the ?qa=1 synthetic marker because it " +
      "checked layout via read-only DOM properties (scrollWidth/clientWidth), not the tracked UI " +
      "controls the marker convention was built around. Classified CONFIRMED (not UNKNOWN_POSSIBLE) " +
      "because this is corroborated against an independent record of the actual actions taken, not " +
      "inferred from event shape alone. Excluded from REAL HUMAN metrics. Lesson applied going " +
      "forward: any future manual/browser QA against production must open with ?qa=1 regardless of " +
      "whether the check itself uses tracked UI controls.",
  },
  {
    sessionId: "s_2lrjxr7fmt63aebq",
    visitorId: "v_kfqu33hvmt452kj6",
    classification: "CONFIRMED_OPERATOR_QA",
    investigatedAt: "2026-08-23",
    reason:
      "4 events from 2026-08-23T17:36:59.445Z to 2026-08-23T17:37:09.924Z, single visitor+session: " +
      "page_view:/software/circleci -> software_view -> cta_impression (carrying " +
      "experimentId:\"software-cta-copy-v1\", variant:\"treatment\") -> engaged_view. This is CONFIRMED " +
      "with first-person certainty, not inferred: this is this agent's own live production browser " +
      "verification pass for the CTA CONVERSION OPTIMIZATION MISSION (2026-08-23) Phase 22, navigating " +
      "to /software/circleci to visually confirm the new CTA-copy-experiment rendering. The reused " +
      "browser tab already carried this same visitorId's localStorage from an EARLIER agent session " +
      "(the same v_kfqu33hvmt452kj6 as the s_xdc34h7xmt452kj6 entry above, a different visit entirely) " +
      "and the first navigation did not include the ?qa=1 marker before it was added on a follow-up " +
      "navigation in the same tab/session a few seconds later (subsequent events in this same session " +
      "correctly carry isTest:true and are NOT part of this entry). Excluded from REAL HUMAN metrics. " +
      "Confirms the lesson from the prior entry needs restating, not that it failed: opening a REUSED " +
      "browser tab against production requires navigating with ?qa=1 on the very first load, before any " +
      "other interaction, not after.",
  },
  {
    sessionId: "s_53morplxmu9mz6tp",
    visitorId: "v_mm60sswfmu01znvf",
    classification: "CONFIRMED_OPERATOR_QA",
    investigatedAt: "2026-09-20",
    reason:
      "10 events from 2026-09-20T09:51:09.527Z to 2026-09-20T09:53:54.150Z, single visitor+session: " +
      "recommend_started + page_view:/recommend -> engaged_view -> recommend_need_selected(domain ecommerce_platform) -> " +
      "recommend_ecommerce_situation_selected(situation repair) -> recommend_completed -> recommend_use + " +
      "recommend_result_viewed(confidence low, resultCount 3) + page_view:/recommend/results -> engaged_view. " +
      "This is independently corroborated by RECOMMEND_LIVE_QA_VERIFICATION_20260920.md, written immediately after " +
      "the manual production QA pass, which records the same flow: open /recommend, choose Build an online store, " +
      "select Fixing the store I already have, complete the wizard, and inspect the repair-first result. The stored " +
      "events are incorrectly isTest:false because that manual QA pass omitted ?qa=1. Classified CONFIRMED_OPERATOR_QA " +
      "and excluded non-destructively at report time so the single repair selection can never be reported as real buyer " +
      "behavior. This is evidence of a QA-marking process failure, not evidence about merchant intent.",
  },
];

export function isLegacyContaminatedSession(sessionId: string): boolean {
  return LEGACY_CONTAMINATED_SESSIONS.some((s) => s.sessionId === sessionId);
}
