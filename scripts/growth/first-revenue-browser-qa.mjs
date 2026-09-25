/** Local-only native pointer QA. Analytics is captured, never persisted;
 * external navigation is prevented without suppressing React click handlers.
 * Usage: node scripts/growth/first-revenue-browser-qa.mjs http://localhost:3217 /absolute/private/receipt-directory
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const origin = new URL(process.argv[2] || "http://localhost:3217");
assert(["localhost", "127.0.0.1"].includes(origin.hostname), "QA only runs against a local server");
const output = path.resolve(process.argv[3] || "/tmp/miloosh-first-revenue-qa");
const session = `buyer-funnel-${process.pid}`;
mkdirSync(output, { recursive: true });
function browser(...args) {
  const result = JSON.parse(execFileSync("agent-browser", ["--session", session, ...args, "--json"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));
  assert(result.success, result.error || args.join(" "));
  return result.data;
}
const evaluate = (code) => browser("eval", code).result;
const rows = [];
try {
  browser("open", "about:blank");
  for (const endpoint of ["analytics/event", "outbound-click", "recommendation-click"]) {
    browser("network", "route", `**/api/${endpoint}`, "--body", '{"recorded":false,"qa":"capture-only"}');
  }
  for (const [width, height] of [[1440, 1000], [390, 844], [320, 740]]) {
    browser("set", "viewport", String(width), String(height));
    for (const slug of ["airtable", "todoist", "close", "setmore", "elevenlabs"]) {
      browser("open", `${origin.origin}/software/${slug}?qa=1&qaRun=buyer-delta`);
      browser("wait", "--fn", "Object.keys(document.querySelector('#buying-decision a[rel~=sponsored]')).some(k=>k.startsWith('__reactProps'))");
      // Deterministic pointer targeting: do not race the site's smooth scroll
      // while the CLI scrolls an offscreen control into view.
      evaluate("document.documentElement.style.scrollBehavior = 'auto'");
      browser("snapshot", "-i");
      const before = evaluate(`(() => {
        const sticky = document.querySelector('div.fixed.inset-x-0.bottom-0 a[rel~=sponsored]');
        const rect = sticky.getBoundingClientRect();
        return { title: document.title, h1: document.querySelector('h1').textContent,
          canonical: document.querySelector('link[rel=canonical]').href,
          robots: document.querySelector('meta[name=robots]')?.content || null,
          panelCount: document.querySelectorAll('#buying-decision').length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          stickyVisible: rect.top >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth,
          href: sticky.href, rel: sticky.rel,
          comparisonLinks: [...document.querySelectorAll('#buyer-alternatives a[href^="/compare/"]')].map(a=>a.getAttribute('href')),
          pricing: document.querySelector('#buyer-price-check').innerText,
          overlay: !!document.querySelector('[data-nextjs-dialog]') };
      })()`);
      assert.equal(before.panelCount, 1);
      assert.equal(before.overflow, false, `${slug}/${width}: horizontal overflow`);
      assert.equal(before.stickyVisible, true, `${slug}/${width}: CTA outside viewport`);
      assert.equal(before.canonical, `https://miloosh.com/software/${slug}`);
      assert(!before.robots?.includes("noindex"));
      assert.equal(before.overlay, false);
      assert(before.rel.includes("sponsored"));
      assert(before.comparisonLinks.length > 0);
      browser("screenshot", path.join(output, `${slug}-${width}-top.png`));

      // Capture exactly what the real client handler emits; do not call its
      // functions ourselves and do not let QA leave this localhost origin.
      evaluate(`(() => {
        window.__buyerQa = [];
        window.__buyerNativeClicks = [];
        const remember = (url, body) => {
          const save = text => { try { window.__buyerQa.push({url, body: JSON.parse(text)}); } catch {} };
          if (body instanceof Blob) void body.text().then(save); else save(body);
        };
        navigator.sendBeacon = (url, body) => { remember(url, body); return true; };
        const original = window.fetch;
        window.fetch = (url, options) => {
          if (String(url).startsWith('/api/')) {
            remember(url, options?.body);
            return Promise.resolve(new Response('{"recorded":false,"qa":"capture-only"}', {status:202}));
          }
          return original(url, options);
        };
        document.addEventListener('click', e => {
          const a=e.target.closest('a');
          if (a && new URL(a.href).origin !== location.origin) {
            e.preventDefault(); window.__buyerNativeClicks.push({trusted:e.isTrusted,href:a.href});
          }
        }, true);
      })()`);
      const placements = [
        ['div.fixed.inset-x-0.bottom-0 a[rel~=sponsored]', 'money-page-sticky-cta'],
        ['#buying-decision a[rel~=sponsored]', 'money-page-decision-card'],
        ...(slug === "todoist" ? [
          ['a[aria-label="Todoist Pricing"]', 'vendor-link-pricing'],
          ['a[aria-label="Todoist Free trial"]', 'vendor-link-free-trial'],
        ] : []),
      ];
      for (const [selector, location] of placements) {
        evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
        browser("snapshot", "-i");
        browser("click", selector);
        browser("wait", "--fn", `window.__buyerQa.some(e=>e.url==='/api/outbound-click' && e.body.ctaLocation===${JSON.stringify(location)}) && window.__buyerQa.some(e=>e.body.type==='cta_click' && e.body.ctaLocation===${JSON.stringify(location)})`);
      }
      const events = evaluate("window.__buyerQa");
      const nativeClicks = evaluate("window.__buyerNativeClicks");
      writeFileSync(path.join(output, "latest-click-capture.json"), JSON.stringify({ slug, width, events, nativeClicks }, null, 2));
      assert.equal(nativeClicks.length, placements.length);
      assert(nativeClicks.every((e) => e.trusted));
      for (const [, location] of placements) {
        const out = events.filter((e) => e.url === "/api/outbound-click" && e.body.ctaLocation === location);
        const clicks = events.filter((e) => e.body.type === "cta_click" && e.body.ctaLocation === location);
        assert.equal(out.length, 1); assert.equal(clicks.length, 1);
        assert.equal(out[0].body.slug, slug);
        assert.equal(out[0].body.sourcePage, `/software/${slug}`);
        assert.equal(out[0].body.isTest, true);
        assert.equal(out[0].body.sessionId, clicks[0].body.sessionId);
        assert.equal(out[0].body.visitorId, clicks[0].body.visitorId);
      }
      evaluate(`document.querySelector('#buying-decision a[href="#buyer-alternatives"]').scrollIntoView({block:'center',behavior:'instant'})`);
      browser("click", '#buying-decision a[href="#buyer-alternatives"]');
      browser("wait", "--fn", "location.hash === '#buyer-alternatives' && document.querySelector('#buyer-alternatives').getBoundingClientRect().top >= 60 && document.querySelector('#buyer-alternatives').getBoundingClientRect().top < 120");
      browser("screenshot", path.join(output, `${slug}-${width}-alternatives.png`));
      const errors = browser("errors").errors;
      assert.deepEqual(errors, []);
      rows.push({ slug, width, ...before, nativeClicks, events, errors, smoothScrollDisabledForPointerQa: true, affiliateNavigations: 0, analyticsWrites: 0 });
      console.log(`${slug}/${width}: native clicks, identity, QA marker, layout PASS`);
    }
  }
  writeFileSync(path.join(output, "browser-qa.json"), JSON.stringify({ capturedAt: new Date().toISOString(), origin: origin.origin, rows }, null, 2));
} catch (error) {
  writeFileSync(path.join(output, "browser-failure.json"), JSON.stringify({ message: error.message, events: evaluate("window.__buyerQa"), clicks: evaluate("window.__buyerNativeClicks") }, null, 2));
  throw error;
} finally {
  browser("close");
}
