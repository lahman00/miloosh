import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { readBuild } from "@/lib/google-war/graph";
import { renderedHtml } from "@/lib/seo/rendered-html";
import { auditRenderedCtas } from "@/lib/google-war/cta-audit";
import { getAllSoftware } from "@/data/software";
import { getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { WIX_FUNNELS } from "@/lib/wix-funnels";

/** Entire emitted public surface, four bounded local workers (one in production). Never discovers
 * actions through links or follows merchants. Production requires an explicit
 * post-integration flag; default is localhost. No clicks or form submissions. */
async function main() {
  const origin = new URL(process.argv[2] ?? "http://localhost:3246");
  if (!["localhost", "127.0.0.1"].includes(origin.hostname) && !(origin.origin === "https://miloosh.com" && process.argv.includes("--production-read-only"))) throw new Error("Unsupported crawl origin");
  const build = readBuild(".next-miloosh-qa");
  const output = "var/growth/google-command/crawl";
  fs.mkdirSync(output, { recursive: true });
  const recheck = process.argv.includes("--recheck-failures");
  const prior = recheck ? JSON.parse(fs.readFileSync(path.join(output, "latest.json"), "utf8")) as { origin: string; artifactHash: string; failures: Array<{ route: string }> } : null;
  if (prior && (prior.origin !== origin.origin || prior.artifactHash !== build.artifactHash || prior.failures.some(r => !build.html.has(r.route)))) throw new Error("Recheck requires the same artifact/origin and known emitted routes");
  const targets = prior ? [...new Set(prior.failures.map(r => r.route))].sort() : [...build.html.keys()].sort();
  const browser = await chromium.launch({ executablePath: process.env.MILOOSH_QA_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const rows: Array<{ route: string; error?: string; status?: number | null; finalPath?: string; canonical?: string[]; h1Count?: number; noindex?: boolean; metadataMatches?: boolean; commercialLinksChecked?: number; ctaBlocks?: ReturnType<typeof auditRenderedCtas>["findings"]; overflow?: boolean }> = []; let blocked = 0;
  const merchants = getAllSoftware().map(s => ({ slug: s.slug, active: shouldShowAffiliateDisclosure(s), homepage: s.website,
    ctaUrls: [...new Set([getSoftwareCtaUrl(s), getSoftwareCtaUrl(s, "pricing"), ...(s.slug === "wix" && shouldShowAffiliateDisclosure(s) ? Object.values(WIX_FUNNELS).map(f => f.url) : [])])] }));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await context.route("**/*", route => {
    const req = route.request(), u = new URL(req.url());
    if (req.method() !== "GET" || u.origin !== origin.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/internal/")) { blocked++; return route.abort(); }
    return route.continue();
  });
  try {
    const pending = [...targets];
    await Promise.all(Array.from({ length: recheck || origin.hostname === "miloosh.com" ? 1 : 4 }, async () => {
      const page = await context.newPage();
      let route: string | undefined;
      while ((route = pending.shift()) !== undefined) {
      const url = new URL(route, origin); url.searchParams.set("qa", "1"); url.searchParams.set("qaRun", "google-command-crawl");
      try {
        const response = await page.goto(url.href, { waitUntil: "load", timeout: 20_000 });
        const content = await page.content(), html = renderedHtml(content), expected = renderedHtml(build.html.get(route)!);
        const cta = auditRenderedCtas(content, merchants);
        const metadataMatches = html.title === expected.title && html.description === expected.description && JSON.stringify(html.canonicals) === JSON.stringify(expected.canonicals) && html.robots === expected.robots;
        rows.push({ route, status: response?.status() ?? null, finalPath: new URL(page.url()).pathname,
          canonical: html.canonicals, h1Count: html.h1s.length, noindex: Boolean(html.robots?.includes("noindex")),
          metadataMatches, commercialLinksChecked: cta.checked, ctaBlocks: cta.findings.filter(f => f.severity === "BLOCK"),
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      } catch (error) { rows.push({ route, error: `Navigation/inspection did not complete (${error instanceof Error ? error.name : "UnknownError"}); no automatic retry or zero-imputation` }); }
      }
      await page.close();
    }));
  } finally { await browser.close(); }
  rows.sort((a,b) => a.route.localeCompare(b.route));
  const failures = rows.filter(r => "error" in r || r.status !== 200 || r.finalPath !== r.route || r.overflow || !r.metadataMatches || r.ctaBlocks?.length);
  fs.writeFileSync(path.join(output, recheck ? "recheck.json" : "latest.json"), JSON.stringify({ capturedAt: new Date().toISOString(), scope: recheck ? "EXPLICIT_FAILED_ROUTE_RECHECK" : "ALL_EMITTED_ROUTES", origin: origin.origin, artifactHash: build.artifactHash, expected: targets.length, inspected: rows.length, complete: rows.length === targets.length, blockedRequests: blocked, merchantNavigations: 0, writes: 0, failures, rows }, null, 2));
  console.log(JSON.stringify({ inspected: rows.length, failures: failures.length, output }));
  if (failures.length) process.exitCode = 1;
}
void main().catch(() => { console.error("Read-only rendered crawl failed"); process.exitCode = 1; });
