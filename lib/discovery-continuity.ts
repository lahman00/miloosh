import type { Software } from "@/data/software";
import { getComparisonSlug } from "@/data/comparisons";
import { DISCOVERY_BASELINE } from "@/data/seo/discovery-baseline";
import { getSoftwareIndexingQualityReasons, type IndexingQualityReason } from "@/lib/indexing-quality";

/**
 * Separates QUALITY ADMISSION (is this page structurally worth submitting?) from FACT REVERIFICATION (is a price or
 * date older than 90 days?). The strict gate in lib/indexing-quality.ts is unchanged and still decides every NEW
 * admission. A URL that was already admitted in the baseline keeps its sitemap entry and internal links when the ONLY
 * remaining failures are the two age checks and both dates are real, past dates. The stale dates stay stale (see
 * lib/discovery-maintenance.ts for the re-verification queue); nothing here makes a fact look current.
 */

export interface DiscoveryBaseline {
  version: number;
  capturedAtUtc: string;
  sourceSha: string;
  sitemapSha256: string;
  software: readonly string[];
  comparisons: readonly string[];
}

const AGE_ONLY_REASONS: ReadonlySet<IndexingQualityReason> = new Set(["content-freshness", "pricing-freshness"]);
const SLUG = /^[a-z0-9][a-z0-9.-]*$/;

export function isRealPastDate(value: string | undefined, now: Date): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const stamp = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(stamp.getTime()) || stamp.toISOString().slice(0, 10) !== value) return false;
  return stamp.getTime() <= now.getTime();
}

function isSortedUnique(items: readonly unknown[]): boolean {
  return items.every((item, index) => typeof item === "string" && SLUG.test(item) && (index === 0 || item > (items[index - 1] as string)));
}

/** Returns the reasons the registry cannot be trusted; empty means valid. */
export function validateDiscoveryBaseline(baseline: unknown): string[] {
  const b = baseline as Partial<DiscoveryBaseline> | null;
  if (!b || typeof b !== "object") return ["registry is not an object"];
  const problems: string[] = [];
  if (b.version !== 1) problems.push("unsupported version");
  if (typeof b.capturedAtUtc !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(b.capturedAtUtc) || Number.isNaN(Date.parse(b.capturedAtUtc)) || new Date(b.capturedAtUtc).toISOString().replace(".000Z", "Z") !== b.capturedAtUtc.replace(".000Z", "Z")) problems.push("invalid capturedAtUtc");
  if (typeof b.sourceSha !== "string" || !/^[0-9a-f]{40}$/.test(b.sourceSha)) problems.push("invalid sourceSha");
  if (typeof b.sitemapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(b.sitemapSha256)) problems.push("invalid sitemapSha256");
  if (!Array.isArray(b.software) || b.software.length === 0 || !isSortedUnique(b.software)) problems.push("software list invalid, unsorted or duplicated");
  if (!Array.isArray(b.comparisons) || b.comparisons.length === 0 || !isSortedUnique(b.comparisons)) problems.push("comparison list invalid, unsorted or duplicated");
  return problems;
}

export type DiscoveryBasis = "strict" | "continuity" | "excluded";

export interface DiscoveryDecision {
  eligible: boolean;
  basis: DiscoveryBasis;
  /** Full strict-gate reasons, unchanged; kept visible even when continuity admits the page. */
  strictReasons: IndexingQualityReason[];
  /** Reasons that actually block continuity (empty when basis is strict or continuity). */
  blockingReasons: string[];
}

interface Lookups {
  software: ReadonlySet<string>;
  comparisons: ReadonlySet<string>;
}

function lookupsFor(baseline: DiscoveryBaseline): Lookups | null {
  const lookups = validateDiscoveryBaseline(baseline).length === 0
    ? { software: new Set(baseline.software), comparisons: new Set(baseline.comparisons) }
    : null;
  return lookups;
}

export function getSoftwareDiscoveryDecision(
  software: Software,
  now: Date = new Date(),
  baseline: DiscoveryBaseline = DISCOVERY_BASELINE
): DiscoveryDecision {
  const strictReasons = getSoftwareIndexingQualityReasons(software, now);
  // Date validity is evidence, not age: never accept future/normalised-invalid dates even when the strict age check is empty.
  const dateProblems: string[] = [];
  if (!isRealPastDate(software.accessedAt, now)) dateProblems.push("content-date-invalid");
  if (!isRealPastDate(software.pricing?.lastVerified, now)) dateProblems.push("pricing-date-invalid");
  if (dateProblems.length) return { eligible: false, basis: "excluded", strictReasons, blockingReasons: dateProblems };
  if (strictReasons.length === 0) return { eligible: true, basis: "strict", strictReasons, blockingReasons: [] };

  const lookups = lookupsFor(baseline);
  const blockingReasons: string[] = strictReasons.filter((reason) => !AGE_ONLY_REASONS.has(reason));
  if (!lookups || Date.parse(baseline.capturedAtUtc) > now.getTime()) blockingReasons.push("baseline-invalid");
  else if (!lookups.software.has(software.slug)) blockingReasons.push("not-in-baseline");
  // An age failure only counts as "merely old" when the date is a real, non-future calendar date. Missing, malformed
  // or future dates are provenance faults and must not be retained.
  if (!isRealPastDate(software.accessedAt, now)) blockingReasons.push("content-date-invalid");
  if (!isRealPastDate(software.pricing?.lastVerified, now)) blockingReasons.push("pricing-date-invalid");

  const unique = [...new Set(blockingReasons)];
  return unique.length === 0
    ? { eligible: true, basis: "continuity", strictReasons, blockingReasons: [] }
    : { eligible: false, basis: "excluded", strictReasons, blockingReasons: unique };
}

export function isSoftwareDiscoveryEligible(software: Software, now?: Date, baseline?: DiscoveryBaseline): boolean {
  return getSoftwareDiscoveryDecision(software, now, baseline).eligible;
}

/**
 * Both products must be discovery-eligible, and the pair is admitted when either it passes the strict gate or this
 * exact ordered pair slug is in the baseline. Two baseline products never make an arbitrary pair eligible.
 * Callers still apply shouldSubmitComparisonToSitemap (the deliberate suppression cohort) and publication checks.
 */
export function isComparisonDiscoveryEligible(
  softwareA: Software,
  softwareB: Software,
  comparisonSlug: string,
  now: Date = new Date(),
  baseline: DiscoveryBaseline = DISCOVERY_BASELINE
): boolean {
  if (comparisonSlug !== getComparisonSlug(softwareA.slug, softwareB.slug)) return false;
  const a = getSoftwareDiscoveryDecision(softwareA, now, baseline);
  const b = getSoftwareDiscoveryDecision(softwareB, now, baseline);
  if (!a.eligible || !b.eligible) return false;
  if (a.basis === "strict" && b.basis === "strict") return true;
  const lookups = lookupsFor(baseline);
  return Boolean(lookups?.comparisons.has(comparisonSlug));
}
