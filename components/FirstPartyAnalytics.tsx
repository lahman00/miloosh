"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { observeEngagedView } from "@/lib/analytics/engaged-view";
import { isResearchPath, researchLinkEvent } from "@/lib/analytics/research";

export function FirstPartyAnalytics() {
  const pathname = usePathname();
  const lastReportedPath = useRef<string | null>(null);

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
      if (isResearchPath(pathname)) {
        trackEvent({ type: "research_page_view", path: pathname });
      } else if (pathname.startsWith("/software/")) {
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

    // 3. Hidden/background time is not engagement. Cleanup cancels the old
    // page's observer on navigation and React's development effect replay.
    return observeEngagedView(durationSeconds => {
      trackEvent({ type: "engaged_view", path: pathname, durationSeconds });
    });
  }, [pathname]);

  useEffect(() => {
    if (!isResearchPath(pathname)) return;
    const clicked = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("main a[href]") : null;
      // Commercial outbound wrappers already own their telemetry. Never click,
      // intercept navigation, copy link text, or send the full external URL.
      if (!anchor || anchor.dataset.milooshLink === "commercial") return;
      const data = researchLinkEvent(pathname, anchor.href, window.location.origin);
      if (data) trackEvent(data);
    };
    document.addEventListener("click", clicked);
    document.addEventListener("auxclick", clicked);
    return () => { document.removeEventListener("click", clicked); document.removeEventListener("auxclick", clicked); };
  }, [pathname]);

  return null;
}
