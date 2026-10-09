/**
 * URL normalisation and page-kind classification for Miloosh pages.
 *
 * Search Console reports the www and apex hosts as separate pages even though
 * production redirects www to the apex, so every metric is keyed by one
 * canonical URL and the original variants are kept for provenance.
 */

export const CANONICAL_ORIGIN = "https://miloosh.com";
const ACCEPTED_HOSTS = new Set(["miloosh.com", "www.miloosh.com"]);

export type PageKind = "home" | "software" | "compare" | "category" | "guide" | "legal" | "other";

/** Route knowledge that cannot be derived from the path alone. Supplied by an adapter; empty by default. */
export type KnownRoutes = {
  /** Slugs of root-level role/decision guides, for example "best-crm-for-startups". */
  guideSlugs?: ReadonlySet<string>;
  /** Root-level legal/trust paths, for example "/privacy". */
  legalPaths?: ReadonlySet<string>;
};

/** Returns the canonical https apex URL without query, fragment or trailing slash, or null when the input is not a Miloosh page URL. */
export function canonicalPageUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!ACCEPTED_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.username || url.password || url.port) return null;
  let path = url.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path === "/" || path === "" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${path}`;
}

export function pathOf(canonicalUrl: string): string {
  return canonicalUrl.startsWith(CANONICAL_ORIGIN) ? canonicalUrl.slice(CANONICAL_ORIGIN.length) || "/" : canonicalUrl;
}

export type PageIdentity = {
  url: string;
  kind: PageKind;
  /** Software slug, comparison slug, category slug or guide slug; null for home/legal/other. */
  slug: string | null;
};

export function classifyPage(canonicalUrl: string, routes: KnownRoutes = {}): PageIdentity {
  const path = pathOf(canonicalUrl);
  if (path === "/") return { url: canonicalUrl, kind: "home", slug: null };
  const segments = path.split("/").filter(Boolean);
  const [first, second] = segments;
  if (first === "software" && second && segments.length === 2) return { url: canonicalUrl, kind: "software", slug: second };
  if (first === "compare" && second && segments.length === 2) return { url: canonicalUrl, kind: "compare", slug: second };
  if (first === "compare" && segments.length === 1) return { url: canonicalUrl, kind: "other", slug: null };
  if (first === "category" && second && segments.length === 2) return { url: canonicalUrl, kind: "category", slug: second };
  if (segments.length === 1 && routes.legalPaths?.has(path)) return { url: canonicalUrl, kind: "legal", slug: null };
  if (segments.length === 1 && first && routes.guideSlugs?.has(first)) return { url: canonicalUrl, kind: "guide", slug: first };
  return { url: canonicalUrl, kind: "other", slug: null };
}

export function softwareUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/software/${slug}`;
}

export function comparisonUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/compare/${slug}`;
}
