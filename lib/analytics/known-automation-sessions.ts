/**
 * MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23) — the
 * KNOWN_AUTOMATION counterpart to legacy-contaminated-sessions.ts. A
 * session only belongs here once a real, deterministic source has been
 * proven — a matching timestamp against a recorded cron/deploy
 * invocation, a matching tool-call log, or an equivalent concrete check.
 * Never add an entry merely because a session's traffic PATTERN looks
 * automated; that goes in SUSPICIOUS via the cadence-detection rule in
 * lib/analytics/human-classification.ts instead, specifically because a
 * pattern match alone is not proof of a specific source.
 *
 * Investigated and explicitly RULED OUT during this mission for the
 * 2026-08-23 ~09:01:54–09:04:39Z ten-session homepage-only burst (see
 * that mission's session for the full trail):
 *   - This agent's own `vercel deploy` calls: the nearest one was ~19h
 *     away (checked via `vercel ls --prod`), not a match.
 *   - `scripts/deployment/verify-deployment.ts` and any curl-based check:
 *     uses a fetch client whose user-agent matches lib/analytics/
 *     bot-filter.ts's KNOWN_BOT_PATTERNS (curl/node-fetch/undici/etc.) —
 *     would be rejected at BOT_REJECTED before storage, never reaches
 *     stored events at all.
 *   - Vercel Cron jobs (social-publish, social-schedule, seo-factory):
 *     hit their own API routes carrying `x-vercel-cron`, filtered as
 *     INTERNAL_INFRA before storage; none of them request `/` anyway.
 *   - No `setInterval`/polling loop with a matching ~15-30s cadence
 *     exists anywhere in this repository (searched scripts/ and lib/).
 * No deterministic source was found — left classified SUSPICIOUS
 * (SUSPICIOUS_CADENCE), not added here. This module exists so a FUTURE
 * investigation that does find a real source has somewhere permanent to
 * record it, rather than the finding evaporating between agent sessions.
 */

export type KnownAutomationReason = "DEPLOYMENT_VERIFY" | "UPTIME_MONITOR" | "AUTOMATED_BROWSER" | "SOCIAL_PREVIEW";

export type KnownAutomationSession = {
  sessionId: string;
  visitorId: string;
  reason: KnownAutomationReason;
  investigatedAt: string;
  evidence: string;
};

export const KNOWN_AUTOMATION_SESSIONS: readonly KnownAutomationSession[] = [];

export function findKnownAutomationSession(sessionId: string): KnownAutomationSession | undefined {
  return KNOWN_AUTOMATION_SESSIONS.find((s) => s.sessionId === sessionId);
}
