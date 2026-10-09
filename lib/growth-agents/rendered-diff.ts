/**
 * Does a change alter what the site renders? Two production builds (the base commit and the candidate) each leave
 * one prerendered HTML file per static page. This module compares them after removing the parts that differ on every
 * build without meaning anything: content-hashed asset names, framework script payloads, deployment markers and
 * whitespace. What stays is what a visitor and a crawler read: title, description, canonical, robots, Open Graph,
 * structured data (JSON-LD), headings, text, links and call-to-action markup.
 *
 * Pure: it receives file contents and returns a verdict. Reading the two build folders is the caller's job.
 */

/** Everything in a prerendered page that is build noise rather than content. */
export function normalizeRenderedHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (script) => (/type\s*=\s*["']application\/ld\+json["']/i.test(script) ? script : ""))
    .replace(/<noscript>\s*<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/_next\/static\/[^"'\s)>]+/g, "/_next/static/<asset>")
    .replace(/\s(data-dpl-id|nonce|data-nscript)\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/([?&])dpl=[A-Za-z0-9_-]+/g, "$1dpl=<id>")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

export type RenderedComparison = {
  /** Pages present in both builds. */
  compared: number;
  /** Of those, pages whose normalized HTML differs. */
  differing: number;
  differingSample: string[];
  onlyInBase: string[];
  onlyInCandidate: string[];
};

/** `base` and `candidate` map a page path (such as "software/clickup.html") to its HTML. */
export function compareRendered(base: ReadonlyMap<string, string>, candidate: ReadonlyMap<string, string>, sampleSize = 10): RenderedComparison {
  const onlyInBase = [...base.keys()].filter((key) => !candidate.has(key)).sort();
  const onlyInCandidate = [...candidate.keys()].filter((key) => !base.has(key)).sort();
  const shared = [...base.keys()].filter((key) => candidate.has(key)).sort();
  const differing = shared.filter((key) => normalizeRenderedHtml(base.get(key)!) !== normalizeRenderedHtml(candidate.get(key)!));
  return { compared: shared.length, differing: differing.length, differingSample: differing.slice(0, sampleSize), onlyInBase, onlyInCandidate };
}
