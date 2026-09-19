/**
 * Recommend Engine Integrity Patch (2026-08-21) — Phase 1: a reliable way
 * for automated/manual agent QA browser sessions to mark themselves as
 * synthetic, so analytics:report can exclude them from REAL HUMAN metrics
 * by default. A QA browser session could not be distinguished from an
 * organic visitor after the fact, because no marker existed and no
 * user-agent is stored per-event (by design — see lib/analytics/events.ts's
 * privacy model).
 *
 * Mechanism: a `?qa=1` URL param, read once client-side, sets a
 * sessionStorage flag that persists for the rest of that browser tab's
 * session (so a QA walkthrough that starts on one URL and navigates to
 * others without repeating `?qa=1` stays marked). This is explicitly NOT
 * fingerprinting and reads no IP address — it's an opt-in marker the
 * operator/agent sets deliberately when starting a QA session.
 *
 * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase 5:
 * adds an optional `?qaRun=<id>` alongside `?qa=1` so one specific QA
 * session's events can be found unambiguously in storage (e.g. for a
 * production-proof run). The id is sanitized and length-capped before
 * ever being stored, and — per that phase's explicit instruction — it is
 * only ever attached to events that are ALREADY isTest:true; a real/
 * unknown-human event never carries it.
 */

const SYNTHETIC_QA_STORAGE_KEY = "miloosh_qa";
const QA_RUN_STORAGE_KEY = "miloosh_qa_run";
const MAX_QA_RUN_LENGTH = 64;
// Document-scoped fallback survives client navigation when storage is denied.
// A new document/tab is a distinct key; nothing is persisted or fingerprinted.
const memoryMarkers = new WeakMap<Window, { qa: boolean; run?: string }>();

function sanitizeQaRun(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, MAX_QA_RUN_LENGTH);
}

/**
 * Call once per page navigation, client-side only. Reads `?qa=1` (and, if
 * present, `?qaRun=`) from the current URL and persists them to
 * sessionStorage, then returns whether this tab's session is currently
 * marked synthetic (whether from this navigation's query params or
 * earlier ones in the same tab session).
 */
export function markAndCheckSyntheticQa(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const previous = memoryMarkers.get(window);
  const explicit = params.get("qa") === "1";
  const marker = {
    qa: explicit || previous?.qa === true,
    run: explicit && params.get("qaRun") ? sanitizeQaRun(params.get("qaRun")!) : previous?.run,
  };
  memoryMarkers.set(window, marker);
  try {
    if (marker.qa) {
      sessionStorage.setItem(SYNTHETIC_QA_STORAGE_KEY, "1");
      const qaRun = params.get("qaRun");
      if (qaRun) {
        sessionStorage.setItem(QA_RUN_STORAGE_KEY, sanitizeQaRun(qaRun));
      }
    }
    marker.qa = marker.qa || sessionStorage.getItem(SYNTHETIC_QA_STORAGE_KEY) === "1";
    marker.run = marker.run ?? sessionStorage.getItem(QA_RUN_STORAGE_KEY) ?? undefined;
    return marker.qa;
  } catch {
    return marker.qa;
  }
}

/**
 * Only meaningful once markAndCheckSyntheticQa() has confirmed the session
 * is synthetic — callers (lib/analytics/track.ts) only attach this to a
 * payload alongside isTest:true, never to a real/unknown-human event.
 */
export function getSyntheticQaRun(): string | undefined {
  try {
    return sessionStorage.getItem(QA_RUN_STORAGE_KEY) ?? (typeof window !== "undefined" ? memoryMarkers.get(window)?.run : undefined);
  } catch {
    return typeof window !== "undefined" ? memoryMarkers.get(window)?.run : undefined;
  }
}
