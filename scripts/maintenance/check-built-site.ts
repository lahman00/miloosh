import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import nextConfig from "../../next.config";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { isComparisonDiscoverySuppressed } from "@/data/seo/gsc-sitemap-comparison-cohort";
import { getSoftware } from "@/data/software";
import { getSoftwareIndexingQualityReasons } from "@/lib/indexing-quality";
import { runAllChecks, type CheckResult, type SiteModel } from "@/lib/site-audit/checks";
import { parsePageFacts, type PageFacts } from "@/lib/site-audit/page-facts";

/**
 * `npm run check:built-site` — audits the HTML that `next build` prerendered.
 *
 * Read-only: it reads `.next/server/app`, `public/`, `app/` and the repository's own indexing policy, and writes
 * nothing unless `--json <file>` is given. It never requests a URL. Run it after `npm run build`; it exits 1 when
 * any check fails. See lib/site-audit/checks.ts for the rules.
 */

const SITE_URL = "https://miloosh.com";

const USAGE = `Usage: npm run check:built-site -- [--dir <.next/server/app>] [--json <file>] [--list <check-id>]

  --dir <dir>       Prerendered app folder (default .next/server/app).
  --json <file>     Also write every result, with all offending items, to this file.
  --list <check-id> Print every offending item of one check (for example no-orphan-pages).
`;

function walkHtml(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".html")) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  visit(root);
  return out.sort();
}

const routeOf = (relative: string): string => {
  const route = `/${relative.slice(0, -".html".length)}`;
  return route === "/index" ? "/" : route;
};

/** Static (bracket-free) page routes of the App Router, including pages that are rendered on demand rather than prerendered. */
function staticAppRoutes(appDir: string): Set<string> {
  const routes = new Set<string>();
  const visit = (dir: string, segments: string[]) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith("[")) continue;
        visit(path.join(dir, entry.name), /^\(.*\)$/.test(entry.name) ? segments : [...segments, entry.name]);
      } else if (entry.name === "page.tsx") {
        routes.add(`/${segments.join("/")}`.replace(/\/$/, "") || "/");
      }
    }
  };
  visit(appDir, []);
  return routes;
}

function publicFiles(publicDir: string): Set<string> {
  const files = new Set<string>();
  const visit = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(path.join(dir, entry.name), `${prefix}/${entry.name}`);
      else files.add(`${prefix}/${entry.name}`);
    }
  };
  if (fs.existsSync(publicDir)) visit(publicDir, "");
  return files;
}

const CONVENTION_ROUTE = /^\/(_next\/|api\/|feed\.xml$|robots\.txt$|sitemap\.xml$|manifest\.webmanifest$|icon$|apple-icon$)|\/(opengraph-image|twitter-image)$/;

export async function buildModel(appBuildDir: string, root = process.cwd()): Promise<SiteModel> {
  const pages = new Map<string, PageFacts>();
  for (const relative of walkHtml(appBuildDir)) {
    if (relative.startsWith("_")) continue;
    const route = routeOf(relative);
    pages.set(route, parsePageFacts(route, fs.readFileSync(path.join(appBuildDir, relative), "utf8")));
  }

  const sitemapXml = fs.readFileSync(path.join(appBuildDir, "sitemap.xml.body"), "utf8");
  const sitemapPaths = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!.replace(SITE_URL, "") || "/"));

  const redirects = new Map<string, string>();
  for (const redirect of (await nextConfig.redirects?.()) ?? []) redirects.set(redirect.source, redirect.destination);

  const appRoutes = staticAppRoutes(path.join(root, "app"));
  const files = publicFiles(path.join(root, "public"));
  const comparisons = new Map(PUBLISHED_COMPARISONS.map(([a, b]) => [getComparisonSlug(a, b), [a, b] as const]));

  return {
    siteUrl: SITE_URL,
    pages,
    sitemapPaths,
    redirects,
    isStaticRoute: (route) => appRoutes.has(route),
    isPublicAsset: (route) => files.has(route) || CONVENTION_ROUTE.test(route),
    explainExclusion(route) {
      const softwareMatch = /^\/software\/([a-z0-9-]+)$/.exec(route);
      if (softwareMatch) {
        const software = getSoftware(softwareMatch[1]!);
        const reasons = software ? getSoftwareIndexingQualityReasons(software) : [];
        return reasons.length > 0 ? `quality gate: ${reasons.join(", ")}` : null;
      }
      const comparisonMatch = /^\/compare\/([a-z0-9-]+)$/.exec(route);
      if (comparisonMatch) {
        const pair = comparisons.get(comparisonMatch[1]!);
        if (!pair) return null;
        if (isComparisonDiscoverySuppressed(comparisonMatch[1]!)) return "discovery suppression cohort";
        const [a, b] = [getSoftware(pair[0]), getSoftware(pair[1])];
        const reasons = [...(a ? getSoftwareIndexingQualityReasons(a) : []), ...(b ? getSoftwareIndexingQualityReasons(b) : [])];
        return reasons.length > 0 ? `quality gate: ${[...new Set(reasons)].join(", ")}` : null;
      }
      return null;
    },
  };
}

export function formatResults(results: readonly CheckResult[]): string {
  const lines: string[] = [];
  for (const result of results) {
    const mark = result.status === "PASS" ? "PASS" : result.status === "FAIL" ? "FAIL" : "INFO";
    lines.push(`${mark}  ${result.title} [${result.id}] — ${result.detail}`);
    for (const example of result.status === "PASS" ? [] : result.examples) lines.push(`        ${example}`);
    if (result.status !== "PASS" && result.count > result.examples.length) lines.push(`        … and ${result.count - result.examples.length} more (use --list ${result.id})`);
  }
  const failed = results.filter((result) => result.status === "FAIL").length;
  lines.push("", failed === 0 ? `All ${results.length} checks passed or reported.` : `${failed} of ${results.length} checks failed.`);
  return `${lines.join("\n")}\n`;
}

export async function main(argv: string[]): Promise<number> {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      console.error(`Unexpected argument: ${arg}\n${USAGE}`);
      return 2;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(arg.slice(2), next);
      i += 1;
    } else flags.set(arg.slice(2), true);
  }
  if (flags.has("help")) {
    console.log(USAGE);
    return 0;
  }
  for (const key of flags.keys()) {
    if (!["dir", "json", "list", "help"].includes(key)) {
      console.error(`Unknown option --${key}\n${USAGE}`);
      return 2;
    }
  }
  const dir = path.resolve(typeof flags.get("dir") === "string" ? (flags.get("dir") as string) : ".next/server/app");
  if (!fs.existsSync(path.join(dir, "sitemap.xml.body"))) {
    console.error(`${dir} is not a prerendered Next.js app folder (no sitemap.xml.body). Run npm run build first.`);
    return 2;
  }

  const results = runAllChecks(await buildModel(dir));
  const list = flags.get("list");
  if (typeof list === "string") {
    const found = results.find((result) => result.id === list);
    if (!found) {
      console.error(`No check named ${list}. Checks: ${results.map((result) => result.id).join(", ")}`);
      return 2;
    }
    process.stdout.write(`${found.items.join("\n")}\n`);
    return found.status === "FAIL" ? 1 : 0;
  }
  process.stdout.write(formatResults(results));
  const json = flags.get("json");
  if (typeof json === "string") fs.writeFileSync(path.resolve(json), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  return results.some((result) => result.status === "FAIL") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
