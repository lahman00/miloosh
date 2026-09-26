import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { readBuild } from "@/lib/google-war/graph";
import { renderedHtml, attributes } from "@/lib/seo/rendered-html";
import { RESEARCH_PATHS } from "@/lib/analytics/research";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";
import { authorityBrowserProof } from "./authority-browser-proof";

async function main() {
  assert(process.argv.includes("--production-read-only"), "Explicit production-read-only flag required");
  const origin = "https://miloosh.com", output = "var/growth/google-command/production";
  fs.mkdirSync(output, { recursive: true });
  const build = readBuild(".next-miloosh-qa"), rows = [], downloads = [];
  const request = (p: string) => fetch(origin + p, { redirect: "manual", signal: AbortSignal.timeout(25000), headers: { "User-Agent": "MilooshReadOnlyReleaseQA/1.0" } });
  for (const route of ["/", "/software/pipedrive", "/software/freshdesk", "/compare/pipedrive-vs-close", "/guides", "/category/crm", ...RESEARCH_PATHS]) {
    const response = await request(route), body = await response.text(), actual = renderedHtml(body);
    const expected = renderedHtml(build.html.get(route)!);
    const schemas = actual.schemas.map(s => s["@type"]);
    const og = [...body.matchAll(/<meta\b[^>]*>/g)].map(m => attributes(m[0])).filter(a => a.property?.startsWith("og:"));
    assert.equal(response.status, 200, route);
    assert.deepEqual(actual.canonicals, expected.canonicals, route);
    assert.equal(actual.title, expected.title, route);
    assert.equal(actual.description, expected.description, route);
    assert.equal(actual.robots, expected.robots, route);
    assert.equal(actual.h1s.length, 1, route);
    assert(schemas.includes("Organization"), route);
    assert(og.some(a => a.property === "og:title" && a.content), route);
    assert(og.some(a => a.property === "og:description" && a.content), route);
    if (["/research/customer-support-pricing-2026", "/research/crm-plan-gates-2026"].includes(route)) {
      const dataset = actual.schemas.find(s => s["@type"] === "Dataset");
      assert(dataset, route); assert.equal(dataset.dateModified, "2026-09-27");
      assert.equal(dataset.distribution.length, 2);
    }
    rows.push({ route, status: response.status, title: actual.title, description: actual.description, canonical: actual.canonicals, robots: actual.robots, schemas, openGraph: og, expectedMatches: true });
  }
  const categories = await request("/categories");
  // This project uses /#categories and /category/[slug], not /categories.
  rows.push({ route: "/categories", status: categories.status, expectedMatches: categories.status === 404, note: "Pre-existing unsupported route; navbar uses /#categories; /category/crm verified above. No invented new route." });
  assert.equal(categories.status, 404, "Reconcile unexpected categories routing change");
  for (const slug of ["customer-support-pricing-2026", "crm-plan-gates-2026"]) {
    const jsonResponse = await request("/api/research/" + slug), csvResponse = await request("/api/research/" + slug + "/csv");
    const json = await jsonResponse.json(), csv = await csvResponse.text();
    const expected = slug.startsWith("customer") ? buildSupportPricingBenchmark().rows : buildCrmPlanGateDataset().rows;
    assert.equal(jsonResponse.status, 200); assert.equal(csvResponse.status, 200);
    assert(jsonResponse.headers.get("content-type")?.includes("application/json"));
    assert(csvResponse.headers.get("content-type")?.includes("text/csv"));
    assert.equal(json.sampleSize, expected.length); assert.deepEqual(json.rows, expected);
    assert.equal(csv.trim().split("\n").length, expected.length + 1);
    assert(!/affiliateUrl|CRON_SECRET|authorization/.test(JSON.stringify(json)));
    downloads.push({ slug, jsonStatus: 200, csvStatus: 200, rows: expected.length, jsonType: jsonResponse.headers.get("content-type"), csvType: csvResponse.headers.get("content-type"), csvBytes: Buffer.byteLength(csv), disposition: csvResponse.headers.get("content-disposition"), exactLocalRows: true });
  }
  const sitemapResponse = await request("/sitemap.xml"), sitemap = await sitemapResponse.text();
  assert.equal(sitemapResponse.status, 200);
  for (const route of RESEARCH_PATHS) assert(sitemap.includes("<loc>" + origin + route + "</loc>"));
  fs.writeFileSync(path.join(output, "health.json"), JSON.stringify({ capturedAt: new Date().toISOString(), origin, artifactHash: build.artifactHash, rows, downloads, sitemap: { status: 200, researchPaths: RESEARCH_PATHS }, writes: 0 }, null, 2));
  await authorityBrowserProof(origin, path.join(output, "browser"), true);
  console.log("PASS: production health, metadata/schema/download parity and intercepted browser journeys; zero writes or merchant requests");
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Production QA failed"); process.exitCode = 1; });
