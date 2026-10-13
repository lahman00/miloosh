"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Candidate builds can contain production GA configuration; don't mount it before verification. */
export function RuntimeAnalyticsGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/runtime-mode", { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok && (await response.json()).analyticsEnabled === true)
      .then(allowed => { if (!controller.signal.aborted) setEnabled(allowed); })
      .catch(() => { if (!controller.signal.aborted) setEnabled(false); });
    return () => controller.abort();
  }, []);
  return enabled ? children : null;
}
