export type NetworkPerformanceSignal = {
  partnerSlug: string;
  observedAt: string;
  source: "first-party-email";
  network: string;
  signal: "CLICK_MILESTONE" | "NEW_CLICKS";
  clickFloor: number | null;
  summary: string;
  provesConversion: false;
  provesRevenue: false;
};

/**
 * First-party network-side performance evidence only.
 *
 * These signals are deliberately kept separate from Miloosh first-party
 * outbound-click telemetry because vendor/network emails do not tell us
 * whether every click was a unique human, a QA click, or which Miloosh page
 * generated it. Never promote these rows to conversions or revenue without
 * downstream network evidence.
 */
export const NETWORK_PERFORMANCE_SIGNALS: readonly NetworkPerformanceSignal[] = [
  {
    partnerSlug: "krispcall",
    observedAt: "2026-08-24",
    source: "first-party-email",
    network: "PartnerStack / KrispCall",
    signal: "CLICK_MILESTONE",
    clickFloor: 10,
    summary: "KrispCall reported that the referral link reached 10+ clicks.",
    provesConversion: false,
    provesRevenue: false,
  },
  {
    partnerSlug: "whatconverts",
    observedAt: "2026-08-18",
    source: "first-party-email",
    network: "PartnerStack / WhatConverts",
    signal: "NEW_CLICKS",
    clickFloor: null,
    summary: "WhatConverts reported new referral-link clicks; no exact count was provided.",
    provesConversion: false,
    provesRevenue: false,
  },
] as const;
