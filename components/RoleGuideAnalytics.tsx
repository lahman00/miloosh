"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track";

/** Tracks only guides resolved by app/[guide]; no catalog enters the client bundle.
 * Legacy /guides/* and /alternatives/* remain owned by FirstPartyAnalytics.
 * The shared sender preserves visitor/session identity and synthetic-QA markers.
 */
export function RoleGuideAnalytics({ guideSlug }: { guideSlug: string }) {
  useEffect(() => {
    // The server resolves the slug; reject malformed values rather than log PII.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guideSlug)) return;
    trackEvent({ type: "guide_view", path: `/${guideSlug}`, guideSlug });
  }, [guideSlug]);

  return null;
}
