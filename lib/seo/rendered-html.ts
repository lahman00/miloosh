/** Narrow reader for Next's emitted, quoted-attribute HTML, not an HTML sanitizer. */
export function decodeHtml(value: string): string {
  return value.replace(/&(?:amp|quot|#x27|#39|lt|gt);/g, entity => ({ "&amp;": "&", "&quot;": '"', "&#x27;": "'", "&#39;": "'", "&lt;": "<", "&gt;": ">" })[entity]!);
}
export function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], decodeHtml(match[2] ?? match[3])]));
}
export function renderedHtml(html: string) {
  const plain = (text: string) => decodeHtml(text.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  const links: Array<Record<string, string> & { text: string }> = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match => ({ ...attributes(match[1]), text: plain(match[2]) }));
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => attributes(match[0]));
  const canonicals = [...html.matchAll(/<link\b[^>]*>/g)].map(match => attributes(match[0])).filter(a => a.rel === "canonical").map(a => a.href);
  const schemas = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match => attributes(match[1]).type === "application/ld+json").map(match => JSON.parse(match[2]));
  return {
    links, canonicals, schemas,
    title: plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    h1s: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(match => plain(match[1])),
    description: metas.find(meta => meta.name === "description")?.content,
    robots: metas.find(meta => meta.name === "robots")?.content,
    ids: new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => decodeHtml(match[1]))),
  };
}
export function internalTarget(href: string | undefined, source: string): URL | undefined {
  if (!href) return;
  try {
    const url = new URL(href, `https://miloosh.com${source}`);
    if (url.origin === "https://miloosh.com") return url;
  } catch { /* Invalid links remain absent, never fetched. */ }
}
