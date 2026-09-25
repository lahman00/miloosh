export type NetworkPerformanceSignal = {
  partnerSlug: string;
  observedAt: string;
  source: "first-party-email";
  network: string;
  /** REFERRAL_SIGNUP_NOTIFICATION: a vendor notice that a referred account signed up. Not a paid customer, commission or payout. */
  signal: "CLICK_MILESTONE" | "NEW_CLICKS" | "REFERRAL_SIGNUP_NOTIFICATION";
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
  {
    // Recorded in docs/work-revenue-execution-2026-09-10.md; the email's own
    // date is not in the repo. cloro has no catalog page or ledger record.
    partnerSlug: "cloro",
    observedAt: "2026-09-10",
    source: "first-party-email",
    network: "cloro (program/network not recorded in repo)",
    signal: "REFERRAL_SIGNUP_NOTIFICATION",
    clickFloor: null,
    summary: "cloro notified Miloosh of one referred signup. This is not evidence of a paid customer, an approved commission or a payout, and does not identify a verified external human.",
    provesConversion: false,
    provesRevenue: false,
  },
] as const;
