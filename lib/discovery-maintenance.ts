import type { Software } from "@/data/software";
import { INDEXING_CONTENT_FRESH_DAYS, INDEXING_PRICING_FRESH_DAYS } from "@/lib/indexing-quality";
import { getSoftwareDiscoveryDecision, isRealPastDate, type DiscoveryBaseline } from "@/lib/discovery-continuity";
import type { IntentionalRemoval } from "@/data/seo/discovery-intentional-removals";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReverificationItem {
  slug: string;
  basis: "strict" | "continuity";
  accessedAt: string;
  pricingLastVerified: string;
  contentDaysOverdue: number;
  pricingDaysOverdue: number;
  /** Earliest date at which a currently fresh date crosses the 90-day limit; null when already overdue. */
  nextDueDate: string | null;
  officialPricingSource: string | null;
  steps: string[];
}

function daysSince(date: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(`${date}T00:00:00.000Z`).getTime()) / DAY_MS);
}

function dueDate(date: string, limit: number): string {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + (limit + 1) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Read-only queue: admitted products whose facts are stale or going stale within `horizonDays`. It lists what a
 * human must re-verify against primary sources; it never edits a date, and a product is not "fresh" until someone
 * actually re-checks the vendor pages and records the new date.
 */
export function buildReverificationQueue(
  software: readonly Software[],
  now: Date,
  baseline: DiscoveryBaseline,
  horizonDays = 14
): ReverificationItem[] {
  const items: ReverificationItem[] = [];
  for (const product of software) {
    const decision = getSoftwareDiscoveryDecision(product, now, baseline);
    if (!decision.eligible || decision.basis === "excluded") continue;
    const pricingDate = product.pricing?.lastVerified ?? "";
    if (!isRealPastDate(product.accessedAt, now) || !isRealPastDate(pricingDate, now)) continue;
    const contentOver = daysSince(product.accessedAt, now) - INDEXING_CONTENT_FRESH_DAYS;
    const pricingOver = daysSince(pricingDate, now) - INDEXING_PRICING_FRESH_DAYS;
    const worst = Math.max(contentOver, pricingOver);
    if (worst < -horizonDays) continue;
    const due = [
      contentOver <= 0 ? dueDate(product.accessedAt, INDEXING_CONTENT_FRESH_DAYS) : null,
      pricingOver <= 0 ? dueDate(pricingDate, INDEXING_PRICING_FRESH_DAYS) : null,
    ].filter((d): d is string => d !== null).sort();
    const steps: string[] = [];
    if (pricingOver > -horizonDays) {
      steps.push("Open the official pricing page and compare every recorded plan, price, billing term and limit; change only what the page shows.");
    }
    if (contentOver > -horizonDays) {
      steps.push("Re-read each listed source for features, limits and constraints; correct any claim that no longer matches.");
    }
    steps.push("Only after the checks, set accessedAt / pricing.lastVerified to the real check date. Do not bump dates without re-verifying.");
    items.push({
      slug: product.slug,
      basis: decision.basis,
      accessedAt: product.accessedAt,
      pricingLastVerified: pricingDate,
      contentDaysOverdue: Math.max(0, contentOver),
      pricingDaysOverdue: Math.max(0, pricingOver),
      nextDueDate: worst > 0 ? null : due[0] ?? null,
      officialPricingSource: product.pricing?.officialSource ?? null,
      steps,
    });
  }
  return items.sort(
    (a, b) =>
      Math.max(b.contentDaysOverdue, b.pricingDaysOverdue) - Math.max(a.contentDaysOverdue, a.pricingDaysOverdue) ||
      (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? "") ||
      a.slug.localeCompare(b.slug)
  );
}

export interface SentinelResult {
  ok: boolean;
  missing: string[];
  waived: string[];
  invalidWaivers: string[];
  staleWaivers: string[];
}

/** Compares current sitemap paths with the baseline; any baseline URL that vanished fails unless exactly waived. */
export function checkDiscoverySentinel(
  currentPaths: ReadonlySet<string>,
  baseline: DiscoveryBaseline,
  removals: readonly IntentionalRemoval[],
  now: Date = new Date()
): SentinelResult {
  const required = [
    ...baseline.software.map((slug) => `/software/${slug}`),
    ...baseline.comparisons.map((slug) => `/compare/${slug}`),
  ];
  const validWaivers = new Map<string, IntentionalRemoval>();
  const invalidWaivers: string[] = [];
  for (const removal of removals) {
    const complete = [removal.reason, removal.evidence, removal.reviewedBy].every((v) => typeof v === "string" && v.trim().length >= 5);
    const exact = /^\/(software|compare)\/[a-z0-9][a-z0-9.-]*$/.test(removal.path ?? "");
    if (complete && exact && required.includes(removal.path) && !validWaivers.has(removal.path) && isRealPastDate(removal.reviewedAt, now)) validWaivers.set(removal.path, removal);
    else invalidWaivers.push(String(removal.path));
  }
  const missing: string[] = [];
  const waived: string[] = [];
  for (const path of required) {
    if (currentPaths.has(path)) continue;
    (validWaivers.has(path) ? waived : missing).push(path);
  }
  const staleWaivers = [...validWaivers.keys()].filter((path) => currentPaths.has(path));
  return { ok: missing.length === 0 && invalidWaivers.length === 0, missing, waived, invalidWaivers, staleWaivers };
}
