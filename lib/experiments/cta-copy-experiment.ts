/**
 * MILOOSH CTA CONVERSION OPTIMIZATION MISSION (2026-08-23), Phase 7 — the
 * first controlled CTA experiment. ONE variable only: wording. Everything
 * else (destination, position, size, color, icon) is identical between
 * arms.
 *
 * HYPOTHESIS (unproven, being tested — not asserted as true): a CTA that
 * explicitly names the destination as the vendor's "Official Site" reads
 * as more trustworthy / less ambiguous than a bare "Visit {Name}", and
 * increases the rate at which visitors who see the CTA actually click it.
 *
 * Why this wording and not something stronger ("Get pricing", "Start free
 * trial", "Best deal"): getSoftwareCtaUrl() (lib/affiliate.ts) resolves to
 * the vendor's general homepage/affiliate landing page, NOT a
 * pricing-specific or trial-specific URL for most entries — claiming
 * "pricing" or "free trial" in the CTA text would describe a destination
 * the link doesn't actually deliver for every product, violating this
 * mission's own copy rule ("CTA copy must describe the actual
 * destination"). "Official Site" is accurate for every entry regardless
 * of affiliate status, since it always ends up on that vendor's real site
 * (see the CTA's own `rel="sponsored"` disclosure for the affiliate case).
 *
 * Scope: SOFTWARE PAGE PRIMARY CTA ONLY (ctaLocation "software-page-cta"),
 * per the mission's explicit "narrow scope" instruction. The comparison-
 * page and guide-page CTAs use the same TrackedCtaLink component and COULD
 * carry this same experiment, but are deliberately left out of this first
 * pass — see PROJECT.md for why.
 */

export const CTA_COPY_EXPERIMENT_ID = "software-cta-copy-v1";

export type CtaCopyVariant = "control" | "treatment";

/**
 * Deterministic, stable per visitor: the same visitorId always resolves to
 * the same variant, on every page load and every session, for as long as
 * this experiment runs. A simple string hash (not cryptographic — doesn't
 * need to be) mod 2. No cookies, no new identifiers — reuses the existing
 * anonymous visitorId already stored in localStorage for all other first-
 * party analytics.
 */
export function assignCtaCopyVariant(visitorId: string): CtaCopyVariant {
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = (hash * 31 + visitorId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? "control" : "treatment";
}

/**
 * CONTROL is the pre-experiment copy, byte-for-byte — every other CTA
 * location on the site still renders exactly this, so control is never a
 * synthetic baseline, it's the real unchanged experience.
 */
export function getCtaCopyLabel(variant: CtaCopyVariant, softwareName: string): string {
  return variant === "treatment" ? `Visit ${softwareName}'s Official Site` : `Visit ${softwareName}`;
}
