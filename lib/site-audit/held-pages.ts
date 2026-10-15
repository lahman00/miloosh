import { parsePageFacts } from "./page-facts";

/**
 * Whether a page that is under a running measurement changed between two builds.
 *
 * The footer is excluded because it is shared by every page and has its own consistency check; Twitter metadata
 * is excluded because the owner approved correcting it on every page. The same metadata fix completes Open Graph
 * with url, site name, locale and type, which the route metadata used to drop; adding those keys is allowed, changing
 * any existing Open Graph value is not. Everything else a visitor or a crawler can see is compared: title,
 * description, canonical, robots, Open Graph, structured data, links and visible text.
 */

const COMPLETED_OG_KEYS = ["url", "site_name", "locale", "type"];

const FOOTER = /<footer\b[\s\S]*?<\/footer>/gi;

function structuredData(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.stringify(JSON.parse(match[1]!)));
    } catch {
      blocks.push(`INVALID:${match[1]}`);
    }
  }
  return blocks;
}

function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i += 1;
  return `at character ${i}: before "${a.slice(Math.max(0, i - 30), i + 60)}" / after "${b.slice(Math.max(0, i - 30), i + 60)}"`;
}

/** Reasons a held page differs between two builds; empty when it is unchanged. */
export function heldPageChanges(path: string, before: string, after: string): string[] {
  const x = parsePageFacts(path, before.replace(FOOTER, ""));
  const y = parsePageFacts(path, after.replace(FOOTER, ""));
  const reasons: string[] = [];
  for (const key of ["title", "description", "canonical", "robots"] as const) if (x[key] !== y[key]) reasons.push(`${key} changed`);
  const ogBefore = x.og;
  const ogAfter = Object.fromEntries(Object.entries(y.og).filter(([key]) => !(COMPLETED_OG_KEYS.includes(key) && !(key in ogBefore))));
  if (JSON.stringify(Object.entries(ogBefore).sort()) !== JSON.stringify(Object.entries(ogAfter).sort())) reasons.push("Open Graph changed");
  if (JSON.stringify(structuredData(before)) !== JSON.stringify(structuredData(after))) reasons.push("structured data changed");
  const links = (facts: typeof x) => facts.anchors.map((anchor) => `${anchor.href} [${anchor.rel}]`).sort();
  const linksBefore = links(x);
  const linksAfter = links(y);
  if (JSON.stringify(linksBefore) !== JSON.stringify(linksAfter)) {
    const added = linksAfter.filter((link) => !linksBefore.includes(link));
    const removed = linksBefore.filter((link) => !linksAfter.includes(link));
    reasons.push(`links changed (added ${added.slice(0, 3).join(", ") || "none"}; removed ${removed.slice(0, 3).join(", ") || "none"})`);
  }
  if (x.text !== y.text) reasons.push(`text changed ${firstDifference(x.text, y.text)}`);
  return reasons;
}
