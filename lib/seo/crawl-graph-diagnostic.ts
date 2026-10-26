import type { Software } from "@/data/software";
import {
  INDEXING_CONTENT_FRESH_DAYS,
  getSoftwareIndexingQualityReasons,
  type IndexingQualityReason,
} from "@/lib/indexing-quality";

/**
 * Read-only diagnostics for "why is Google not discovering or indexing these
 * URLs": a crawlable internal-link graph measured from rendered HTML, and the
 * date-dependent sitemap quality gate. Pure functions only; the CLI in
 * scripts/growth/crawl-graph-diagnostic.ts does the (public, throttled) GETs.
 */

export type CrawledPage = {
  path: string;
  status: number;
  /** True when a robots meta tag in the HTML contains noindex. */
  noindex: boolean;
  /** Raw href values from the rendered HTML (server output, no JS). */
  hrefs: string[];
};

export type FamilyKey = "comparison" | "software" | "category" | "other";

export function familyOf(path: string): FamilyKey {
  if (path.startsWith("/compare/")) return "comparison";
  if (path.startsWith("/software/")) return "software";
  if (path.startsWith("/category/")) return "category";
  return "other";
}

/** Normalise an href to a same-site path, or null for external/non-page links. */
export function normalizeInternalHref(href: string, siteUrl: string): string | null {
  let value = href.trim();
  if (value.startsWith(siteUrl)) value = value.slice(siteUrl.length) || "/";
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  value = value.split("#")[0].split("?")[0];
  if (value.length > 1) value = value.replace(/\/+$/, "");
  return value || "/";
}

export function normalizeSitemapPath(loc: string, siteUrl: string): string {
  return normalizeInternalHref(loc, siteUrl) ?? loc;
}

export type FamilyGraphStats = {
  pages: number;
  inSitemap: number;
  notInSitemap: number;
  nonOk: number;
  noindex: number;
  /** Counted over pages NOT in the sitemap: the URLs Google can only find by following links. */
  notInSitemapZeroInbound: number;
  notInSitemapOneOrFewerInbound: number;
  /** Not in the sitemap and every inbound link comes from another comparison page. */
  notInSitemapOnlyFromSameFamily: number;
  medianInboundSitemap: number | null;
  medianInboundNotInSitemap: number | null;
};

export type CrawlGraphReport = {
  families: Record<FamilyKey, FamilyGraphStats>;
  /** Sample of orphaned, unsitemapped URLs, alphabetical, for GSC URL Inspection triage. */
  orphanSample: string[];
  /** Pages (any family) whose crawl returned a non-200 status. */
  nonOkPaths: string[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeCrawlGraph(input: {
  pages: CrawledPage[];
  sitemapPaths: string[];
  siteUrl: string;
  orphanSampleSize?: number;
}): CrawlGraphReport {
  const { pages, siteUrl } = input;
  const sitemap = new Set(input.sitemapPaths.map((p) => normalizeSitemapPath(p, siteUrl)));
  const known = new Set(pages.map((p) => p.path));
  const inbound = new Map<string, Set<string>>();

  for (const page of pages) {
    for (const href of page.hrefs) {
      const target = normalizeInternalHref(href, siteUrl);
      if (!target || target === page.path || !known.has(target)) continue;
      if (!inbound.has(target)) inbound.set(target, new Set());
      inbound.get(target)!.add(page.path);
    }
  }

  const empty = (): FamilyGraphStats => ({
    pages: 0,
    inSitemap: 0,
    notInSitemap: 0,
    nonOk: 0,
    noindex: 0,
    notInSitemapZeroInbound: 0,
    notInSitemapOneOrFewerInbound: 0,
    notInSitemapOnlyFromSameFamily: 0,
    medianInboundSitemap: null,
    medianInboundNotInSitemap: null,
  });
  const families: Record<FamilyKey, FamilyGraphStats> = {
    comparison: empty(),
    software: empty(),
    category: empty(),
    other: empty(),
  };
  const countsIn: Record<FamilyKey, number[]> = { comparison: [], software: [], category: [], other: [] };
  const countsOut: Record<FamilyKey, number[]> = { comparison: [], software: [], category: [], other: [] };
  const orphans: string[] = [];
  const nonOkPaths: string[] = [];

  for (const page of pages) {
    const family = familyOf(page.path);
    const stats = families[family];
    const sources = inbound.get(page.path) ?? new Set<string>();
    stats.pages += 1;
    if (page.status !== 200) {
      stats.nonOk += 1;
      nonOkPaths.push(page.path);
    }
    if (page.noindex) stats.noindex += 1;
    if (sitemap.has(page.path)) {
      stats.inSitemap += 1;
      countsIn[family].push(sources.size);
      continue;
    }
    stats.notInSitemap += 1;
    countsOut[family].push(sources.size);
    if (sources.size === 0) {
      stats.notInSitemapZeroInbound += 1;
      orphans.push(page.path);
    }
    if (sources.size <= 1) stats.notInSitemapOneOrFewerInbound += 1;
    if (sources.size > 0 && [...sources].every((s) => familyOf(s) === family)) {
      stats.notInSitemapOnlyFromSameFamily += 1;
    }
  }

  for (const family of Object.keys(families) as FamilyKey[]) {
    families[family].medianInboundSitemap = median(countsIn[family]);
    families[family].medianInboundNotInSitemap = median(countsOut[family]);
  }

  return {
    families,
    orphanSample: orphans.sort().slice(0, input.orphanSampleSize ?? 25),
    nonOkPaths: nonOkPaths.sort(),
  };
}

export type FocusInboundDetail = {
  path: string;
  /** False when the path was not among the crawled pages, so nothing can be said about its links. */
  crawled: boolean;
  status: number | null;
  inSitemap: boolean;
  /** Distinct crawled pages whose server-rendered HTML links to this path. */
  inboundTotal: number;
  inboundByFamily: Record<FamilyKey, number>;
  /** Alphabetical, capped by `sampleSize`, for hand verification against the HTML. */
  inboundSample: string[];
};

/**
 * Per-URL inbound-link detail for a hand-picked set of paths (a recovery cohort).
 * Same link definition as analyzeCrawlGraph (server-rendered hrefs only, self-links ignored, query and
 * fragment stripped). Pure and additive; it does not change analyzeCrawlGraph output.
 */
export function analyzeFocusPaths(input: {
  pages: CrawledPage[];
  sitemapPaths: string[];
  siteUrl: string;
  focusPaths: string[];
  sampleSize?: number;
}): FocusInboundDetail[] {
  const { pages, siteUrl } = input;
  const sitemap = new Set(input.sitemapPaths.map((p) => normalizeSitemapPath(p, siteUrl)));
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const focus = new Set(input.focusPaths.map((p) => normalizeInternalHref(p, siteUrl) ?? p));
  const sources = new Map<string, Set<string>>([...focus].map((p) => [p, new Set<string>()]));

  for (const page of pages) {
    for (const href of page.hrefs) {
      const target = normalizeInternalHref(href, siteUrl);
      if (!target || target === page.path) continue;
      sources.get(target)?.add(page.path);
    }
  }

  return [...focus].sort().map((path) => {
    const page = byPath.get(path);
    const from = [...(sources.get(path) ?? [])].sort();
    const inboundByFamily: Record<FamilyKey, number> = { comparison: 0, software: 0, category: 0, other: 0 };
    for (const source of from) inboundByFamily[familyOf(source)] += 1;
    return {
      path,
      crawled: Boolean(page),
      status: page?.status ?? null,
      inSitemap: sitemap.has(path),
      inboundTotal: from.length,
      inboundByFamily,
      inboundSample: from.slice(0, input.sampleSize ?? 12),
    };
  });
}

export type GateProjectionRow = {
  asOf: string;
  softwareReady: number;
  softwareBlocked: number;
  blockedBy: Partial<Record<IndexingQualityReason, number>>;
  /** Blocked ONLY by freshness (content/pricing >90 days), i.e. recoverable by re-verification alone. */
  blockedOnlyByFreshness: number;
  /** Comparisons that pass discovery rules AND have two ready products. */
  comparisonsEligible: number;
};

const FRESHNESS_REASONS: IndexingQualityReason[] = ["content-freshness", "pricing-freshness"];

/**
 * The sitemap (and the software page's "compare with" links) call
 * isSoftwareIndexingReady(software, new Date()): the gate silently changes with
 * the build date even when no content changes. This projects it forward.
 */
export function projectIndexingGate(input: {
  software: Software[];
  comparisons: ReadonlyArray<readonly [string, string]>;
  discoveryAllowed: (slugA: string, slugB: string) => boolean;
  start: Date;
  offsetsDays: number[];
}): GateProjectionRow[] {
  const bySlug = new Map(input.software.map((s) => [s.slug, s]));
  return input.offsetsDays.map((offset) => {
    const now = new Date(input.start.getTime() + offset * 24 * 60 * 60 * 1000);
    const reasonsBySlug = new Map(
      input.software.map((s) => [s.slug, getSoftwareIndexingQualityReasons(s, now)] as const)
    );
    const blockedBy: Partial<Record<IndexingQualityReason, number>> = {};
    let ready = 0;
    let onlyFresh = 0;
    for (const reasons of reasonsBySlug.values()) {
      if (reasons.length === 0) ready += 1;
      else if (reasons.every((r) => FRESHNESS_REASONS.includes(r))) onlyFresh += 1;
      for (const reason of reasons) blockedBy[reason] = (blockedBy[reason] ?? 0) + 1;
    }
    const eligible = input.comparisons.filter(([a, b]) => {
      return (
        bySlug.has(a) &&
        bySlug.has(b) &&
        input.discoveryAllowed(a, b) &&
        reasonsBySlug.get(a)!.length === 0 &&
        reasonsBySlug.get(b)!.length === 0
      );
    }).length;
    return {
      asOf: now.toISOString().slice(0, 10),
      softwareReady: ready,
      softwareBlocked: input.software.length - ready,
      blockedBy,
      blockedOnlyByFreshness: onlyFresh,
      comparisonsEligible: eligible,
    };
  });
}

export { INDEXING_CONTENT_FRESH_DAYS };
