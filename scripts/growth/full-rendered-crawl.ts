import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { readBuild } from "@/lib/google-war/graph";
import { renderedHtml } from "@/lib/seo/rendered-html";

/** Entire emitted public surface, one browser page at a time. Never discovers
 * actions through links or follows merchants. Production requires an explicit
 * post-integration flag; default is localhost. No clicks or form submissions. */
async function main() {
  const origin = new URL(process.argv[2] ?? "http://localhost:3246");
  if (!["localhost", "127.0.0.1"].includes(origin.hostname) && !(origin.origin === "https://miloosh.com" && process.argv.includes("--production-read-only"))) throw new Error("Unsupported crawl origin");
  const build = readBuild(".next-miloosh-qa");
  const output = "var/growth/google-command/crawl";
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.MILOOSH_QA_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const rows = []; let blocked = 0;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await context.route("**/*", route => {
    const req = route.request(), u = new URL(req.url());
    if (req.method() !== "GET" || u.origin !== origin.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/internal/")) { blocked++; return route.abort(); }
    return route.continue();
  });
  try {
    const page = await context.newPage();
    for (const route of [...build.html.keys()].sort()) {
      const url = new URL(route, origin); url.searchParams.set("qa", "1"); url.searchParams.set("qaRun", "google-command-crawl");
      try {
        const response = await page.goto(url.href, { waitUntil: "networkidle", timeout: 20_000 });
        const html = renderedHtml(await page.content());
        rows.push({ route, status: response?.status() ?? null, finalPath: new URL(page.url()).pathname,
          canonical: html.canonicals, h1Count: html.h1s.length, noindex: Boolean(html.robots?.includes("noindex")),
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      } catch { rows.push({ route, error: "Navigation did not complete; no retry or zero-imputation" }); }
    }
  } finally { await browser.close(); }
  const failures = rows.filter(r => "error" in r || r.status !== 200 || r.finalPath !== r.route || r.overflow);
  fs.writeFileSync(path.join(output, "latest.json"), JSON.stringify({ capturedAt: new Date().toISOString(), origin: origin.origin, artifactHash: build.artifactHash, expected: build.html.size, inspected: rows.length, complete: rows.length === build.html.size, blockedRequests: blocked, merchantNavigations: 0, writes: 0, failures, rows }, null, 2));
  console.log(JSON.stringify({ inspected: rows.length, failures: failures.length, output }));
  if (failures.length) process.exitCode = 1;
}
void main().catch(() => { console.error("Read-only rendered crawl failed"); process.exitCode = 1; });
