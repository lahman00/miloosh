import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";

const output = "var/growth/google-command/browser";
const session = `miloosh-control-${process.pid}`;
async function browser(...args: string[]) {
  const { stdout } = await promisify(execFile)("agent-browser", ["--session", session, ...args, "--json"], { encoding: "utf8", maxBuffer: 5_000_000, timeout: 45_000 });
  const r = JSON.parse(stdout);
  assert(r.success, "Browser command failed"); return r.data;
}
async function listen(server: http.Server) {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert(address && typeof address !== "string"); return address.port;
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const dashboard = http.createServer((req, res) => {
    if (req.method !== "GET" || req.url !== "/") { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(fs.readFileSync("var/growth/google-command/index.html"));
  });
  const reportPort = await listen(dashboard);
  const portProbe = http.createServer(), appPort = await listen(portProbe);
  await new Promise<void>(resolve => portProbe.close(() => resolve()));
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
    env: { ...process.env, MILOOSH_QA_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: "ignore",
  });
  const results = [];
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40 && child.exitCode === null; attempt++) {
      try { ready = (await fetch(`http://127.0.0.1:${appPort}/`, { signal: AbortSignal.timeout(500) })).status === 200; } catch { /* bounded local startup */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert(ready, "Own isolated server did not start");
    await browser("open", "about:blank");
    await browser("network", "route", "**/api/**", "--body", '{"recorded":false,"qa":"read-only-local"}');
    for (const width of [1440, 390, 320]) {
      await browser("set", "viewport", String(width), "1000");
      await browser("open", `http://127.0.0.1:${reportPort}/`);
      await browser("snapshot", "-i", "-s", "main");
      const report = (await browser("eval", "({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelector('h1')?.textContent,unsafe:[...document.links].some(a=>a.origin!==location.origin)})")).result;
      assert.equal(report.overflow, false); assert.equal(report.unsafe, false);
      assert.equal(report.h1, "Google intelligence & revenue");
      await browser("screenshot", path.resolve(output, `command-${width}.png`));
      for (const route of ["/software/jotform", "/software/hubspot", "/compare/pipedrive-vs-close"]) {
        await browser("open", `http://127.0.0.1:${appPort}${route}?qa=1&qaRun=command-center`);
        const result = (await browser("eval", "({overflow:document.documentElement.scrollWidth>innerWidth,canonical:document.querySelector('link[rel=canonical]')?.href,commercial:[...document.querySelectorAll('[data-miloosh-link=\"commercial\"]')].map(a=>({slug:a.dataset.softwareSlug,location:a.dataset.ctaLocation,href:a.href,rel:a.rel})),vendor:document.querySelectorAll('[data-miloosh-link=\"editorial-vendor\"]').length})")).result;
        assert.equal(result.overflow, false); assert.equal(result.canonical, `https://miloosh.com${route}`);
        assert(result.commercial.length > 0); assert(result.commercial.every((a: { slug: string; location: string }) => a.slug && a.location));
        if (route.endsWith("hubspot")) assert(result.commercial.filter((a: { slug: string }) => a.slug === "hubspot").every((a: { rel: string }) => !a.rel.includes("sponsored")));
        results.push({ route, width, ...result });
      }
      console.log(`Control room + 3 merchant surfaces at ${width}px: PASS (no merchant clicks)`);
    }
    fs.writeFileSync(path.join(output, "latest.json"), JSON.stringify({ capturedAt: new Date().toISOString(), merchantNavigations: 0, analyticsWrites: 0, viewports: [1440, 390, 320], results }, null, 2));
  } finally { child.kill("SIGTERM"); await browser("close"); dashboard.closeAllConnections(); await new Promise<void>(resolve => dashboard.close(() => resolve())); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Browser QA failed"); process.exitCode = 1; });
