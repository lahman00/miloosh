import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { shouldSubmitComparisonToSitemap } from "@/data/seo/gsc-sitemap-comparison-cohort";
import {
  analyzeCrawlGraph,
  analyzeFocusPaths,
  normalizeSitemapPath,
  projectIndexingGate,
  type CrawledPage,
} from "@/lib/seo/crawl-graph-diagnostic";

/**
 * GSC recovery triage (2026-10-26). Read-only. Two modes:
 *
 *   gate   (offline) project the date-dependent sitemap quality gate forward.
 *   crawl  GET the site's own public routes (throttled) and measure how many
 *          URLs outside the sitemap have any crawlable inbound internal link.
 *          --focus /a,/b or --focus-file list.txt (one path per line) also reports
 *          per-URL inbound detail for those paths (a recovery cohort).
 *
 * Never requests indexing, submits a sitemap, writes to the site or touches a
 * non-public URL. Output goes to stdout; --out writes the same JSON to a file.
 */

// Explicit: SITE_URL resolves to localhost outside production builds.
const DEFAULT_BASE = "https://miloosh.com";
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HONEST_UA = "MiloooshDiagnostic/1.0 (read-only self-check)";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function focusPathsFromArgs(): string[] {
  const inline = arg("focus")?.split(",") ?? [];
  const file = arg("focus-file");
  const fromFile = file ? readFileSync(file, "utf8").split("\n") : [];
  return [...inline, ...fromFile].map((p) => p.trim()).filter((p) => p.startsWith("/"));
}

function runGate() {
  const software = getAllSoftware();
  const rows = projectIndexingGate({
    software,
    comparisons: PUBLISHED_COMPARISONS,
    discoveryAllowed: (a, b) => shouldSubmitComparisonToSitemap(getComparisonSlug(a, b)),
    start: new Date(arg("start") ?? new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
    offsetsDays: [0, 7, 14, 30, 60],
  });
  return { mode: "gate", softwareTotal: software.length, comparisonsPublished: PUBLISHED_COMPARISONS.length, rows };
}

async function fetchPage(base: string, path: string, ua: string): Promise<CrawledPage> {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { "user-agent": ua },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    const html = response.status === 200 ? await response.text() : "";
    return {
      path,
      status: response.status,
      noindex: /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html),
      hrefs: [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]),
    };
  } catch {
    return { path, status: 0, noindex: false, hrefs: [] };
  }
}

async function runCrawl() {
  const base = arg("base", DEFAULT_BASE)!;
  const ua = arg("ua") === "googlebot" ? GOOGLEBOT_UA : HONEST_UA;
  const concurrency = Math.min(Number(arg("concurrency", "4")), 6);
  const sitemapXml = await (await fetch(`${base}/sitemap.xml`, { headers: { "user-agent": ua } })).text();
  const sitemapPaths = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => normalizeSitemapPath(m[1], base));

  const routes = new Set<string>(["/compare", ...sitemapPaths]);
  for (const [a, b] of PUBLISHED_COMPARISONS) routes.add(`/compare/${getComparisonSlug(a, b)}`);
  for (const item of getAllSoftware()) routes.add(`/software/${item.slug}`);
  const limit = Number(arg("limit", "0"));
  const queue = [...routes].sort().slice(0, limit > 0 ? limit : undefined);

  const pages: CrawledPage[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < queue.length) {
        pages.push(await fetchPage(base, queue[cursor++], ua));
      }
    })
  );

  const report = analyzeCrawlGraph({ pages, sitemapPaths, siteUrl: base });
  const focusPaths = focusPathsFromArgs();
  const focus = focusPaths.length > 0 ? analyzeFocusPaths({ pages, sitemapPaths, siteUrl: base, focusPaths }) : undefined;
  return {
    mode: "crawl",
    base,
    userAgent: ua === GOOGLEBOT_UA ? "googlebot-string" : "diagnostic",
    crawledAt: new Date().toISOString(),
    pagesCrawled: pages.length,
    sitemapUrls: sitemapPaths.length,
    ...report,
    ...(focus ? { focus } : {}),
  };
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "gate" && mode !== "crawl") {
    console.error("usage: crawl-graph-diagnostic <gate|crawl> [--base URL] [--ua googlebot] [--concurrency N<=6] [--limit N] [--focus /a,/b] [--focus-file list.txt] [--out file.json]");
    process.exit(2);
  }
  const result = mode === "gate" ? runGate() : await runCrawl();
  const json = JSON.stringify(result, null, 2);
  const out = arg("out");
  if (out) writeFileSync(out, json + "\n");
  console.log(json);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
