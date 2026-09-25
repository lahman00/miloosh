"use client";

import { createEventId } from "@/lib/analytics/event-id";
import { analyticsPath, campaignLabel, sanitizeAcquisition, type AcquisitionContext } from "@/lib/analytics/acquisition";
import { extractReferrerHost, normalizeTrafficSource } from "@/lib/analytics/attribution";

export const SESSION_IDLE_MS = 30 * 60 * 1000;
const CONTEXT_KEY = "miloosh_session_v2";
type Session = { sessionId: string; lastActivity: number; path: string; previousPath?: string; acquisition: AcquisitionContext };
const sessions = new WeakMap<Window, Session>();

function capture(sessionId: string, path: string, now: number, newDocument: boolean): AcquisitionContext {
  // An idle tab's old URL/referrer are not a new acquisition. Never reuse them
  // on expiry; the new session's external origin is unknown.
  const params = new URLSearchParams(newDocument ? window.location.search : "");
  const referrer = newDocument && typeof document !== "undefined" ? document.referrer : undefined;
  const fields = {
    referrerHost: extractReferrerHost(referrer),
    utmSource: campaignLabel(params.get("utm_source")), utmMedium: campaignLabel(params.get("utm_medium")),
    utmCampaign: campaignLabel(params.get("utm_campaign")), utmContent: campaignLabel(params.get("utm_content")),
  };
  return { sessionId, landingPath: path, capturedAt: new Date(now).toISOString(), ...fields,
    trafficSource: normalizeTrafficSource({ ...fields, referrerObserved: referrer === "" }),
  };
}

/** 30 minutes of measured inactivity ends a session. Fresh document navigation
 * starts a new session (also isolates copied sessionStorage in duplicate tabs).
 * An explicit reload/back-forward may resume a non-expired stored context.
 * SPA internal navigation retains first touch; denied storage uses memory.
 */
export function getBrowserSession(pathname: string): Session | undefined {
  if (typeof window === "undefined") return undefined;
  const now = Date.now();
  const path = analyticsPath(pathname) ?? "/unknown";
  let current = sessions.get(window);
  const newDocument = !current;
  if (!current) {
    try {
      const navigation = window.performance?.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navigation?.type === "reload" || navigation?.type === "back_forward") {
        const saved = JSON.parse(sessionStorage.getItem(CONTEXT_KEY) ?? "null") as Session | null;
        if (saved && /^s_[a-zA-Z0-9_-]{1,62}$/.test(saved.sessionId)) {
          const acquisition = sanitizeAcquisition(saved.acquisition, saved.sessionId, now);
          if (acquisition && now >= saved.lastActivity && now - saved.lastActivity < SESSION_IDLE_MS) {
            current = { ...saved, path: analyticsPath(saved.path) ?? path, previousPath: analyticsPath(saved.previousPath), acquisition };
          }
        }
      }
    } catch { /* No persistence/invalid data is not a navigation error. */ }
  }
  if (!current || now < current.lastActivity || now - current.lastActivity >= SESSION_IDLE_MS) {
    const sessionId = `s_${createEventId()}`;
    current = { sessionId, path, lastActivity: now, acquisition: capture(sessionId, path, now, newDocument) };
  }
  if (path !== current.path) {
    current.previousPath = current.path;
    current.path = path;
  }
  current.lastActivity = now;
  sessions.set(window, current);
  try {
    sessionStorage.setItem("miloosh_sid", current.sessionId);
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(current));
  } catch { /* Stable document-memory context still accompanies each event. */ }
  return current;
}

export function currentBrowserSession(): Session | undefined {
  return typeof window === "undefined" ? undefined : sessions.get(window);
}
