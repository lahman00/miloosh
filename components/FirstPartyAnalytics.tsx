"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

export function FirstPartyAnalytics() {
  const pathname = usePathname();
  const lastReportedPath = useRef<string | null>(null);
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

    // React StrictMode replays setup/cleanup in development. Do not turn the
    // replay into a second visit; real A -> B -> A navigation still counts.
    if (lastReportedPath.current !== pathname) {
      lastReportedPath.current = pathname;
      // 1. Page view — the shared sender captures session acquisition once
      // and repeats its bounded snapshot on subsequent funnel events.
      trackEvent({
        type: "page_view",
        path: pathname,
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
