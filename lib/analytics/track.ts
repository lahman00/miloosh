"use client";

import { markAndCheckSyntheticQa, getSyntheticQaRun } from "@/lib/analytics/synthetic";

/**
 * Recommend Engine Integrity Patch (2026-08-21) — the shared client-side
 * event-sending primitive, extracted out of components/FirstPartyAnalytics.tsx
 * so that Recommend-specific interaction tracking (wizard steps, result
 * views, product/comparison opens — see components/recommend/*) shares the
 * exact same visitor/session ID pair as page-view tracking, instead of
 * each call site regenerating or duplicating that logic. Same privacy
 * model as lib/analytics/events.ts: anonymous, ephemeral, client-generated
 * IDs only — no names, emails, IP addresses, or fingerprinting.
 */

export function getOrCreateVisitorId(): string {
  try {
    const key = "miloosh_vid";
    let vid = localStorage.getItem(key);
    if (!vid) {
      vid = "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(key, vid);
    }
    return vid;
  } catch {
    return "v_anon_" + Math.random().toString(36).slice(2, 10);
  }
}

export function getOrCreateSessionId(): string {
  try {
    const key = "miloosh_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return "s_anon_" + Math.random().toString(36).slice(2, 10);
  }
}

/**
 * Read the existing anonymous identity without creating one. Outbound CTA
 * tracking uses these helpers so disabled/blocked browser storage cannot
 * prevent the best-effort click POST from being attempted.
 */
export function getStoredVisitorId(): string | undefined {
  try {
    return localStorage.getItem("miloosh_vid") ?? undefined;
  } catch {
    return undefined;
  }
}

export function getStoredSessionId(): string | undefined {
  try {
    return sessionStorage.getItem("miloosh_sid") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fire-and-forget: sends one analytics event with the visitor/session IDs
 * and the isTest synthetic marker automatically attached. Never throws,
 * never blocks the caller — a tracking failure must never affect the
 * user's actual navigation or interaction.
 */
export function trackEvent(data: Record<string, unknown>): void {
  try {
    const isTest = markAndCheckSyntheticQa();
    const body = JSON.stringify({
      ...data,
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      isTest,
      // Analytics Zero-Drop Production Proof Mega Mission (2026-08-21)
      // Phase 5: qaRun only ever attached alongside isTest:true — a real/
      // unknown-human event never carries it.
      ...(isTest && getSyntheticQaRun() ? { qaRun: getSyntheticQaRun() } : {}),
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/event", blob);
    } else {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // silent fail
      });
    }
  } catch {
    // silent fail
  }
}
