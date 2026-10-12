import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildModel, formatResults, main } from "@/scripts/maintenance/check-built-site";
import type { CheckResult } from "@/lib/site-audit/checks";

const FOOTER = "<footer><p>v<!-- -->0.12.0<!-- --> · <!-- -->354<!-- --> tools across <!-- -->27<!-- --> categories · sources last verified <!-- -->October 8, 2026</p></footer>";

function html(path: string, extra = ""): string {
  const url = `https://miloosh.com${path === "/" ? "" : path}`;
  return `<html><head><title>Page ${path}</title><meta name="description" content="About ${path}"/><link rel="canonical" href="${url}"/><meta property="og:title" content="Page ${path}"/><meta property="og:description" content="About ${path}"/><meta property="og:url" content="${url}"/><meta name="twitter:title" content="Page ${path}"/><meta name="twitter:description" content="About ${path}"/></head><body><h1>Page</h1>${extra}${FOOTER}</body></html>`;
}

let dir: string;
let output: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "built-site-"));
  output = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    output += String(chunk);
    return true;
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeSite(pages: Record<string, string>, sitemapPaths: string[]): void {
  for (const [route, content] of Object.entries(pages)) {
    const file = path.join(dir, route === "/" ? "index.html" : `${route.slice(1)}.html`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  fs.writeFileSync(path.join(dir, "sitemap.xml.body"), `<urlset>${sitemapPaths.map((p) => `<url><loc>https://miloosh.com${p === "/" ? "" : p}</loc></url>`).join("")}</urlset>`);
}

describe("formatResults", () => {
  const base: CheckResult = { id: "x", title: "Rule", status: "PASS", detail: "fine", count: 0, examples: [], items: [] };

  it("summarises a clean run", () => {
    expect(formatResults([base])).toContain("All 1 checks passed or reported.");
  });

  it("prints examples and how many more there are for a failure", () => {
    const text = formatResults([{ ...base, status: "FAIL", detail: "9 bad", count: 9, examples: ["/a", "/b"], items: [] }]);
    expect(text).toContain("FAIL  Rule [x] — 9 bad");
    expect(text).toContain("        /a");
    expect(text).toContain("… and 7 more (use --list x)");
    expect(text).toContain("1 of 1 checks failed.");
  });

  it("does not turn an INFO line into a failure", () => {
    expect(formatResults([{ ...base, status: "INFO", count: 3, examples: ["/a"] }])).toContain("All 1 checks passed or reported.");
  });
});

describe("main", () => {
  it("exits 0 and prints every check for a consistent site, and writes the JSON file on request", async () => {
    writeSite({ "/": html("/", '<a href="/about">About</a>'), "/about": html("/about", '<a href="/">Home</a>') }, ["/", "/about"]);
    const json = path.join(dir, "result.json");
    expect(await main(["--dir", dir, "--json", json])).toBe(0);
    expect(output).toContain("PASS  All pages report the same tool count");
    expect(JSON.parse(fs.readFileSync(json, "utf8")).map((r: CheckResult) => r.id)).toContain("no-orphan-pages");
  });

  it("exits 1 when a check fails, here a link to a page that does not exist", async () => {
    writeSite({ "/": html("/", '<a href="/missing-page">Gone</a>') }, ["/"]);
    expect(await main(["--dir", dir])).toBe(1);
    expect(output).toContain("FAIL  Every internal link resolves");
    expect(output).toContain("/missing-page (linked from 1 page(s), for example /)");
  });

  it("--list prints the offending items alone, one per line", async () => {
    writeSite({ "/": html("/", '<a href="/missing-page">Gone</a>') }, ["/"]);
    expect(await main(["--dir", dir, "--list", "internal-links"])).toBe(1);
    expect(output).toBe("/missing-page (linked from 1 page(s), for example /)\n");
  });

  it("rejects an unknown check, an unknown option, a stray argument and a folder that is not a build", async () => {
    writeSite({ "/": html("/") }, ["/"]);
    expect(await main(["--dir", dir, "--list", "no-such-check"])).toBe(2);
    expect(await main(["--dir", dir, "--nope"])).toBe(2);
    expect(await main([dir])).toBe(2);
    expect(await main(["--dir", path.join(dir, "empty")])).toBe(2);
  });
});

describe("buildModel", () => {
  it("reads the sitemap, treats app routes and public files as resolvable, and knows the /research redirect", async () => {
    writeSite({ "/": html("/") }, ["/", "/about"]);
    const model = await buildModel(dir);
    expect([...model.sitemapPaths]).toEqual(["/", "/about"]);
    expect([...model.pages.keys()]).toEqual(["/"]);
    expect(model.isStaticRoute("/recommend")).toBe(true);
    expect(model.isStaticRoute("/software/pipedrive")).toBe(false);
    expect(model.isPublicAsset("/robots.txt")).toBe(true);
    expect(model.isPublicAsset("/software/pipedrive/opengraph-image")).toBe(true);
    expect(model.redirects.get("/research")).toBe("/research/saas-pricing-pressure-index-2026");
  });

  it("explains a quality-gate exclusion for a thin profile and none for an unknown path", async () => {
    writeSite({ "/": html("/") }, ["/"]);
    const model = await buildModel(dir);
    expect(model.explainExclusion("/definitely-not-a-route")).toBeNull();
    expect(model.explainExclusion("/software/no-such-product")).toBeNull();
  });
});
