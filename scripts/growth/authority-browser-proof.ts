import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { RESEARCH_PATHS } from "@/lib/analytics/research";
import { assertQaOrigin, qaRequestAction } from "@/lib/authority/browser-qa-policy";

/** Real built application in an isolated browser; API calls mocked, all external
 * traffic blocked. Synthetic proof only, never added to production metrics. */
export async function authorityBrowserProof(origin: string, output: string, productionReadOnly = false) {
  assertQaOrigin(origin, productionReadOnly);
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.MILOOSH_QA_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const evidence = [];
  try {
    for (const width of [1440, 390, 320]) {
     for (const research of RESEARCH_PATHS.filter(p => p !== "/research")) {
      for (const targetKind of ["software", "compare"] as const) {
      const events: Record<string, unknown>[] = [], handoffs: Record<string, unknown>[] = [];
      const context = await browser.newContext({ viewport: { width, height: 950 }, serviceWorkers: "block" });
      let externalBlocked = 0;
      await context.route("**/*", async route => {
        const req = route.request(), url = new URL(req.url());
        const action = qaRequestAction(origin, req.url(), req.method());
        if (action === "BLOCK") { externalBlocked++; return route.abort(); }
        if (action === "MOCK") {
          if (req.method() === "POST") {
            const body = req.postDataJSON();
            if (url.pathname === "/api/analytics/event") events.push(body);
            if (url.pathname === "/api/outbound-click") handoffs.push(body);
          }
          return route.fulfill({ status: 200, contentType: "application/json", body: '{"recorded":false,"qa":"intercepted-read-only"}' });
        }
        if (req.method() !== "GET") return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const runtimeErrors: string[] = [];
      page.on("pageerror", error => runtimeErrors.push(error.name));
      await page.goto(`${origin}${research}?qa=1&qaRun=authority-browser-proof`, { waitUntil: "networkidle" });
      assert.equal(events.filter(e => e.type === "research_page_view").length, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const decision = page.locator(`main a[href^="/${targetKind}/"]`).first();
      if (await decision.count() === 0) {
        assert(["/research/saas-pricing-pressure-index-2026", "/research/cms-buying-decision-2026"].includes(research), "Unexpected missing decision path");
        // CMS deliberately avoids new links into protected CMS comparisons.
        await context.close(); continue;
      }
      if (targetKind === "software") {
        const table = page.locator("main table").first();
        if (await table.count()) await table.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${research.split('/').at(-1)}-${width}.png`) });
      }
      const source = page.locator('main a[href^="https://"]').filter({ hasText: /./ }).first();
      const sourceUrl = await source.getAttribute("href");
      assert(sourceUrl && new URL(sourceUrl).hostname !== "miloosh.com");
      await source.click();
      await page.waitForTimeout(100);
      const sourceEvent = events.find(e => e.type === "research_source_click");
      assert(sourceEvent); assert.equal(sourceEvent.sourceHost, new URL(sourceUrl).hostname);
      assert(!("href" in sourceEvent)); assert(!("url" in sourceEvent));
      const decisionPath = await decision.getAttribute("href"); assert(decisionPath);
      await decision.click();
      await page.waitForURL(`${origin}${decisionPath}*`); await page.waitForLoadState("networkidle");
      for (let i = 0; i < 50 && !events.some(e => e.type === "page_view" && e.path === decisionPath); i++) await page.waitForTimeout(100);
      const navigationEvent = targetKind === "software" ? "research_to_decision_click" : "research_to_comparison_click";
      assert.equal(events.filter(e => e.type === navigationEvent && e.targetPath === decisionPath).length, 1);
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
      assert.deepEqual(runtimeErrors, []);
      evidence.push({ width, research, targetKind, researchViews: 1, sourceHost: sourceEvent.sourceHost, decisionPath, navigationEvent, researchDecisionClicks: 1, softwareSlug: slug, ctaLocation, ctaExposureObserved: true, interceptedHandoffRequests: handoffs.length, externalBlocked, runtimeErrors, eventTypes: events.map(e => e.type), productionWrites: 0, merchantRequestsSent: 0, note: "Synthetic browser proof; every API call mocked and merchant request blocked, not production persistence or merchant arrival" });
      await context.close();
      }
     }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, "authority-events.json"), JSON.stringify({ capturedAt: new Date().toISOString(), origin, productionReadOnly, evidence }, null, 2));
  console.log("Research → decision → CTA browser proof PASS; mocked handoff, zero production writes");
}
