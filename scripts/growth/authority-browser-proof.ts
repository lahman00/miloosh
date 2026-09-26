import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { RESEARCH_PATHS } from "@/lib/analytics/research";

/** Real built application in an isolated browser; API calls mocked, all external
 * traffic blocked. Synthetic proof only, never added to production metrics. */
export async function authorityBrowserProof(origin: string, output: string) {
  assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
  const browser = await chromium.launch({ executablePath: process.env.MILOOSH_QA_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const evidence = [];
  try {
    for (const width of [1440, 390, 320]) {
     for (const research of RESEARCH_PATHS.filter(p => p !== "/research")) {
      const events: Record<string, unknown>[] = [], handoffs: Record<string, unknown>[] = [];
      const context = await browser.newContext({ viewport: { width, height: 950 }, serviceWorkers: "block" });
      let externalBlocked = 0;
      await context.route("**/*", async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== origin) { externalBlocked++; return route.abort(); }
        if (url.pathname.startsWith("/api/")) {
          if (req.method() === "POST") {
            const body = req.postDataJSON();
            if (url.pathname === "/api/analytics/event") events.push(body);
            if (url.pathname === "/api/outbound-click") handoffs.push(body);
          }
          return route.fulfill({ status: 200, contentType: "application/json", body: '{"recorded":false,"qa":"intercepted-local-only"}' });
        }
        if (req.method() !== "GET") return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      await page.goto(`${origin}${research}?qa=1&qaRun=authority-browser-proof`, { waitUntil: "networkidle" });
      assert.equal(events.filter(e => e.type === "research_page_view").length, 1);
      const source = page.locator('main a[href^="https://"]').filter({ hasText: /./ }).first();
      const sourceUrl = await source.getAttribute("href");
      assert(sourceUrl && new URL(sourceUrl).hostname !== "miloosh.com");
      await source.click();
      await page.waitForTimeout(100);
      const sourceEvent = events.find(e => e.type === "research_source_click");
      assert(sourceEvent); assert.equal(sourceEvent.sourceHost, new URL(sourceUrl).hostname);
      assert(!("href" in sourceEvent)); assert(!("url" in sourceEvent));
      const decision = page.locator('main a[href^="/software/"]').first();
      const decisionPath = await decision.getAttribute("href"); assert(decisionPath);
      await decision.click();
      await page.waitForURL(`${origin}${decisionPath}*`); await page.waitForLoadState("networkidle");
      for (let i = 0; i < 50 && !events.some(e => e.type === "page_view" && e.path === decisionPath); i++) await page.waitForTimeout(100);
      assert.equal(events.filter(e => e.type === "research_to_decision_click" && e.targetPath === decisionPath).length, 1);
      assert(events.some(e => e.type === "page_view" && e.path === decisionPath), `Expected decision view ${decisionPath}; observed ${JSON.stringify(events.map(e => ({ type: e.type, path: e.path })))}`);
      const cta = page.locator('[data-miloosh-link="commercial"]').first();
      const ctaLocation = await cta.getAttribute("data-cta-location"), slug = await cta.getAttribute("data-software-slug");
      await cta.scrollIntoViewIfNeeded();
      for (let i = 0; i < 50 && !events.some(e => e.type === "cta_impression" && e.ctaLocation === ctaLocation); i++) await page.waitForTimeout(100);
      assert(events.some(e => e.type === "cta_impression" && e.ctaLocation === ctaLocation), "CTA exposure must precede the click");
      await cta.click();
      for (let i = 0; i < 50 && (!handoffs.length || !events.some(e => e.type === "cta_click")); i++) await page.waitForTimeout(100);
      assert.equal(handoffs.length, 1);
      assert.equal(handoffs[0].ctaLocation, ctaLocation); assert.equal(handoffs[0].slug, slug); assert.equal(handoffs[0].sourcePage, decisionPath);
      const click = events.find(e => e.type === "cta_click" && e.ctaLocation === ctaLocation);
      assert(click); assert.equal(click.eventId, handoffs[0].eventId); assert.equal(click.sessionId, handoffs[0].sessionId);
      assert(events.every(e => e.isTest === true));
      evidence.push({ width, research, researchViews: 1, sourceHost: sourceEvent.sourceHost, decisionPath, researchDecisionClicks: 1, softwareSlug: slug, ctaLocation, ctaExposureObserved: true, interceptedHandoffRequests: handoffs.length, externalBlocked, eventTypes: events.map(e => e.type), productionWrites: 0, merchantRequestsSent: 0, note: "Synthetic local browser proof; handoff endpoint is mocked, not a production handoff or merchant arrival" });
      await context.close();
     }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, "authority-events.json"), JSON.stringify({ capturedAt: new Date().toISOString(), evidence }, null, 2));
  console.log("Research → decision → CTA browser proof PASS; mocked handoff, zero production writes");
}
