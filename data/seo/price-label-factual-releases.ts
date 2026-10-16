/**
 * Scope-limited owner decision, 2026-10-17: published monthly-equivalent
 * rates falsely appear to be annual totals on these three profiles.
 * These pages are excluded from price-label preservation ONLY, NOT from
 * other protection registries or their experiments. A correction must not
 * change amounts, pricing facts, CTAs, affiliate links or unrelated content.
 *
 * After changing this file, regenerate the hold and independently compare
 * complete rendered builds. This registry alone never authorizes a release.
 */
export const OWNER_PRICE_LABEL_FACTUAL_RELEASES = {
  pipedrive: {
    approvedOn: "2026-10-17",
    evidence: "https://www.pipedrive.com/en/pricing",
    reason: "$14 is a monthly per-seat rate billed annually; not $14 per year.",
  },
  front: {
    approvedOn: "2026-10-17",
    evidence: "https://front.com/pricing",
    reason: "$25 is a monthly per-seat rate billed annually; not $25 per year.",
  },
  ticktick: {
    approvedOn: "2026-10-17",
    evidence: "https://ticktick.com/about/upgrade",
    reason: "$49.99 is a genuine per-year price; show the yearly unit explicitly.",
  },
} as const;
