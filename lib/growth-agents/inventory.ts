import type { Software } from "@/data/software";
import { getSoftwareIndexingQualityReasons, type IndexingQualityReason } from "@/lib/indexing-quality";
import { CANONICAL_ORIGIN, classifyPage, comparisonUrl, softwareUrl, type KnownRoutes, type PageIdentity } from "./urls";

/**
 * A read-only picture of what the checked-out code publishes: which URLs exist,
 * which are in the sitemap, which products stand behind each page, and whether
 * each page passes the repository's own indexing-quality gate.
 *
 * `buildSiteInventory` is pure so it can be tested on small fixtures;
 * `loadSiteInventory` gathers the real registries.
 */

export type InventoryComparison = { slug: string; softwareSlugs: [string, string] };

export type PageInventoryEntry = {
  url: string;
  identity: PageIdentity;
  title: string | null;
  /** Product slugs whose records feed this page: [slug] for a software page, [a, b] for a comparison. */
  softwareSlugs: string[];
  /**
   * Other products this software page shows a call to action for: the options of its buyer checklist and the
   * alternatives of its decision guide. A partner listed here is shown on this page even though the page is about a
   * different product. The plain "alternatives" cards carry no call to action and are not counted. Empty for every
   * other page type.
   */
  otherCtaSlugs: string[];
  category: string | null;
  /** Latest `accessedAt` among the feeding product records. */
  contentAccessedAt: string | null;
  /** True when the checked-out sitemap builder lists the page. This is the code, not Google's view. */
  inSitemap: boolean;
  /** Indexing-quality gate result; null for pages the gate does not govern. */
  qualityGate: { ready: boolean; reasons: IndexingQualityReason[] } | null;
};

export type SiteInventory = {
  checkoutSha: string;
  generatedAt: string;
  pages: Map<string, PageInventoryEntry>;
  routes: KnownRoutes;
  comparisons: Map<string, InventoryComparison>;
  softwareBySlug: Map<string, { name: string; category: string; accessedAt: string }>;
  sitemapPaths: Set<string>;
};

export type InventoryInput = {
  checkoutSha: string;
  now: Date;
  software: readonly Software[];
  comparisons: ReadonlyArray<readonly [string, string]>;
  comparisonSlug: (a: string, b: string) => string;
  categories: ReadonlyArray<{ slug: string; name?: string }>;
  guideSlugs: readonly string[];
  legalPaths: readonly string[];
  /** Paths (not full URLs) the sitemap builder emits, so the inventory is independent of the configured origin. */
  sitemapPaths: readonly string[];
  /** Products a software page shows a call to action for besides its own (buyer-checklist options, decision-guide alternatives). */
  otherCtaSlugsOf?: (softwareSlug: string) => readonly string[];
};

function pathFromSitemapUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.length > 1 && parsed.pathname.endsWith("/") ? parsed.pathname.slice(0, -1) : parsed.pathname || "/";
  } catch {
    return url;
  }
}

export function sitemapPathsFromEntries(entries: ReadonlyArray<{ url: string }>): string[] {
  return entries.map((entry) => pathFromSitemapUrl(entry.url));
}

export function buildSiteInventory(input: InventoryInput): SiteInventory {
  const sitemapPaths = new Set(input.sitemapPaths);
  const routes: KnownRoutes = {
    guideSlugs: new Set(input.guideSlugs),
    legalPaths: new Set(input.legalPaths),
  };
  const bySlug = new Map(input.software.map((s) => [s.slug, s]));
  const softwareBySlug = new Map(input.software.map((s) => [s.slug, { name: s.name, category: s.category, accessedAt: s.accessedAt }]));
  const pages = new Map<string, PageInventoryEntry>();
  const comparisons = new Map<string, InventoryComparison>();

  const add = (entry: Omit<PageInventoryEntry, "identity" | "inSitemap" | "otherCtaSlugs"> & { path: string; otherCtaSlugs?: string[] }) => {
    const { path, otherCtaSlugs, ...rest } = entry;
    pages.set(rest.url, { ...rest, otherCtaSlugs: otherCtaSlugs ?? [], identity: classifyPage(rest.url, routes), inSitemap: sitemapPaths.has(path) });
  };

  add({ url: `${CANONICAL_ORIGIN}/`, path: "/", title: "Home", softwareSlugs: [], category: null, contentAccessedAt: null, qualityGate: null });

  for (const software of input.software) {
    const reasons = getSoftwareIndexingQualityReasons(software, input.now);
    add({
      url: softwareUrl(software.slug),
      path: `/software/${software.slug}`,
      title: software.name,
      softwareSlugs: [software.slug],
      otherCtaSlugs: [...new Set(input.otherCtaSlugsOf?.(software.slug) ?? [])].filter((slug) => slug !== software.slug && bySlug.has(slug)),
      category: software.category,
      contentAccessedAt: software.accessedAt,
      qualityGate: { ready: reasons.length === 0, reasons },
    });
  }

  for (const [a, b] of input.comparisons) {
    const left = bySlug.get(a);
    const right = bySlug.get(b);
    if (!left || !right) continue;
    const slug = input.comparisonSlug(a, b);
    comparisons.set(slug, { slug, softwareSlugs: [a, b] });
    const reasons = [...new Set([...getSoftwareIndexingQualityReasons(left, input.now), ...getSoftwareIndexingQualityReasons(right, input.now)])];
    add({
      url: comparisonUrl(slug),
      path: `/compare/${slug}`,
      title: `${left.name} vs ${right.name}`,
      softwareSlugs: [a, b],
      category: left.category === right.category ? left.category : null,
      contentAccessedAt: left.accessedAt > right.accessedAt ? left.accessedAt : right.accessedAt,
      qualityGate: { ready: reasons.length === 0, reasons },
    });
  }

  for (const category of input.categories) {
    add({
      url: `${CANONICAL_ORIGIN}/category/${category.slug}`,
      path: `/category/${category.slug}`,
      title: category.name ?? category.slug,
      softwareSlugs: [],
      category: category.slug,
      contentAccessedAt: null,
      qualityGate: null,
    });
  }

  for (const slug of input.guideSlugs) {
    add({ url: `${CANONICAL_ORIGIN}/${slug}`, path: `/${slug}`, title: slug, softwareSlugs: [], category: null, contentAccessedAt: null, qualityGate: null });
  }

  for (const path of input.legalPaths) {
    add({ url: `${CANONICAL_ORIGIN}${path}`, path, title: path.slice(1), softwareSlugs: [], category: null, contentAccessedAt: null, qualityGate: null });
  }

  return {
    checkoutSha: input.checkoutSha,
    generatedAt: input.now.toISOString(),
    pages,
    routes,
    comparisons,
    softwareBySlug,
    sitemapPaths,
  };
}

/**
 * Pages whose rendered content would change if the target's source data were edited.
 * A software record feeds its own page and every comparison involving it; a comparison
 * is built from both product records. Anything else stands alone.
 */
export function derivedUrls(inventory: SiteInventory, targetUrl: string): string[] {
  const entry = inventory.pages.get(targetUrl);
  if (!entry) return [targetUrl];
  const out = new Set<string>([targetUrl]);
  if (entry.identity.kind === "software" && entry.identity.slug) {
    for (const comparison of inventory.comparisons.values()) {
      if (comparison.softwareSlugs.includes(entry.identity.slug)) out.add(comparisonUrl(comparison.slug));
    }
  } else if (entry.identity.kind === "compare") {
    for (const slug of entry.softwareSlugs) out.add(softwareUrl(slug));
  }
  return [...out].sort();
}

export function isPublishedUrl(inventory: SiteInventory, url: string): boolean {
  return inventory.pages.has(url);
}
