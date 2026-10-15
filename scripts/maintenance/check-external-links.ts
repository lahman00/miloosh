import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkUrl, type LinkCheckResult } from "@/lib/maintenance/http";
import { collectExternalTargets, interleaveByHost, runPaced, type ExternalTarget } from "@/lib/site-audit/external-links";
import { buildModel } from "./check-built-site";

/**
 * `npm run check:external-links` - requests the external, non-partner URLs that the built site links to and
 * reports the ones that no longer work. It reads `.next/server/app`; run `npm run build` first.
 *
 * It never requests a sponsored link or a URL with a referral code in its query string (see
 * lib/site-audit/external-links.ts), spreads requests over hosts, and keeps a minimum gap between two requests to
 * one host. `--dry-run` lists what would be requested without sending anything.
 */

const SITE_URL = "https://miloosh.com";

const USAGE = `Usage: npm run check:external-links -- [--dir <.next/server/app>] [--concurrency <n>] [--gap-ms <n>] [--limit <n>] [--json <file>] [--recheck <report.json>] [--dry-run]

  --concurrency <n>  Requests in flight at once (default 4).
  --gap-ms <n>       Minimum gap between two requests to the same host (default 1500).
  --limit <n>        Check only the first n URLs after interleaving (for a trial run).
  --json <file>      Write the full report, with every URL and the pages that link to it.
  --recheck <file>   Check again only the URLs that a previous --json report did not find ok or bot-blocked (use a slower pace).
  --dry-run          Print what would be requested and what is left alone; send nothing.
`;

type Row = { target: ExternalTarget; result: LinkCheckResult };

const INFO_OUTCOMES = new Set(["ok", "bot_blocked"]);

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
  for (const key of flags.keys()) {
    if (!["dir", "concurrency", "gap-ms", "limit", "json", "recheck", "dry-run", "help"].includes(key)) {
      console.error(`Unknown option --${key}\n${USAGE}`);
      return 2;
    }
  }
  if (flags.has("help")) {
    console.log(USAGE);
    return 0;
  }
  const number = (name: string, fallback: number): number => {
    const value = flags.get(name);
    const parsed = typeof value === "string" ? Number(value) : fallback;
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  const dir = path.resolve(typeof flags.get("dir") === "string" ? (flags.get("dir") as string) : ".next/server/app");
  if (!fs.existsSync(path.join(dir, "sitemap.xml.body"))) {
    console.error(`${dir} is not a prerendered Next.js app folder. Run npm run build first.`);
    return 2;
  }

  const model = await buildModel(dir);
  const { checkable, excluded } = collectExternalTargets(model.pages.values(), SITE_URL);
  let ordered = interleaveByHost(checkable);
  const recheck = flags.get("recheck");
  if (typeof recheck === "string") {
    const previous = JSON.parse(fs.readFileSync(path.resolve(recheck), "utf8")) as { results: Row[] };
    const again = new Set(previous.results.filter(({ result }) => !INFO_OUTCOMES.has(result.outcome)).map(({ target }) => target.url));
    ordered = ordered.filter((target) => again.has(target.url));
  }
  const limit = flags.get("limit");
  if (typeof limit === "string") ordered = ordered.slice(0, number("limit", ordered.length));
  const hosts = new Set(ordered.map((target) => new URL(target.url).hostname)).size;

  console.log(`${ordered.length} URL(s) on ${hosts} host(s) to check; ${excluded.length} left alone (${[...new Set(excluded.map((e) => e.reason))].join("; ")}).`);
  if (flags.has("dry-run")) {
    for (const item of excluded) console.log(`  left alone: ${new URL(item.url).hostname} (${item.reason})`);
    return 0;
  }

  const concurrency = number("concurrency", 4);
  const minGapPerHostMs = number("gap-ms", 1500);
  const started = Date.now();
  let done = 0;
  const results = await runPaced(
    ordered,
    async (target): Promise<Row> => {
      const result = await checkUrl(target.url);
      done += 1;
      if (done % 100 === 0) console.log(`  ${done}/${ordered.length} checked (${Math.round((Date.now() - started) / 1000)}s)`);
      return { target, result };
    },
    { concurrency, minGapPerHostMs },
  );

  const tally = new Map<string, number>();
  for (const { result } of results) tally.set(result.outcome, (tally.get(result.outcome) ?? 0) + 1);
  console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)}s: ${[...tally].sort().map(([outcome, count]) => `${outcome} ${count}`).join(", ")}`);

  const problems = results.filter(({ result }) => !INFO_OUTCOMES.has(result.outcome));
  for (const { target, result } of problems) {
    const where = target.pages.length > 3 ? `${target.pages.slice(0, 3).join(", ")} and ${target.pages.length - 3} more` : target.pages.join(", ");
    console.log(`${result.outcome.toUpperCase()}  ${target.url}${result.httpStatus ? ` (HTTP ${result.httpStatus})` : ""}${result.finalUrl && result.finalUrl !== target.url ? ` -> ${result.finalUrl}` : ""}\n        linked from: ${where}${result.details ? `\n        ${result.details}` : ""}`);
  }
  if (problems.length === 0) console.log("No broken, moved or unreachable URL was found.");

  const json = flags.get("json");
  if (typeof json === "string") {
    fs.writeFileSync(path.resolve(json), `${JSON.stringify({ checkedAt: new Date().toISOString(), concurrency, minGapPerHostMs, tally: Object.fromEntries(tally), leftAlone: excluded.map((item) => ({ host: new URL(item.url).hostname, reason: item.reason })), results }, null, 2)}\n`, "utf8");
  }
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
