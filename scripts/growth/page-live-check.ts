import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { failedLiveExtras, liveExtrasOf, partnerNameIndex, type LiveExtras } from "@/lib/growth-agents/live-check";
import { LiveCheckError, observeLivePage, type FetchLike } from "@/lib/growth-agents/live-check-source";
import { loadPartnerFacts } from "@/lib/growth-agents/partners";
import { canonicalPageUrl } from "@/lib/growth-agents/urls";

/**
 * `npm run growth:page-check -- --urls <url,url,...> [--urls-file <file>] [--out <file>] [--now <ISO>]`
 *
 * Reads Miloosh's own public pages with plain GET requests and reports, for each: status, canonical, robots
 * directives and the sponsored calls to action it renders. The output is the `--extras-file` input of
 * `growth:director`. Only miloosh.com is requested; links found in the HTML are parsed, never visited, and no
 * affiliate URL is requested or recorded. Without --out the result is printed and nothing is written.
 */

const MAX_URLS = 25;

const USAGE = `Usage: npm run growth:page-check -- --urls <url,url,...> [options]

  --urls <list>       Comma-separated Miloosh page URLs (at most ${MAX_URLS}).
  --urls-file <file>  A text file with one URL per line.
  --out <file>        Write the JSON here. Without it the JSON is only printed.
  --now <ISO>         Timestamp recorded as the reading time (default: now).
  --delay-ms <n>      Pause between requests (default 1000).
  --help
`;

export type PageCheckOptions = { urls: string[]; out: string | null; now: Date; delayMs: number };

export function parseArgs(argv: string[], repoRoot: string, readText: (file: string) => string = (file) => fs.readFileSync(file, "utf8")): PageCheckOptions | { help: true } {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(arg.slice(2), next);
      i += 1;
    } else flags.set(arg.slice(2), true);
  }
  if (flags.has("help")) return { help: true };
  for (const key of flags.keys()) if (!["urls", "urls-file", "out", "now", "delay-ms"].includes(key)) throw new Error(`Unknown option --${key}\n${USAGE}`);
  const value = (name: string): string | null => {
    const v = flags.get(name);
    return typeof v === "string" ? v : null;
  };
  const fromList = value("urls") ? value("urls")!.split(",").map((u) => u.trim()).filter(Boolean) : [];
  const fromFile = value("urls-file") ? readText(path.resolve(repoRoot, value("urls-file")!)).split("\n").map((u) => u.trim()).filter((u) => u && !u.startsWith("#")) : [];
  const urls = [...new Set([...fromList, ...fromFile])];
  if (urls.length === 0) throw new Error(`No URL given.\n${USAGE}`);
  if (urls.length > MAX_URLS) throw new Error(`At most ${MAX_URLS} URLs per run (got ${urls.length}).`);
  for (const url of urls) if (!canonicalPageUrl(url)) throw new Error(`Only miloosh.com page URLs are checked: ${url}`);
  const now = value("now") ? new Date(value("now")!) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("--now must be an ISO timestamp");
  const delayMs = value("delay-ms") ? Number(value("delay-ms")) : 1000;
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("--delay-ms must be a non-negative number");
  return { urls, out: value("out") ? path.resolve(repoRoot, value("out")!) : null, now, delayMs };
}

export type PageCheckDeps = {
  fetchImpl: FetchLike;
  partners: () => Array<{ slug: string; name: string }>;
  writeText: (file: string, content: string) => void;
  sleep: (ms: number) => Promise<void>;
  log: (line: string) => void;
};

export async function runPageCheck(options: PageCheckOptions, deps: PageCheckDeps): Promise<{ exitCode: number; extras: LiveExtras[]; json: string }> {
  const names = partnerNameIndex(deps.partners());
  const extras: LiveExtras[] = [];
  let failures = 0;
  for (const [index, url] of options.urls.entries()) {
    if (index > 0 && options.delayMs > 0) await deps.sleep(options.delayMs);
    try {
      const observation = await observeLivePage(url, deps.fetchImpl);
      extras.push(liveExtrasOf(observation, names, options.now.toISOString()));
    } catch (error) {
      failures += 1;
      extras.push(failedLiveExtras(url, error instanceof LiveCheckError ? error.message : `unexpected error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  const json = `${JSON.stringify(extras, null, 2)}\n`;
  if (options.out) {
    deps.writeText(options.out, json);
    deps.log(`written: ${options.out}`);
  }
  return { exitCode: failures > 0 ? 1 : 0, extras, json };
}

export async function main(argv: string[], repoRoot = process.cwd(), deps?: PageCheckDeps): Promise<number> {
  let options: ReturnType<typeof parseArgs>;
  try {
    options = parseArgs(argv, repoRoot);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  if ("help" in options) {
    console.log(USAGE);
    return 0;
  }
  const realDeps: PageCheckDeps = deps ?? {
    fetchImpl: (url, init) => fetch(url, init) as unknown as ReturnType<FetchLike>,
    partners: () => loadPartnerFacts().map((p) => ({ slug: p.slug, name: p.name })),
    writeText: (file, content) => fs.writeFileSync(file, content, "utf8"),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.error(line),
  };
  const result = await runPageCheck(options, realDeps);
  if (!options.out) process.stdout.write(result.json);
  return result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
