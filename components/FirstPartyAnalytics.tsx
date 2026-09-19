"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { extractReferrerHost, normalizeTrafficSource } from "@/lib/analytics/attribution";

const ATTRIBUTION_CAPTURED_KEY = "miloosh_attribution_captured";

/**
 * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase 8:
 * attribution is a landing-page property, not a per-pageview one — UTM
 * params only ever appear on the entry URL, and re-deriving traffic
 * source from an internal navigation's absent referrer/UTMs would
 * wrongly reclassify an already-attributed session as "direct" on its
 * second page view. Captured once per browser tab session (sessionStorage-
 * gated, same pattern as lib/analytics/synthetic.ts's QA marker).
 *
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) real gap:
 * every social post's link is already tagged with utm_content=<queue
 * entry id> at publish time (lib/social/utm.ts) — a genuine, unique
 * per-post identifier — but nothing ever read utm_content out of the
 * landing URL, so true post-level attribution ("which specific post
 * brought this visitor") was structurally impossible despite the tag
 * existing on every link. Added alongside the other three UTM fields,
 * same capture/cap/privacy treatment.
 */
function captureLandingAttribution(): { referrerHost?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; trafficSource: ReturnType<typeof normalizeTrafficSource> } | null {
  try {
    if (sessionStorage.getItem(ATTRIBUTION_CAPTURED_KEY) === "1") return null;
    sessionStorage.setItem(ATTRIBUTION_CAPTURED_KEY, "1");

    const params = new URLSearchParams(window.location.search);
    const referrerHost = extractReferrerHost(document.referrer);
    const utmSource = params.get("utm_source")?.slice(0, 64) || undefined;
    const utmMedium = params.get("utm_medium")?.slice(0, 64) || undefined;
    const utmCampaign = params.get("utm_campaign")?.slice(0, 64) || undefined;
    const utmContent = params.get("utm_content")?.slice(0, 64) || undefined;

    return {
      referrerHost,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      trafficSource: normalizeTrafficSource({ referrerHost, utmSource, utmMedium }),
    };
  } catch {
    return null;
  }
}

export function FirstPartyAnalytics() {
  const pathname = usePathname();
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 2026-08-22 engaged_view forensics: this ref is set fresh every time the
  // effect (re)runs, i.e. exactly when the 10-second dwell timer is armed.
  // Real elapsed time is computed from it when the timer fires, instead of
  // the previous hardcoded `durationSeconds: 10` — that hardcoding is what
  // made a genuinely-impossible-fast engaged_view (found via real session
  // forensics: two sessions showed a <1.5s page_view->engaged_view gap
  // against a 10-second timer) indistinguishable from a real one once
  // stored. The leading explanation for how it happens at all: sessionStorage
  // (and therefore the session ID) is copied when a browser tab is
  // duplicated, but in-memory JS state — including this timer — is not; an
  // already-progressed timer in the original tab can fire shortly after a
  // fresh page_view from the duplicate, both under the same session ID.
  // This can't be prevented client-side (it's inherent browser behavior,
  // not a bug in this component), so the real fix is to stop asserting a
  // false "10" and let the server refuse to trust an implausible value.
  const dwellStartedAtRef = useRef<number>(0);

  useEffect(() => {
    // Skip if running in headless automation or prerender
    if (typeof window === "undefined") return;

    // 1. Page view — attribution fields only attached on this tab
    // session's first page view (see captureLandingAttribution above).
    trackEvent({
      type: "page_view",
      path: pathname,
      ...captureLandingAttribution(),
    });

    // 2. Specialized page views
    if (pathname.startsWith("/software/")) {
      const softwareSlug = pathname.replace("/software/", "").split("/")[0];
      if (softwareSlug) {
        trackEvent({ type: "software_view", path: pathname, softwareSlug });
      }
    } else if (pathname.startsWith("/compare/") && pathname !== "/compare") {
      const comparisonSlug = pathname.replace("/compare/", "").split("/")[0];
      if (comparisonSlug) {
        trackEvent({ type: "comparison_view", path: pathname, comparisonSlug });
      }
    } else if (pathname.startsWith("/category/")) {
      const categorySlug = pathname.replace("/category/", "").split("/")[0];
      if (categorySlug) {
        trackEvent({ type: "category_view", path: pathname, categorySlug });
      }
    } else if (pathname.startsWith("/guides/") || pathname.startsWith("/alternatives/")) {
      const guideSlug = pathname.replace(/^\/(guides|alternatives)\//, "").split("/")[0];
      if (guideSlug) {
        trackEvent({ type: "guide_view", path: pathname, guideSlug });
      }
    } else if (pathname.startsWith("/recommend/results")) {
      trackEvent({ type: "recommend_use", path: pathname });
    }

    // 3. Engaged view timer (>10 seconds on page)
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    dwellStartedAtRef.current = Date.now();
    dwellTimerRef.current = setTimeout(() => {
      const actualElapsedSeconds = Math.round((Date.now() - dwellStartedAtRef.current) / 1000);
      trackEvent({ type: "engaged_view", path: pathname, durationSeconds: actualElapsedSeconds });
    }, 10000);

    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, [pathname]);

  return null;
}
