import { measured, unavailable, type Measured, type Provenance } from "./evidence";
import { canonicalPageUrl } from "./urls";

/**
 * What a public Miloosh page says about itself: its status, canonical, robots directives and the sponsored calls to
 * action it actually renders. This module only parses text a caller fetched; it never touches the network, so the
 * parsing rules are tested on fixed HTML. The fetching adapter lives in `live-check-source.ts`.
 *
 * "Indexable" here means only that nothing on the page or in its response blocks indexing and that the page names
 * itself as canonical. It says nothing about whether Google has indexed the URL.
 */

export type LiveObservation = {
  url: string;
  finalUrl: string;
  status: number;
  /** Every hop followed on the way to `finalUrl`, in order, each a Miloosh URL. */
  redirectChain: string[];
  xRobotsTag: string | null;
  contentType: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  title: string | null;
  h1Count: number;
  structuredDataBlocks: number;
  /** Visible text of every link whose `rel` contains `sponsored`. */
  sponsoredAnchorTexts: string[];
};

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripTags = (html: string): string => decodeEntities(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** The value of one attribute inside a single tag, with either quote style. */
function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return match ? decodeEntities(match[1] ?? match[2] ?? "") : null;
}

function tagsOf(html: string, tagName: string): string[] {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))].map((m) => m[0]);
}

export function parseLivePage(input: {
  url: string;
  finalUrl: string;
  status: number;
  redirectChain?: string[];
  headers: { xRobotsTag?: string | null; contentType?: string | null };
  html: string;
}): LiveObservation {
  const html = input.html;
  const head = html.slice(0, html.search(/<\/head>/i) >= 0 ? html.search(/<\/head>/i) : html.length);

  const canonicalTag = tagsOf(head, "link").find((tag) => (attr(tag, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"));
  const robotsTags = tagsOf(head, "meta").filter((tag) => ["robots", "googlebot"].includes((attr(tag, "name") ?? "").toLowerCase()));
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);

  const sponsoredAnchorTexts: string[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const rel = (attr(`<a${match[1]}>`, "rel") ?? "").toLowerCase().split(/\s+/);
    if (rel.includes("sponsored")) sponsoredAnchorTexts.push(stripTags(match[2]!));
  }

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    status: input.status,
    redirectChain: input.redirectChain ?? [],
    xRobotsTag: input.headers.xRobotsTag ?? null,
    contentType: input.headers.contentType ?? null,
    canonical: canonicalTag ? attr(canonicalTag, "href") : null,
    robotsMeta: robotsTags.length > 0 ? robotsTags.map((tag) => attr(tag, "content") ?? "").filter(Boolean).join(", ") || null : null,
    title: titleMatch ? stripTags(titleMatch[1]!) : null,
    h1Count: tagsOf(html, "h1").length,
    structuredDataBlocks: [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi)].length,
    sponsoredAnchorTexts,
  };
}

const hasNoindex = (directive: string | null): boolean => (directive ?? "").toLowerCase().split(/[\s,]+/).some((token) => token === "noindex" || token === "none");

export type LiveVerdict = { status: number; canonical: string | null; robotsMeta: string | null; xRobotsTag: string | null; indexable: boolean; reasons: string[] };

/** Whether anything on the page or in its response blocks indexing, with every reason spelled out. */
export function judgeLivePage(obs: LiveObservation): LiveVerdict {
  const reasons: string[] = [];
  const own = canonicalPageUrl(obs.url);
  if (obs.status !== 200) reasons.push(`HTTP ${obs.status}`);
  if (obs.redirectChain.length > 0 || (canonicalPageUrl(obs.finalUrl) !== own && own !== null)) reasons.push(`the URL redirects to ${obs.finalUrl}`);
  if (obs.contentType && !/html/i.test(obs.contentType)) reasons.push(`content type is ${obs.contentType}`);
  if (hasNoindex(obs.robotsMeta)) reasons.push(`robots meta says ${obs.robotsMeta}`);
  if (hasNoindex(obs.xRobotsTag)) reasons.push(`X-Robots-Tag says ${obs.xRobotsTag}`);
  if (!obs.canonical) reasons.push("no canonical link");
  else if (canonicalPageUrl(obs.canonical) !== own) reasons.push(`canonical points to ${obs.canonical}`);
  return { status: obs.status, canonical: obs.canonical, robotsMeta: obs.robotsMeta, xRobotsTag: obs.xRobotsTag, indexable: reasons.length === 0, reasons };
}

const normalizeName = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** "Visit Monday.com" and "Visit Monday.com's Official Site" both name Monday.com. */
export function productNameOfAnchor(text: string): string {
  return text
    .replace(/^(visit|try|get started with|start with)\s+/i, "")
    .replace(/['’]s official site$/i, "")
    .trim();
}

export type RenderedCtas = { sponsoredLinkCount: number; partnerSlugs: string[]; unmatchedAnchorTexts: string[] };

/** Maps the sponsored links a page renders to active partners by the product name in the link text. */
export function renderedCtasOf(obs: LiveObservation, partnerNames: ReadonlyMap<string, string>): RenderedCtas {
  const slugs = new Set<string>();
  const unmatched = new Set<string>();
  for (const text of obs.sponsoredAnchorTexts) {
    const slug = partnerNames.get(normalizeName(productNameOfAnchor(text)));
    if (slug) slugs.add(slug);
    else unmatched.add(text);
  }
  return { sponsoredLinkCount: obs.sponsoredAnchorTexts.length, partnerSlugs: [...slugs].sort(), unmatchedAnchorTexts: [...unmatched].sort() };
}

/** Name lookup for `renderedCtasOf`: both the display name and the slug resolve to the partner's slug. */
export function partnerNameIndex(partners: ReadonlyArray<{ slug: string; name: string }>): Map<string, string> {
  const index = new Map<string, string>();
  for (const partner of partners) {
    index.set(normalizeName(partner.name), partner.slug);
    index.set(normalizeName(partner.slug), partner.slug);
  }
  return index;
}

export type LiveExtras = {
  url: string;
  live: Measured<{ status: number; canonical: string | null; robotsMeta: string | null; xRobotsTag: string | null; indexable: boolean }>;
  rendered: Measured<RenderedCtas>;
};

/** The per-page evidence the Google Recovery agent reads, from one observation. */
export function liveExtrasOf(obs: LiveObservation, partnerNames: ReadonlyMap<string, string>, capturedAt: string): LiveExtras {
  const verdict = judgeLivePage(obs);
  const provenance: Provenance = {
    source: "live-page-get",
    locator: obs.url,
    capturedAt,
    caveat: verdict.indexable ? "A public GET of the page. It does not show what Google has indexed." : `A public GET of the page. Blocking facts: ${verdict.reasons.join("; ")}.`,
  };
  return {
    url: obs.url,
    live: measured({ status: verdict.status, canonical: verdict.canonical, robotsMeta: verdict.robotsMeta, xRobotsTag: verdict.xRobotsTag, indexable: verdict.indexable }, provenance),
    rendered: measured(renderedCtasOf(obs, partnerNames), { ...provenance, caveat: "Sponsored links found in the page HTML. The link targets are never followed or recorded." }),
  };
}

/** The entry written for a URL that could not be read: unavailable, never a guess. */
export function failedLiveExtras(url: string, reason: string): LiveExtras {
  return { url, live: unavailable(reason), rendered: unavailable(reason) };
}
