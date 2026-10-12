/**
 * Products whose data was completed after the production commit and so now pass the indexing quality gate.
 *
 * A held profile (one under a running measurement) lists the comparisons that are ready for indexing. Completing a
 * product's data makes new comparisons ready, which would add links to held profiles and change them. Until the held
 * pages join the new templates (2026-11-04 at the earliest, see data/seo/template-cohorts.json) a held profile
 * leaves out every comparison that involves one of these products, which is exactly what it showed before.
 *
 * Remove an entry when the held pages are released. `npm run check:held-pages` proves the effect on a build.
 */
export const READINESS_CHANGED_AFTER_BASE: readonly string[] = ["freshsales", "nutshell", "obsidian", "slack"];

const CHANGED = new Set<string>(READINESS_CHANGED_AFTER_BASE);

/** The comparison involves a product whose readiness changed after the base commit. */
export function isReadinessFrozen(slugA: string, slugB: string): boolean {
  return CHANGED.has(slugA) || CHANGED.has(slugB);
}
