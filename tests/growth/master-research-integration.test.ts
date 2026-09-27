import fs from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { GET as getJson } from "@/app/api/research/customer-support-pricing-2026/route";
import { GET as getCsv } from "@/app/api/research/customer-support-pricing-2026/csv/route";
import { GET as getCmsJson } from "@/app/api/research/cms-buying-decision-2026/route";
import { GET as getCmsCsv } from "@/app/api/research/cms-buying-decision-2026/csv/route";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";
import { RESEARCH_PATHS } from "@/lib/analytics/research";
import { getAllSoftware } from "@/data/software";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";
import { getDatasetJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

describe("integrated research release", () => {
  it("discovers exactly the real research hub and assets in the sitemap", async () => {
    const urls = (await sitemap()).map(r => r.url);
    expect(RESEARCH_PATHS).toHaveLength(5);
    for (const path of RESEARCH_PATHS) {
      expect(urls.filter(u => u === `${SITE_URL}${path}`)).toHaveLength(1);
      expect(fs.existsSync(`app${path}/page.tsx`)).toBe(true);
    }
    expect(urls.some(u => u.includes("/api/research/"))).toBe(false);
    expect(fs.readFileSync("components/Footer.tsx", "utf8")).toContain('href: "/research"');
  });
  it("exports all eight CMS rows with public-only fields and explicit scope in both formats", async () => {
    const response = await getCmsJson(), json = await response.json();
    expect(response.status).toBe(200);
    expect(json.rows).toEqual(buildCmsDecisionMatrix().rows);
    expect(json.sampleSize).toBe(8);
    expect(JSON.stringify(json)).not.toMatch(/ownPageEditable|affiliateUrl|CRON_SECRET|protection|receipt|mission brief/);
    const csv = await getCmsCsv(), text = await csv.text();
    expect(csv.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(text.trim().split("\n")).toHaveLength(9);
    expect(text).toContain("export_scope_and_limits");
    expect(text).toContain("evidence gap");
  });
  it("exports the same complete catalog sample as the page, without private fields", async () => {
    const r = await getJson(); const json = await r.json();
    expect(r.status).toBe(200);
    expect(json.rows).toEqual(buildSupportPricingBenchmark().rows);
    expect(json.rows.map((row: { slug: string }) => row.slug).sort()).toEqual(getAllSoftware().filter(s => s.category === "customer-support").map(s => s.slug).sort());
    expect(json.sampleSize).toBe(16);
    expect(JSON.stringify(json)).not.toMatch(/affiliateUrl|partner=miloosh|authorization|CRON_SECRET/);
  });
  it("exports CSV with all 16 rows and the correct download headers", async () => {
    const r = await getCsv(); const text = await r.text();
    expect(r.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("content-disposition")).toContain("customer-support-pricing-benchmark-2026.csv");
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(17);
    expect(lines[0]).toContain("official_source");
    for (const row of buildSupportPricingBenchmark().rows) expect(lines.some(line => line.startsWith(`${row.slug},`))).toBe(true);
  });
  it("Dataset distribution exposes only the real JSON/CSV endpoints", () => {
    const url = "https://miloosh.com/research/customer-support-pricing-2026";
    const distributionUrls: Array<{ contentUrl: string; encodingFormat: "application/json" | "text/csv" }> = [
      { contentUrl: "https://miloosh.com/api/research/customer-support-pricing-2026", encodingFormat: "application/json" },
      { contentUrl: "https://miloosh.com/api/research/customer-support-pricing-2026/csv", encodingFormat: "text/csv" },
    ];
    const schema = getDatasetJsonLd({ name: "Customer Support Pricing Benchmark 2026", description: "Verified catalog observations", url, datePublished: "2026-09-26", dateModified: "2026-09-26", distributionUrls });
    expect(schema).toMatchObject({ "@type": "Dataset", url, distribution: distributionUrls.map(r => ({ "@type": "DataDownload", ...r })) });
  });
});
