import { renderedHtml } from "@/lib/seo/rendered-html";
export function researchTechnicalQa(route: string, html: string | undefined, sitemap: string, allHtml: Map<string, string>) {
  if (!html) return { url: route, status: "MISSING", noindex: false, failures: ["Research route not emitted"] };
  const parsed = renderedHtml(html), canonical = `https://miloosh.com${route}`, failures: string[] = [];
  if (parsed.canonicals.length !== 1 || parsed.canonicals[0] !== canonical) failures.push("Canonical mismatch");
  if (parsed.h1s.length !== 1 || !parsed.title || !parsed.description) failures.push("Missing/duplicate heading or metadata");
  if (parsed.robots?.includes("noindex")) failures.push("Research noindexed");
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) failures.push("Not in emitted sitemap");
  if (!parsed.schemas.length) failures.push("No rendered structured data");
  const inbound = [...allHtml].filter(([from, body]) => from !== route && renderedHtml(body).links.some(a => a.href === route || a.href === canonical)).map(([from]) => from);
  if (!inbound.length) failures.push("No rendered inbound discovery");
  return { url: route, status: failures.length ? "BLOCKED" : "PASS", canonical: parsed.canonicals, title: parsed.title, description: parsed.description,
    noindex: Boolean(parsed.robots?.includes("noindex")), schemaTypes: parsed.schemas.map(s => s["@type"] ?? "graph"), inboundPages: inbound.length,
    outgoingInternal: parsed.links.filter(a => a.href?.startsWith("/")).map(a => a.href), failures, scope: "Local artifact, not production or Google inclusion" };
}
