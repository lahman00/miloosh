import type { Software } from "@/data/software";
import { INDEXING_CONTENT_FRESH_DAYS, INDEXING_PRICING_FRESH_DAYS } from "@/lib/indexing-quality";

/**
 * Pure helpers for the organic-recovery cohort report (docs/mission/ORGANIC_RECOVERY_COHORT_20261026.md).
 * Read-only: they describe a product record and a Search Console query table, nothing more.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function addDaysIso(isoDate: string, days: number): string | null {
  const t = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  return Number.isNaN(t) ? null : new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

export type FreshnessExpiry = {
  /** First build date on which the 90-day content gate (accessedAt) reports `content-freshness`. Null when the date is unreadable. */
  contentGateFailsOn: string | null;
  /** First build date on which the 90-day pricing gate reports `pricing-freshness`. Null when pricing has no verification date. */
  pricingGateFailsOn: string | null;
};

/** getSoftwareIndexingQualityReasons fails when ageDays > 90, i.e. from the 91st day after the recorded date. */
export function freshnessExpiry(software: Pick<Software, "accessedAt" | "pricing">): FreshnessExpiry {
  return {
    contentGateFailsOn: addDaysIso(software.accessedAt, INDEXING_CONTENT_FRESH_DAYS + 1),
    pricingGateFailsOn: software.pricing?.lastVerified ? addDaysIso(software.pricing.lastVerified, INDEXING_PRICING_FRESH_DAYS + 1) : null,
  };
}

/** Host without `www.`; null for anything that is not an absolute URL. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sameSite(a: string, b: string): boolean {
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

export type SourceTransparency = {
  sourceCount: number;
  /** Cited sources whose host is neither the product's own site nor its official pricing source. */
  foreignHosts: string[];
  hasOfficialPricingSource: boolean;
  /** Cited sources that are not absolute URLs. */
  unreadable: string[];
};

/**
 * Source transparency of one product record. A foreign host is not automatically wrong (a vendor can document
 * an integration on a partner site), it is a prompt for a human to confirm the source belongs on this page.
 */
export function sourceTransparency(software: Pick<Software, "website" | "sources" | "pricing">): SourceTransparency {
  const own = [hostOf(software.website), software.pricing?.officialSource ? hostOf(software.pricing.officialSource) : null].filter(
    (host): host is string => Boolean(host)
  );
  const foreign = new Set<string>();
  const unreadable: string[] = [];
  for (const source of software.sources) {
    const host = hostOf(source);
    if (!host) unreadable.push(source);
    else if (!own.some((o) => sameSite(host, o))) foreign.add(host);
  }
  return {
    sourceCount: new Set([...software.sources, ...(software.pricing?.officialSource ? [software.pricing.officialSource] : [])]).size,
    foreignHosts: [...foreign].sort(),
    hasOfficialPricingSource: Boolean(software.pricing?.officialSource),
    unreadable,
  };
}

export type QueryRow = { query: string; impressions: number; clicks: number; position: number };

export type QueryNameMatch = {
  term: string;
  queries: number;
  impressions: number;
  clicks: number;
  /** Impression-weighted average position, rounded to one decimal. Null when no query matched. */
  position: number | null;
  top: QueryRow[];
};

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Query rows whose words contain every word of `term`. This is a NAME MATCH over a property-wide table: it says
 * the query mentions the product, never that the query landed on a particular Miloosh page. Different terms can
 * match the same row, so totals across terms must not be added together. Only the rows Search Console lists are
 * counted (anonymised queries are absent).
 */
export function queryNameMatch(rows: readonly QueryRow[], term: string, topN = 5): QueryNameMatch {
  const wanted = tokens(term);
  const matched = wanted.length === 0 ? [] : rows.filter((row) => {
    const have = new Set(tokens(row.query));
    return wanted.every((word) => have.has(word));
  });
  const impressions = matched.reduce((sum, row) => sum + row.impressions, 0);
  const weighted = matched.reduce((sum, row) => sum + row.position * row.impressions, 0);
  return {
    term,
    queries: matched.length,
    impressions,
    clicks: matched.reduce((sum, row) => sum + row.clicks, 0),
    position: impressions > 0 ? Math.round((weighted / impressions) * 10) / 10 : null,
    top: [...matched].sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query)).slice(0, topN),
  };
}
