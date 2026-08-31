"use client";

import { useEffect } from "react";
import { markAndCheckSyntheticQa } from "@/lib/analytics/synthetic";

/**
 * Phase 1E (2026-08-17) — fires once per page load when the URL carries
 * utm_medium=social (the tag lib/social/utm.ts puts on every outbound
 * social link). Plain window.location.search read in an effect rather
 * than next/navigation's useSearchParams, deliberately — that hook
 * forces a Suspense boundary around anything that uses it, and this
 * component is mounted once in the root layout for every page on the
 * site; not worth restructuring the layout's Suspense boundaries for a
 * beacon that only ever does something on a small fraction of loads.
 * sessionStorage dedupes so a re-render (e.g. React Strict Mode's
 * double-invoke in dev) or an in-tab back/forward never double-counts
 * the same landing — scoped to the tab's session, not a persistent or
 * cross-session identifier.
 */
export function SocialLandingCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("utm_medium") !== "social") return;

    const contentId = params.get("utm_content") ?? "";
    const dedupeKey = `miloosh_social_landing_${contentId || params.toString()}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, "1");
    } catch {
      // sessionStorage unavailable (private mode, etc.) — proceed without dedupe rather than skip the beacon entirely.
    }

    const body = JSON.stringify({
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      path: window.location.pathname,
      isTest: markAndCheckSyntheticQa(),
    });

    fetch("/api/social/landing", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {
      // Best-effort — a failed beacon must never affect the visitor's page.
    });
  }, []);

  return null;
}
