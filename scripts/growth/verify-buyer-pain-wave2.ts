/** Read-only release check. Fetches Miloosh GET routes only; never follows a vendor CTA. */
import assert from "node:assert/strict";
import { BUYER_PAIN_WAVE2_GUIDES as guides } from "../../data/guides/buyer-pain-wave2-guides";
import { BUYER_PAIN_WAVE2_BRIEFS as briefs } from "../../data/guides/buyer-pain-wave2-briefs";
import { getSoftware } from "../../data/software";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "../../lib/affiliate";

const origin = new URL(process.argv[2] ?? "https://miloosh.com");
assert(["miloosh.com", "www.miloosh.com", "localhost", "127.0.0.1"].includes(origin.hostname) || /^flowtemplate-[a-z0-9-]+\.vercel\.app$/.test(origin.hostname), "Only the known Miloosh deployment or localhost is allowed");
assert(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === "/", "Use a bare origin without credentials or query parameters");

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function attrs(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
}
function text(html: string): string { return decode(html.replace(/<[^>]*>/g, "")).trim(); }
async function get(path: string): Promise<{ status: number; html: string; noindex: boolean }> {
  assert(path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/api/"), "Public read-only paths only");
  const url = new URL(path, origin);
  url.searchParams.set("qa", "1");
  url.searchParams.set("qaRun", "buyer_wave2_http");
  // Reject redirects rather than risk following a link outside the known origin.
  const response = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(30000) });
  return { status: response.status, html: await response.text(), noindex: /noindex/i.test(response.headers.get("x-robots-tag") ?? "") };
}

async function main() {
  const pages = [], related = new Set<string>(), categories = new Map<string, string[]>();
  let commercial = 0, affiliate = 0;
  for (const [slug, guide] of Object.entries(guides)) {
    const response = await get(`/${slug}`), html = response.html;
    assert.equal(response.status, 200, slug);
    const visibleText = text(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ""));
    assert(visibleText.includes(guide.intro), `${slug}: current buyer introduction`);
    for (const profile of guide.products) {
      for (const field of [profile.fitReason, profile.limitations, profile.pricingNote])
        assert(visibleText.includes(field), `${slug}/${profile.slug}: current rendered profile`);
    }
    for (const section of briefs[slug].sections) for (const paragraph of section.paragraphs)
      assert(visibleText.includes(paragraph), `${slug}: current worksheet paragraph`);
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    assert.equal(h1s.length, 1, `${slug}: one H1`);
    assert.equal(text(h1s[0][1]), guide.title, `${slug}: deployed title`);
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0]));
    assert.equal(links.find(a => a.rel === "canonical")?.href, `https://miloosh.com/${slug}`);
    const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attrs(m[0]));
    assert.equal(metas.find(a => a.name === "description")?.content, guide.metaDescription);
    assert(!response.noindex && !metas.some(a => /robots/i.test(a.name ?? "") && /noindex/i.test(a.content ?? "")), `${slug}: indexable`);
    const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = schemas.find(s => s["@type"] === "FAQPage");
    assert(faq, `${slug}: FAQ schema`);
    assert.deepEqual(faq.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => ({ question: q.name, answer: q.acceptedAnswer.text })), guide.faqs);
    assert.equal([...html.matchAll(/<details\b/g)].length, 6, `${slug}: visible FAQ controls`);
    const anchors: Array<Record<string, string> & { label: string }> = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m => ({ ...attrs(m[1]), label: text(m[2]) }));
    const ctas = anchors.filter(a => a.target === "_blank" && /^Visit(?: Site| )/.test(a.label));
    assert.equal(ctas.length, 8, `${slug}: eight commercial placements`);
    for (const profile of guide.products) {
      const product = getSoftware(profile.slug)!;
      const expectedUrl = getSoftwareCtaUrl(product), expectedRel = getSoftwareCtaRel(product);
      const matches = ctas.filter(a => a.href === expectedUrl);
      assert.equal(matches.length, 2, `${slug}/${profile.slug}: summary and card use canonical URL`);
      for (const a of matches) assert.equal(a.rel, expectedRel);
      if (shouldShowAffiliateDisclosure(product)) affiliate += matches.length;
      related.add(`/software/${profile.slug}`);
    }
    commercial += ctas.length;
    const expectsDisclosure = guide.products.some(p => shouldShowAffiliateDisclosure(getSoftware(p.slug)!));
    assert.equal(html.includes("Editorial Independence &amp; Disclosure:"), expectsDisclosure, `${slug}: commercial disclosure`);
    for (const s of briefs[slug].sources) {
      const link = anchors.find(a => a.href === s.url && a.label === s.title);
      assert(link && link.rel === "noopener noreferrer", `${slug}: direct editorial source ${s.id}`);
    }
    for (const a of anchors.filter(a => a.href?.startsWith("#"))) assert(html.includes(`id="${a.href.slice(1)}"`), `${slug}: in-page target ${a.href}`);
    for (const c of guide.comparisons) related.add(`/compare/${c}`);
    for (const g of briefs[slug].relatedGuides ?? []) related.add(g.href);
    const category = `/category/${guide.categorySlug}`;
    categories.set(category, [...(categories.get(category) ?? []), slug]);
    pages.push({ slug, status: response.status, canonical: `https://miloosh.com/${slug}`, h1: guide.title, faqs: 6, commercialCtas: ctas.length, disclosure: expectsDisclosure });
  }
  const routeResults = [];
  for (const path of related) {
    const response = await get(path);
    assert.equal(response.status, 200, `Related route: ${path}`);
    routeResults.push({ path, status: response.status });
  }
  for (const [path, slugs] of categories) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    for (const slug of slugs) assert(response.html.includes(`href="/${slug}"`), `${path} links to ${slug}`);
  }
  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  for (const slug of Object.keys(guides)) assert(sitemap.html.includes(`<loc>https://miloosh.com/${slug}</loc>`), `Sitemap: ${slug}`);
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), origin: origin.origin, result: "PASS", pages, commercialCtas: commercial, affiliateCtas: affiliate, directCtas: commercial - affiliate, editorialSources: Object.values(briefs).reduce((n, b) => n + b.sources.length, 0), relatedRoutes: routeResults, categoryInboundPaths: [...categories.keys()], sitemap: "PASS", vendorDestinationsFetched: 0, mutations: 0 }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Verification failed"); process.exitCode = 1; });
