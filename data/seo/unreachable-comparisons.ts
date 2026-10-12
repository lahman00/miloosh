import { isComparisonDiscoverySuppressed } from "./gsc-sitemap-comparison-cohort";

/**
 * Comparison pages that nothing leads a crawler to.
 *
 * A comparison page is found in one of two ways: it is listed in the sitemap, or an indexable page links to it.
 * The discovery cohort (gsc-sitemap-comparison-cohort.ts) keeps ~800 pairs out of the sitemap because they had
 * no Search visibility, and the only internal links to them are the "Related comparisons" block on other
 * comparison pages, which shows each product's first four pairs. A pair that is late in both products' lists
 * is therefore linked from nowhere: not in the sitemap, not linked, yet still `index, follow`.
 *
 * Measured on 2026-10-12 on the production build of 0f54439 plus the audit fixes of the same day
 * (`npm run check:built-site`): 383 indexable comparison pages were unreachable, 325 with no inbound link at
 * all and 58 linked only from those 325. One of them (clickup-vs-zoho-projects) is in the protected
 * comparison-quality experiment and is deferred below; the other 382 are in the generated list.
 *
 * Decision (owner, 2026-10-12): keep the quality gate and the sitemap as they are and take these pages out of
 * the index instead of leaving them as indexable pages that cannot be found. They stay live, canonical to
 * themselves and followable (`noindex, follow`), so nothing is deleted and nothing redirects.
 *
 * The rule is self-lifting. A page is noindex only while it is listed here AND still discovery-suppressed.
 * Promoting a pair into GSC_SITEMAP_PRIORITY_INCLUDE_COMPARISONS puts it in the sitemap and lifts the noindex
 * with no edit to this file; so does rewriting it and promoting it as part of a priority wave.
 *
 * The list is generated from the built HTML, because "unreachable" is a property of the rendered link graph.
 * `npm run check:built-site` fails when an indexable page is unreachable and not listed; regenerate with
 * `npm run build && npm run check:built-site -- --write-unreachable` and review the diff.
 */
export const UNREACHABLE_SUPPRESSED_COMPARISONS: readonly string[] = [
  // generated:begin - do not edit by hand; run `npm run check:built-site -- --write-unreachable`
  // generated:end
];

/**
 * Unreachable pages that must keep their current indexation for now. The post-build audit reports them as
 * deferred until the date passes, then fails until they are handled like the rest.
 */
export const UNREACHABLE_COMPARISON_DEFERRALS: Readonly<Record<string, { until: string; reason: string }>> = {
  "clickup-vs-zoho-projects": {
    until: "2026-11-04",
    reason: "Protected: part of the comparison-quality experiment cohort (data/experiments/comparison-quality-cohort.ts). Owner decision 2026-10-12: protected pages wait until 2026-11-04.",
  },
};

const LISTED = new Set<string>(UNREACHABLE_SUPPRESSED_COMPARISONS);

/** Listed as unreachable AND still suppressed. The two arguments exist so the rule can be tested with other lists. */
export function isUnreachableAndSuppressed(slug: string, listed: ReadonlySet<string>, isSuppressed: (slug: string) => boolean): boolean {
  return listed.has(slug) && isSuppressed(slug);
}

/** The comparison page is taken out of the index: nothing leads a crawler to it and it is outside the discovery priority set. */
export function isUnreachableSuppressedComparison(slug: string): boolean {
  return isUnreachableAndSuppressed(slug, LISTED, isComparisonDiscoverySuppressed);
}
