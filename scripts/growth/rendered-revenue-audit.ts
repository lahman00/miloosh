/** Read-only local-build audit; never follows a vendor or writes analytics.
 * npx tsx scripts/growth/rendered-revenue-audit.ts http://localhost:3227
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl } from "@/lib/affiliate";
import { renderedHtml, internalTarget } from "@/lib/seo/rendered-html";

async function main() {
const origin = new URL(process.argv[2] || "http://localhost:3227");
assert(["localhost", "127.0.0.1"].includes(origin.hostname), "Local QA only");
const directory = path.join(process.cwd(), ".next-miloosh-qa/server/app");
const pages = new Map<string, ReturnType<typeof renderedHtml>>();
function walk(dir: string) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, file.name);
    if (file.isDirectory()) walk(absolute);
    else if (file.name.endsWith(".html")) {
      const route = `/${path.relative(directory, absolute).replace(/\.html$/, "").replace(/^index$/, "")}`;
      pages.set(route, renderedHtml(fs.readFileSync(absolute, "utf8")));
    }
  }
}
walk(directory);
const distances = new Map([["/", 0]]);
const pending = ["/"];
for (let i = 0; i < pending.length; i++) {
  const source = pending[i];
  for (const link of pages.get(source)?.links ?? []) {
    const url = internalTarget(link.href, source);
    if (url && pages.has(url.pathname) && !distances.has(url.pathname) && !link.rel?.split(" ").includes("nofollow")) {
      distances.set(url.pathname, distances.get(source)! + 1);
      pending.push(url.pathname);
    }
  }
}
const sitemapResponse = await fetch(new URL("/sitemap.xml", origin));
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(urls).size, urls.length, "Duplicate sitemap URLs");
assert(urls.every(url => new URL(url).origin === "https://miloosh.com" && !url.includes("?") && !/\/(api|internal)\//.test(url)));
const robots = await (await fetch(new URL("/robots.txt", origin))).text();
assert(robots.includes("Allow: /") && robots.includes("Sitemap: https://miloosh.com/sitemap.xml"));
const rows = [];
const localLinks = new Set<string>();
for (const product of FIRST_REVENUE_PAGES) {
  const route = `/software/${product.slug}`;
  const res = await fetch(new URL(route, origin));
  assert.equal(res.status, 200);
  const html = await res.text();
  const page = renderedHtml(html);
  assert.deepEqual(page.canonicals, [`https://miloosh.com${route}`]);
  assert.equal(page.h1s.length, 1);
  assert(page.title && page.description && !page.robots?.includes("noindex"));
  assert.equal((html.match(/id="buying-decision"/g) ?? []).length, 1);
  assert(html.toLowerCase().includes("affiliate"));
  const destination = getSoftwareCtaUrl(getSoftware(product.slug)!);
  const affiliateLinks = page.links.filter(link => link.href === destination);
  assert(affiliateLinks.length >= 2, "Expected SSR panel and sticky merchant links");
  assert(affiliateLinks.every(link => ["sponsored", "noopener", "noreferrer"].every(rel => link.rel?.split(" ").includes(rel))));
  assert(urls.includes(page.canonicals[0]));
  assert(distances.has(route), "Orphan from initial home HTML");
  const inbound = [...pages].flatMap(([source, sourcePage]) => sourcePage.links.filter(link => internalTarget(link.href, source)?.pathname === route).map(link => ({ source, anchor: link.text, nofollow: Boolean(link.rel?.includes("nofollow")), fragment: internalTarget(link.href, source)?.hash })));
  const brokenFragments = page.links.flatMap(link => {
    const target = internalTarget(link.href, route);
    if (target && !target.pathname.startsWith("/api/")) localLinks.add(target.pathname);
    return target?.hash && pages.has(target.pathname) && !pages.get(target.pathname)!.ids.has(decodeURIComponent(target.hash.slice(1))) ? [link.href] : [];
  });
  assert.deepEqual(brokenFragments, []);
  assert(page.schemas.length >= 2);
  assert.equal(new Set(page.schemas.map(schema => JSON.stringify(schema))).size, page.schemas.length);
  assert(!page.schemas.some(schema => /"(?:aggregateRating|reviewCount|offers)"/.test(JSON.stringify(schema))), "Unverified review/offer schema");
  const inboundTypes = Object.fromEntries(["software", "compare", "category", "other"].map(type => [type, new Set(inbound.filter(link => (link.source.split("/")[1] || "other") === type || (type === "other" && !/^\/(software|compare|category)\//.test(link.source))).map(link => link.source)).size]));
  rows.push({ slug: product.slug, status: res.status, title: page.title, h1: page.h1s[0], canonical: page.canonicals[0], sitemap: true, initialHtml: true, htmlBytes: Buffer.byteLength(html), depth: distances.get(route), inboundSources: new Set(inbound.map(link => link.source)).size, inboundTypes, inbound, affiliateCtas: affiliateLinks.length, schemaTypes: page.schemas.map(schema => schema["@type"]), brokenFragments, queries: product.queries });
}
const linkChecks = [];
for (const route of localLinks) {
  const res = await fetch(new URL(route, origin), { redirect: "manual" });
  linkChecks.push({ route, status: res.status, redirect: res.headers.get("location") });
  await res.body?.cancel();
}
assert(linkChecks.every(link => link.status === 200), JSON.stringify(linkChecks.filter(link => link.status !== 200)));
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), buildDirectory: directory, renderedRoutes: pages.size, sitemapUrls: urls.length, robots, rows, linkChecks, affiliateRequests: 0, analyticsWrites: 0 }, null, 2));
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
